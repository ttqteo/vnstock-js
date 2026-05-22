export interface McpContent {
  type: "text";
  text: string;
}

export interface McpToolResponse {
  content: McpContent[];
  isError?: boolean;
}

export function textResponse(summary: string, structured?: unknown): McpToolResponse {
  var content: McpContent[] = [{ type: "text", text: summary }];
  if (structured !== undefined) {
    content.push({ type: "text", text: JSON.stringify(structured, null, 2) });
  }
  return { content };
}

export function errorResponse(message: string): McpToolResponse {
  return {
    content: [{ type: "text", text: message }],
    isError: true,
  };
}
