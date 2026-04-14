/**
 * Capture raw WebSocket traffic từ SSI iBoard để dựng fixture cho test.
 *
 * Usage:
 *   pnpm ts-node scripts/capture-realtime.ts [SYMBOL1,SYMBOL2,...] [DURATION_SEC]
 *
 * Defaults:
 *   symbols  = VCB,FPT,MBB
 *   duration = 30 seconds
 *
 * Output:
 *   __tests__/fixtures/realtime/session-{timestamp}.jsonl
 *   Mỗi dòng là 1 JSON object: { t: epoch_ms, dir: "in"|"out", raw: string }
 *   Chạy trong giờ giao dịch (9:00-11:30, 13:00-14:45 VN) để bắt được quote thật.
 */
// eslint-disable-next-line @typescript-eslint/no-require-imports
const WebSocket = require("ws");
import * as fs from "fs";
import * as path from "path";

const URL = "wss://iboard-pushstream.ssi.com.vn/realtime";
const symbols = (process.argv[2] || "VCB,FPT,MBB").split(",").map((s) => s.trim()).filter(Boolean);
const durationSec = parseInt(process.argv[3] || "30", 10);

const fixtureDir = path.join(__dirname, "..", "__tests__", "fixtures", "realtime");
fs.mkdirSync(fixtureDir, { recursive: true });
const ts = new Date().toISOString().replace(/[:.]/g, "-");
const outPath = path.join(fixtureDir, `session-${ts}.jsonl`);
const out = fs.createWriteStream(outPath, { encoding: "utf8" });

function logLine(dir: "in" | "out" | "event", raw: string): void {
  const line = JSON.stringify({ t: Date.now(), dir, raw });
  out.write(line + "\n");
  const preview = raw.length > 120 ? raw.slice(0, 117) + "..." : raw;
  console.log(`[${dir}] ${preview}`);
}

console.log(`Connecting to ${URL}`);
console.log(`Symbols: ${symbols.join(", ")}`);
console.log(`Duration: ${durationSec}s`);
console.log(`Output:   ${outPath}\n`);

const socket = new WebSocket(URL);

socket.on("open", () => {
  logLine("event", "open");
  const subMsg = JSON.stringify({
    type: "sub",
    topic: "stockRealtimeBySymbolsAndBoards",
    variables: { symbols, boardIds: ["MAIN"] },
    component: "priceTableEquities",
  });
  logLine("out", subMsg);
  socket.send(subMsg);
});

socket.on("message", (data: any) => {
  logLine("in", data.toString());
});

socket.on("ping", (data: any) => {
  logLine("event", `ping:${Buffer.from(data).toString("hex")}`);
});

socket.on("pong", (data: any) => {
  logLine("event", `pong:${Buffer.from(data).toString("hex")}`);
});

socket.on("error", (err: any) => {
  logLine("event", `error:${err && err.message}`);
});

socket.on("close", (code: number, reason: any) => {
  logLine("event", `close:${code}:${reason && reason.toString()}`);
  out.end();
  console.log(`\nSaved fixture to ${outPath}`);
  process.exit(0);
});

setTimeout(() => {
  console.log("\nTrying unsubscribe...");
  const unsubMsg = JSON.stringify({
    type: "unsub",
    topic: "stockRealtimeBySymbolsAndBoards",
    variables: { symbols: [symbols[0]], boardIds: ["MAIN"] },
    component: "priceTableEquities",
  });
  logLine("out", unsubMsg);
  socket.send(unsubMsg);
}, Math.max(5000, durationSec * 500));

setTimeout(() => {
  socket.close();
}, durationSec * 1000);
