export function baseUrl(req: Request): string {
  const env = process.env.PUBLIC_BASE_URL?.replace(/\/+$/, "");
  if (env) return env;
  const u = new URL(req.url);
  const proto = req.headers.get("x-forwarded-proto") ?? u.protocol.replace(":", "");
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? u.host;
  return `${proto}://${host}`;
}

export const editUrl = (base: string, editId: string) => `${base}/edit/${editId}`;
export const shareUrl = (base: string, shareId: string) => `${base}/q/${shareId}`;
export const dashboardUrl = (base: string, key: string) => `${base}/w/${key}`;
export const mcpUrl = (base: string, key: string) => `${base}/api/mcp?ws=${key}`;

/** Same as baseUrl, for server components that only have request headers. */
export function baseUrlFromHeaders(h: Headers): string {
  const env = process.env.PUBLIC_BASE_URL?.replace(/\/+$/, "");
  if (env) return env;
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}
