import { beforeEach, describe, expect, it } from "vitest";
import { POST } from "@/app/api/mcp/route";
import * as store from "@/lib/store";
import { freshDataDir, sampleQuote } from "./helpers";

let id = 0;
async function rpc(ws: string | null, method: string, params: unknown = {}) {
  const url = ws === null ? "http://local.test/api/mcp" : `http://local.test/api/mcp?ws=${ws}`;
  const res = await POST(
    new Request(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json, text/event-stream",
        "mcp-protocol-version": "2025-06-18",
      },
      body: JSON.stringify({ jsonrpc: "2.0", id: ++id, method, params }),
    }),
  );
  return res.json();
}

const init = (ws: string) =>
  rpc(ws, "initialize", {
    protocolVersion: "2025-06-18",
    capabilities: {},
    clientInfo: { name: "test", version: "1" },
  });

let ws: string;
beforeEach(async () => {
  await freshDataDir();
  ws = (await store.createWorkspace()).key;
});

describe("MCP endpoint", () => {
  it("initializes as quotelink", async () => {
    const r = await init(ws);
    expect(r.result.serverInfo.name).toBe("quotelink");
  });

  it("lists all five tools", async () => {
    const r = await rpc(ws, "tools/list");
    const names = r.result.tools.map((t: { name: string }) => t.name);
    expect(names).toEqual(
      expect.arrayContaining(["create_quote", "list_quotes", "get_quote", "update_quote", "revise_quote"]),
    );
  });

  it("create_quote stores a quote and returns both links", async () => {
    const r = await rpc(ws, "tools/call", { name: "create_quote", arguments: sampleQuote });
    const text: string = r.result.content[0].text;
    expect(r.result.isError).toBeFalsy();
    expect(text).toContain("http://local.test/edit/");
    expect(text).toContain("http://local.test/q/");
    expect(await store.listQuotes(ws)).toHaveLength(1);
  });

  it("update_quote on an accepted quote is an error mentioning revise", async () => {
    const q = await store.createQuote(ws, sampleQuote);
    await store.acceptQuote(q.shareId, "A");
    const r = await rpc(ws, "tools/call", {
      name: "update_quote",
      arguments: { editId: q.editId, notes: "x" },
    });
    expect(r.result.isError).toBe(true);
    expect(r.result.content[0].text.toLowerCase()).toContain("revise");
  });

  it("cannot touch a quote from another workspace", async () => {
    const other = (await store.createWorkspace()).key;
    const q = await store.createQuote(other, sampleQuote);
    const r = await rpc(ws, "tools/call", { name: "get_quote", arguments: { editId: q.editId } });
    expect(r.result.isError).toBe(true);
  });

  it("missing or unknown workspace gives a clear JSON-RPC error", async () => {
    for (const w of [null, "nope"]) {
      const r = await rpc(w, "tools/list");
      expect(r.error.code).toBe(-32001);
      expect(r.error.message).toContain("connector link");
    }
  });
});

describe("MCP GET", () => {
  it("returns 405 since this stateless server offers no SSE stream", async () => {
    const { GET } = await import("@/app/api/mcp/route");
    const res = GET();
    expect(res.status).toBe(405);
  });
});
