import fs from "node:fs/promises";
import path from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import * as store from "@/lib/store";
import { freshDataDir, isoDate, sampleQuote } from "./helpers";

let dir: string;
beforeEach(async () => {
  dir = await freshDataDir();
});

async function codeOf(p: Promise<unknown>): Promise<string> {
  try {
    await p;
    return "NO_ERROR";
  } catch (e) {
    return (e as { code?: string }).code ?? "UNKNOWN";
  }
}

describe("workspaces and quotes", () => {
  it("creates and lists quotes per workspace", async () => {
    const a = await store.createWorkspace();
    const b = await store.createWorkspace();
    await store.createQuote(a.key, sampleQuote);
    await store.createQuote(b.key, sampleQuote);
    const list = await store.listQuotes(a.key);
    expect(list).toHaveLength(1);
    expect(list[0].status).toBe("draft");
    expect(list[0].workspaceKey).toBe(a.key);
  });

  it("rejects unknown workspace", async () => {
    expect(await codeOf(store.createQuote("nope", sampleQuote))).toBe("NOT_FOUND");
  });

  it("concurrent creates keep every quote", async () => {
    const ws = await store.createWorkspace();
    await Promise.all(Array.from({ length: 20 }, () => store.createQuote(ws.key, sampleQuote)));
    expect(await store.listQuotes(ws.key)).toHaveLength(20);
  });
});

describe("status rules", () => {
  it("accept flow locks the quote and refuses a second accept", async () => {
    const ws = await store.createWorkspace();
    const q = await store.createQuote(ws.key, sampleQuote);
    await store.markSent(q.editId);
    await store.markViewed(q.shareId);
    const accepted = await store.acceptQuote(q.shareId, "  Asha  ");
    expect(accepted.status).toBe("accepted");
    expect(accepted.acceptedBy?.name).toBe("Asha");
    expect(await codeOf(store.acceptQuote(q.shareId, "Bob"))).toBe("INVALID_STATE");
    expect((await store.getQuoteByShareId(q.shareId))?.acceptedBy?.name).toBe("Asha");
    expect(await codeOf(store.updateQuote(q.editId, { notes: "x" }))).toBe("LOCKED");
  });

  it("requires a name to accept", async () => {
    const ws = await store.createWorkspace();
    const q = await store.createQuote(ws.key, sampleQuote);
    expect(await codeOf(store.acceptQuote(q.shareId, "   "))).toBe("VALIDATION");
  });

  it("editing a declined quote moves it back to sent", async () => {
    const ws = await store.createWorkspace();
    const q = await store.createQuote(ws.key, sampleQuote);
    await store.declineQuote(q.shareId, "too pricey");
    expect(await codeOf(store.acceptQuote(q.shareId, "A"))).toBe("INVALID_STATE");
    const u = await store.updateQuote(q.editId, { notes: "x" });
    expect(u.status).toBe("sent");
    expect(u.declinedReason).toBeUndefined();
  });

  it("refuses to accept an expired quote", async () => {
    const ws = await store.createWorkspace();
    const q = await store.createQuote(ws.key, { ...sampleQuote, validUntil: isoDate(-2) });
    expect(await codeOf(store.acceptQuote(q.shareId, "A"))).toBe("EXPIRED");
    const today = await store.createQuote(ws.key, { ...sampleQuote, validUntil: isoDate(0) });
    expect(await codeOf(store.acceptQuote(today.shareId, "A"))).toBe("NO_ERROR");
  });

  it("markViewed does not downgrade an accepted quote", async () => {
    const ws = await store.createWorkspace();
    const q = await store.createQuote(ws.key, sampleQuote);
    await store.acceptQuote(q.shareId, "A");
    await store.markViewed(q.shareId);
    expect((await store.getQuoteByShareId(q.shareId))?.status).toBe("accepted");
  });

  it("markSent only moves draft to sent", async () => {
    const ws = await store.createWorkspace();
    const q = await store.createQuote(ws.key, sampleQuote);
    await store.markViewed(q.shareId);
    await store.markSent(q.editId);
    expect((await store.getQuoteByEditId(q.editId))?.status).toBe("viewed");
  });

  it("revise copies an accepted quote into a new draft", async () => {
    const ws = await store.createWorkspace();
    const q = await store.createQuote(ws.key, sampleQuote);
    await store.acceptQuote(q.shareId, "A");
    const r = await store.reviseQuote(q.editId);
    expect(r.status).toBe("draft");
    expect(r.editId).not.toBe(q.editId);
    expect(r.shareId).not.toBe(q.shareId);
    expect(r.items).toEqual(q.items);
    expect(r.acceptedBy).toBeUndefined();
    expect((await store.getQuoteByEditId(q.editId))?.status).toBe("accepted");
  });

  it("update merges client and replaces items", async () => {
    const ws = await store.createWorkspace();
    const q = await store.createQuote(ws.key, { ...sampleQuote, client: { name: "Acme", email: "a@b.co" } });
    const u = await store.updateQuote(q.editId, {
      client: { name: "Acme Ltd" },
      items: [{ description: "Only", unitPrice: "200" }],
    });
    expect(u.client).toEqual({ name: "Acme Ltd", email: "a@b.co" });
    expect(u.items).toEqual([{ description: "Only", quantity: 1, unitPrice: 200 }]);
    // defaults must not overwrite stored values on a partial update
    expect(u.taxPercent).toBe(18);
    expect(u.title).toBe("Website redesign");
  });

  it("toPublicQuote hides private ids", async () => {
    const ws = await store.createWorkspace();
    const q = await store.createQuote(ws.key, sampleQuote);
    const p = store.toPublicQuote(q) as Record<string, unknown>;
    expect(p.editId).toBeUndefined();
    expect(p.workspaceKey).toBeUndefined();
    expect(p.id).toBeUndefined();
    expect(p.shareId).toBe(q.shareId);
  });
});

