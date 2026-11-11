import { AppError } from "./errors";

export async function handle(fn: () => Promise<unknown>): Promise<Response> {
  try {
    return Response.json(await fn());
  } catch (e) {
    if (e instanceof AppError) return Response.json({ error: e.message, code: e.code }, { status: e.status });
    console.error("[quotelink api]", e);
    return Response.json({ error: "Something went wrong" }, { status: 500 });
  }
}

export async function jsonBody(req: Request): Promise<Record<string, unknown>> {
  try {
    const b = await req.json();
    return b && typeof b === "object" ? b : {};
  } catch {
    return {};
  }
}

export function readCookie(req: Request, name: string): string | undefined {
  const header = req.headers.get("cookie") ?? "";
  for (const part of header.split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === name) return decodeURIComponent(v.join("="));
  }
  return undefined;
}

export const WS_COOKIE = "ql_ws";
export const editorCookie = (editId: string) => `ql_editor_${editId}`;
export const ONE_YEAR = 60 * 60 * 24 * 365;
