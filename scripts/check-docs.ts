import * as fs from "fs";
import * as path from "path";
import * as ts from "typescript";

/**
 * Guards the docs that people and agents copy from:
 *   1. every ```ts block in README.md and AGENTS.md must type-check against src/
 *   2. every public method of the client, the stock and index handles, and every function
 *      exported from src/indicators must carry a JSDoc @example
 * A README that does not compile is the reason v2 exists, so CI runs this.
 */

const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "__docs_check__");
const DOCS = ["README.md", "AGENTS.md"];

const MODULES: Record<string, string> = {
  "vnstock-js": "../src",
  "vnstock-js/indicators": "../src/indicators",
  "vnstock-js/proxy": "../src/proxy",
  "vnstock-js/node": "../src/node",
};

interface Block {
  doc: string;
  /** Line in the doc of the first code line. */
  line: number;
  file: string;
  /** True when an import line was added on top, shifting the code down by one. */
  injected: boolean;
}

function extractBlocks(): Block[] {
  const blocks: Block[] = [];
  for (const doc of DOCS) {
    const text = fs.readFileSync(path.join(ROOT, doc), "utf8").replace(/\r\n/g, "\n");
    const re = /^```ts\n([\s\S]*?)^```/gm;
    let m: RegExpExecArray | null;
    let i = 0;
    while ((m = re.exec(text))) {
      const line = text.slice(0, m.index).split("\n").length + 1;
      let code = m[1];
      const hasImport = /^import /m.test(code);
      code = code.replace(/from ['"](vnstock-js(?:\/[a-z]+)?)['"]/g, (all, mod: string) => (MODULES[mod] ? `from "${MODULES[mod]}"` : all));
      if (!hasImport) code = 'import { vn, createClient } from "../src";\n' + code;
      // Mark every block as a module so top-level await and repeated names are fine.
      code += "\nexport {};\n";
      const file = path.join(OUT, doc.replace(/\W/g, "_") + "_" + i++ + ".ts");
      fs.writeFileSync(file, code);
      blocks.push({ doc, line, file, injected: !hasImport });
    }
  }
  return blocks;
}

function checkBlocks(): string[] {
  fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(OUT, { recursive: true });
  const blocks = extractBlocks();
  const program = ts.createProgram(
    blocks.map((b) => b.file),
    {
      noEmit: true,
      strict: true,
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
      lib: ["lib.es2022.d.ts", "lib.dom.d.ts"],
      types: ["node"],
      esModuleInterop: true,
      resolveJsonModule: true,
      skipLibCheck: true,
      noUnusedLocals: false,
    }
  );
  const errors: string[] = [];
  for (const d of ts.getPreEmitDiagnostics(program)) {
    if (!d.file) continue;
    const block = blocks.find((b) => path.resolve(b.file) === path.resolve(d.file!.fileName));
    if (!block) continue;
    const { line } = d.file.getLineAndCharacterOfPosition(d.start || 0);
    errors.push(`${block.doc}:${block.line + line - (block.injected ? 1 : 0)}: ${ts.flattenDiagnosticMessageText(d.messageText, "\n")}`);
  }
  if (errors.length === 0) fs.rmSync(OUT, { recursive: true, force: true });
  return errors;
}

function hasExample(node: ts.Node): boolean {
  return ts.getJSDocTags(node).some((t) => t.tagName.text === "example");
}

function source(file: string): ts.SourceFile {
  return ts.createSourceFile(file, fs.readFileSync(path.join(ROOT, file), "utf8"), ts.ScriptTarget.ES2022, true);
}

function memberName(node: ts.ObjectLiteralElementLike | ts.ClassElement): string {
  return node.name && (ts.isIdentifier(node.name) || ts.isStringLiteral(node.name)) ? node.name.text : "?";
}

/** Public members of the object literal createClient returns, following identifiers to their declarations. */
function checkClient(missing: string[]): void {
  const file = "src/client/index.ts";
  const sf = source(file);
  const fn = sf.statements.find((s): s is ts.FunctionDeclaration => ts.isFunctionDeclaration(s) && s.name?.text === "createClient");
  if (!fn || !fn.body) throw new Error("createClient not found");
  if (!hasExample(fn)) missing.push(`${file}: createClient`);
  const ret = fn.body.statements.find(ts.isReturnStatement);
  if (!ret || !ret.expression || !ts.isObjectLiteralExpression(ret.expression)) throw new Error("createClient must return an object literal");

  const local = (name: string): ts.Node | undefined => {
    for (const s of fn.body!.statements) {
      if (ts.isFunctionDeclaration(s) && s.name?.text === name) return s;
      if (ts.isVariableStatement(s)) for (const d of s.declarationList.declarations) if (ts.isIdentifier(d.name) && d.name.text === name) return d;
    }
    return undefined;
  };

  const walk = (obj: ts.ObjectLiteralExpression, prefix: string): void => {
    for (const p of obj.properties) {
      const name = prefix + memberName(p);
      if (ts.isPropertyAssignment(p) && ts.isObjectLiteralExpression(p.initializer)) {
        walk(p.initializer, name + ".");
        continue;
      }
      if (ts.isPropertyAssignment(p) && ts.isIdentifier(p.initializer)) {
        const decl = local(p.initializer.text);
        // market = Object.assign(marketFn, { breadth, ... })
        if (decl && ts.isVariableDeclaration(decl) && decl.initializer && ts.isCallExpression(decl.initializer)) {
          const [target, extra] = decl.initializer.arguments;
          const targetDecl = target && ts.isIdentifier(target) ? local(target.text) : undefined;
          if (!targetDecl || !hasExample(targetDecl)) missing.push(`${file}: ${name}`);
          if (extra && ts.isObjectLiteralExpression(extra)) walk(extra, name + ".");
          continue;
        }
        if (!decl || !hasExample(decl)) missing.push(`${file}: ${name}`);
        continue;
      }
      if (!hasExample(p)) missing.push(`${file}: ${name}`);
    }
  };
  walk(ret.expression, "client.");
}

/** Public methods of the handle classes, inherited ones included. */
function checkHandles(missing: string[]): void {
  const file = "src/client/stock.ts";
  const sf = source(file);
  for (const s of sf.statements) {
    if (!ts.isClassDeclaration(s) || !s.name) continue;
    for (const m of s.members) {
      if (!ts.isMethodDeclaration(m)) continue;
      // An overloaded method is documented on its signatures; its implementation is not public.
      if (m.body && s.members.some((o) => o !== m && ts.isMethodDeclaration(o) && !o.body && memberName(o) === memberName(m))) continue;
      const mods = ts.getCombinedModifierFlags(m);
      if (mods & (ts.ModifierFlags.Private | ts.ModifierFlags.Protected)) continue;
      if (!hasExample(m)) missing.push(`${file}: ${s.name.text}.${memberName(m)}`);
    }
  }
}

function checkIndicators(missing: string[]): void {
  const dir = path.join(ROOT, "src/indicators");
  for (const name of fs.readdirSync(dir).filter((f) => f.endsWith(".ts") && f !== "index.ts")) {
    const file = "src/indicators/" + name;
    for (const s of source(file).statements) {
      const exported = ts.canHaveModifiers(s) && (ts.getModifiers(s) || []).some((m) => m.kind === ts.SyntaxKind.ExportKeyword);
      if (exported && ts.isFunctionDeclaration(s) && s.name && !hasExample(s)) missing.push(`${file}: ${s.name.text}`);
    }
  }
}

function main(): void {
  const errors = checkBlocks();
  const missing: string[] = [];
  checkClient(missing);
  checkHandles(missing);
  checkIndicators(missing);

  for (const e of errors) console.error("docs: " + e);
  for (const m of missing) console.error("missing @example: " + m);
  if (errors.length > 0 || missing.length > 0) {
    console.error(`check-docs failed: ${errors.length} type error(s) in doc blocks, ${missing.length} public API(s) without @example`);
    process.exitCode = 1;
    return;
  }
  console.log("check-docs: doc blocks type-check and every public API has an @example");
}

main();
