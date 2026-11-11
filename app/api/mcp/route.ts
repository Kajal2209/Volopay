import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { buildMcpServer } from "@/lib/mcp";
import { getWorkspace } from "@/lib/store";
import { baseUrl } from "@/lib/urls";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function rpcId(req: Request): Promise<string | number | null> {
  try {
    const body = await req.clone().json();
    return (Array.isArray(body) ? body[0]?.id : body?.id) ?? null;
  } catch {
    return null;
  }
}

async function handle(req: Request): Promise<Response> {
  const base = baseUrl(req);
  const ws = new URL(req.url).searchParams.get("ws");
  if (!ws || !(await getWorkspace(ws))) {
    return Response.json({
      jsonrpc: "2.0",
      id: req.method === "POST" ? await rpcId(req) : null,
      error: {
        code: -32001,
        message: `Unknown QuoteLink workspace. Get your personal connector link at ${base}`,
      },
    });
  }

  const server = buildMcpServer(ws, base);
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined, // stateless: each request stands alone
    enableJsonResponse: true,
  });
  await server.connect(transport);
  return transport.handleRequest(req);
}

// Stateless server: there is no standalone SSE stream to open, so GET is not offered
// (per the Streamable HTTP spec, clients treat 405 as "no stream").
export function GET() {
  return new Response(null, { status: 405, headers: { Allow: "POST" } });
}

export { handle as POST, handle as DELETE };
