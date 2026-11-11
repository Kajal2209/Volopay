import { createWorkspace } from "@/lib/store";
import { baseUrl, dashboardUrl, mcpUrl } from "@/lib/urls";
import { ONE_YEAR, WS_COOKIE } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const ws = await createWorkspace();
  const base = baseUrl(req);
  const res = Response.json({ key: ws.key, dashboardUrl: dashboardUrl(base, ws.key), mcpUrl: mcpUrl(base, ws.key) });
  res.headers.append("set-cookie", `${WS_COOKIE}=${ws.key}; Path=/; Max-Age=${ONE_YEAR}; SameSite=Lax`);
  return res;
}
