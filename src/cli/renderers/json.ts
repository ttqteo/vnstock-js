export function renderJson(data: unknown): string {
  return JSON.stringify(data, null, 2);
}