describe("data file", () => {
  it("seeds the demo workspace on first load", async () => {
    expect(await store.getWorkspace("demo")).not.toBeNull();
    expect(await store.listQuotes("demo")).toHaveLength(2);
    const raw = JSON.parse(await fs.readFile(path.join(dir, "quotes.json"), "utf8"));
    expect(raw.workspaces.some((w: { key: string }) => w.key === "demo")).toBe(true);
  });

  it("recovers from a corrupt file", async () => {
    await fs.writeFile(path.join(dir, "quotes.json"), "{oops");
    store._resetStoreForTests();
    expect(await store.listQuotes("demo")).toHaveLength(2);
    const files = await fs.readdir(dir);
    expect(files.some((f) => f.startsWith("quotes.corrupt-"))).toBe(true);
  });
});

describe("validUntil", () => {
  it("an empty validUntil clears the expiry", async () => {
    const ws = await store.createWorkspace();
    const q = await store.createQuote(ws.key, { ...sampleQuote, validUntil: isoDate(-3) });
    const u = await store.updateQuote(q.editId, { validUntil: "" });
    expect(u.validUntil).toBeUndefined();
    expect(await codeOf(store.acceptQuote(q.shareId, "A"))).toBe("NO_ERROR");
  });
});

describe("review fixes", () => {
  it("rejects a save based on a stale version (Claude updated it meanwhile)", async () => {
    const ws = await store.createWorkspace();
    const q = await store.createQuote(ws.key, sampleQuote);
    await new Promise((r) => setTimeout(r, 5));
    await store.updateQuote(q.editId, { discount: 1000 }); // Claude's change
    expect(await codeOf(store.updateQuote(q.editId, { notes: "typo" }, { baseUpdatedAt: q.updatedAt }))).toBe("CONFLICT");
    expect((await store.getQuoteByEditId(q.editId))?.discount).toBe(1000);
    const fresh = await store.getQuoteByEditId(q.editId);
    expect(await codeOf(store.updateQuote(q.editId, { notes: "ok" }, { baseUpdatedAt: fresh!.updatedAt }))).toBe("NO_ERROR");
  });

  it("resets the shared demo workspace after 30 minutes", async () => {
    const [demo] = await store.listQuotes("demo").then((l) => l.filter((q) => q.shareId === "demo-share-1"));
    await store.acceptQuote(demo.shareId, "Vandal");
    await store.createQuote("demo", sampleQuote);
    expect(await store.listQuotes("demo")).toHaveLength(3);
    const later = Date.now() + 31 * 60 * 1000;
    const realNow = Date.now;
    Date.now = () => later;
    try {
      const list = await store.listQuotes("demo");
      expect(list).toHaveLength(2);
      expect(list.find((q) => q.shareId === "demo-share-1")?.status).toBe("sent");
    } finally {
      Date.now = realNow;
    }
  });

  it("revising a quote with a past validUntil clears it", async () => {
    const ws = await store.createWorkspace();
    const q = await store.createQuote(ws.key, { ...sampleQuote, validUntil: isoDate(-5) });
    expect((await store.reviseQuote(q.editId)).validUntil).toBeUndefined();
    const f = await store.createQuote(ws.key, { ...sampleQuote, validUntil: isoDate(5) });
    expect((await store.reviseQuote(f.editId)).validUntil).toBe(isoDate(5));
  });

  it("a quote stays valid through the end of its last day anywhere", () => {
    const at = new Date("2026-11-11T20:00:00Z"); // still the 11th in the Americas
    expect(store.isExpired({ validUntil: "2026-11-11" }, at)).toBe(false);
    expect(store.isExpired({ validUntil: "2026-11-11" }, new Date("2026-11-12T13:00:00Z"))).toBe(true);
  });
});
