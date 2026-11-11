import { beforeEach, describe, expect, it } from "vitest";
import { POST as createWs } from "@/app/api/workspaces/route";
import { POST as createBlank } from "@/app/api/w/[key]/quotes/route";
import { GET as getQuote, PUT as putQuote } from "@/app/api/quotes/[editId]/route";
import { POST as sendQuote } from "@/app/api/quotes/[editId]/send/route";
import { POST as revise } from "@/app/api/quotes/[editId]/revise/route";
import { POST as view } from "@/app/api/q/[shareId]/view/route";
import { POST as accept } from "@/app/api/q/[shareId]/accept/route";
import { POST as decline } from "@/app/api/q/[shareId]/decline/route";
import * as store from "@/lib/store";
import { freshDataDir, sampleQuote } from "./helpers";

const ctx = <T extends Record<string, string>>(p: T) => ({ params: Promise.resolve(p) });
const req = (method: string, body?: unknown, headers: Record<string, string> = {}) =>
  new Request("http://local.test/x", {
    method,
    headers: { "content-type": "application/json", ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

let ws: string;
beforeEach(async () => {
  await freshDataDir();
  ws = (await store.createWorkspace()).key;
});

describe("API", () => {
  it("creating a workspace sets the ql_ws cookie and returns links", async () => {
    const res = await createWs(req("POST"));
    const body = await res.json();
    expect(res.headers.get("set-cookie")).toContain(`ql_ws=${body.key}`);
    expect(body.mcpUrl).toBe(`http://local.test/api/mcp?ws=${body.key}`);
    expect(body.dashboardUrl).toBe(`http://local.test/w/${body.key}`);
  });

  it("creates a blank quote in a workspace", async () => {
    const res = await createBlank(req("POST"), ctx({ key: ws }));
    const { editId } = await res.json();
    expect((await store.getQuoteByEditId(editId))?.title).toBe("Untitled quote");
    expect((await createBlank(req("POST"), ctx({ key: "nope" }))).status).toBe(404);
  });

  it("PUT saves and returns totals", async () => {
    const q = await store.createQuote(ws, sampleQuote);
    const res = await putQuote(
      req("PUT", { items: [{ description: "A", unitPrice: "200" }], taxPercent: 0 }),
      ctx({ editId: q.editId }),
    );
    const body = await res.json();
    expect(body.totals.subtotal).toBe(200);
    const got = await (await getQuote(req("GET"), ctx({ editId: q.editId }))).json();
    expect(got.quote.items).toHaveLength(1);
  });

  it("PUT on an accepted quote is 409, bad input is 400", async () => {
    const q = await store.createQuote(ws, sampleQuote);
    expect((await putQuote(req("PUT", { taxPercent: -1 }), ctx({ editId: q.editId }))).status).toBe(400);
    await store.acceptQuote(q.shareId, "A");
    expect((await putQuote(req("PUT", { notes: "x" }), ctx({ editId: q.editId }))).status).toBe(409);
  });

  it("view does not count when the editor cookie is present", async () => {
    const q = await store.createQuote(ws, sampleQuote);
    await sendQuote(req("POST"), ctx({ editId: q.editId }));
    await view(req("POST", {}, { cookie: `ql_editor_${q.editId}=1` }), ctx({ shareId: q.shareId }));
    expect((await store.getQuoteByShareId(q.shareId))?.status).toBe("sent");
    const res = await view(req("POST"), ctx({ shareId: q.shareId }));
    expect((await res.json()).status).toBe("viewed");
  });

  it("accept needs a name and never leaks the edit id", async () => {
    const q = await store.createQuote(ws, sampleQuote);
    expect((await accept(req("POST", { name: "" }), ctx({ shareId: q.shareId }))).status).toBe(400);
    const res = await accept(req("POST", { name: "Asha" }), ctx({ shareId: q.shareId }));
    const text = await res.text();
    expect(res.status).toBe(200);
    expect(text).not.toContain(q.editId);
    expect(text).not.toContain(ws);
    expect(JSON.parse(text).quote.status).toBe("accepted");
  });

  it("decline and revise work", async () => {
    const q = await store.createQuote(ws, sampleQuote);
    const d = await decline(req("POST", { reason: "budget" }), ctx({ shareId: q.shareId }));
    expect((await d.json()).quote.declinedReason).toBe("budget");
    const r = await revise(req("POST"), ctx({ editId: q.editId }));
    const { editId } = await r.json();
    expect(editId).not.toBe(q.editId);
  });

  it("unknown ids are 404 with a JSON error", async () => {
    const res = await getQuote(req("GET"), ctx({ editId: "nope" }));
    expect(res.status).toBe(404);
    expect((await res.json()).error).toBeTruthy();
  });
});

describe("API review fixes", () => {
  it("PUT with a stale baseUpdatedAt is 409 and responses hide workspaceKey", async () => {
    const q = await store.createQuote(ws, sampleQuote);
    const got = await (await getQuote(req("GET"), ctx({ editId: q.editId }))).json();
    expect(got.quote.workspaceKey).toBeUndefined();
    await new Promise((r) => setTimeout(r, 5));
    await store.updateQuote(q.editId, { discount: 10 });
    const res = await putQuote(req("PUT", { notes: "x", baseUpdatedAt: q.updatedAt }), ctx({ editId: q.editId }));
    expect(res.status).toBe(409);
  });

  it("send returns the new updatedAt so the editor can keep saving", async () => {
    const q = await store.createQuote(ws, sampleQuote);
    const body = await (await sendQuote(req("POST"), ctx({ editId: q.editId }))).json();
    expect(body.updatedAt).toBe((await store.getQuoteByEditId(q.editId))?.updatedAt);
  });
});
