import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { tools } from "./tools";
import { handlers } from "./handlers";
import { errorResponse } from "./formatters";

export async function start(): Promise<void> {
  const pkg = require("../../../package.json");

  const server = new Server(
    {
      name: "vnstock-js",
      version: pkg.version,
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return { tools };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request): Promise<any> => {
    const { name, arguments: args } = request.params;
    const handler = handlers[name];
    if (!handler) {
      return errorResponse(`Tool không tồn tại: ${name}`);
    }
    try {
      return await handler(args || {});
    } catch (e: any) {
      return errorResponse(`Lỗi nội bộ tool ${name}: ${e.message || e}`);
    }
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);

  process.stderr.write(
    `[vnstock-js mcp] Server started (v${pkg.version}), ${tools.length} tools registered.\n`
  );
}
