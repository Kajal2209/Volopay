import fs from "node:fs/promises";
import path from "node:path";
import { nanoid } from "nanoid";
import { conflict, expired, invalidState, locked, notFound, validation } from "./errors";
import { parseContent, parseUpdate } from "./schema";
import { DEMO_KEY, seedDemo } from "./seed";
import type { PublicQuote, Quote, Workspace } from "./types";

interface Db {
  workspaces: Workspace[];
  quotes: Quote[];
  /** When the shared demo workspace was last restored to its seed state. */
  demoResetAt?: number;
}

const DEMO_RESET_MS = 30 * 60 * 1000;

const dataDir = () => process.env.DATA_DIR || path.join(process.cwd(), "data");
const dataFile = () => path.join(dataDir(), "quotes.json");

// One in-process lock: every read-modify-write runs strictly one after another.
// Kept on globalThis so every bundle Next.js builds (pages, route handlers) shares it.
const g = globalThis as unknown as { __quotelinkChain?: Promise<unknown> };
g.__quotelinkChain ??= Promise.resolve();
function withLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = g.__quotelinkChain!.then(fn, fn);
  g.__quotelinkChain = run.catch(() => undefined);
  return run;
}

export function _resetStoreForTests() {
  g.__quotelinkChain = Promise.resolve();
}

async function load(): Promise<Db> {
  let db: Db | null = null;
  try {
    const raw = await fs.readFile(dataFile(), "utf8");
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed?.workspaces) && Array.isArray(parsed?.quotes)) db = parsed;
      else throw new Error("bad shape");
    } catch {
      await fs.rename(dataFile(), path.join(dataDir(), `quotes.corrupt-${Date.now()}.json`));
      console.error("[quotelink] quotes.json was unreadable; moved aside and starting fresh");
    }
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
  }
  db ??= { workspaces: [], quotes: [] };
  const hasDemo = db.workspaces.some((w) => w.key === DEMO_KEY);
  // The demo is shared by every visitor: restore it regularly so one person
  // accepting or editing it doesn't spoil it for the next.
  if (!hasDemo || !db.demoResetAt || Date.now() - db.demoResetAt > DEMO_RESET_MS) {
    const seed = seedDemo();
    if (!hasDemo) db.workspaces.push(seed.workspace);
    db.quotes = db.quotes.filter((q) => q.workspaceKey !== DEMO_KEY).concat(seed.quotes);
    db.demoResetAt = Date.now();
    await save(db);
  }
  return db;
}

async function save(db: Db) {
  await fs.mkdir(dataDir(), { recursive: true });
  const tmp = `${dataFile()}.${process.pid}.${nanoid(6)}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(db, null, 2));
  await fs.rename(tmp, dataFile());
}

const read = <T>(fn: (db: Db) => T) => withLock(async () => fn(await load()));
const write = <T>(fn: (db: Db) => T) =>
  withLock(async () => {
    const db = await load();
    const result = fn(db);
    await save(db);
    return result;
  });

const now = () => new Date().toISOString();
const clone = <T>(x: T): T => structuredClone(x);

function byEdit(db: Db, editId: string): Quote {
  const q = db.quotes.find((x) => x.editId === editId);
  if (!q) throw notFound("Quote not found. Check the edit link.");
  return q;
}
function byShare(db: Db, shareId: string): Quote {
  const q = db.quotes.find((x) => x.shareId === shareId);
  if (!q) throw notFound("Quote not found.");
  return q;
}

/** A quote is valid through the end of its last day wherever the client is (end of day at UTC-12). */
export function isExpired(q: Pick<Quote, "validUntil">, at = new Date()): boolean {
  if (!q.validUntil) return false;
  return at.getTime() > new Date(`${q.validUntil}T23:59:59.999-12:00`).getTime();
}

export function toPublicQuote(q: Quote): PublicQuote {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { editId, workspaceKey, id, ...rest } = q;
  return clone(rest);
}

// ---------- workspaces ----------

export const createWorkspace = () =>
  write((db) => {
    const ws: Workspace = { key: nanoid(10), createdAt: now() };
    db.workspaces.push(ws);
    return clone(ws);
  });

export const getWorkspace = (key: string) =>
  read((db) => clone(db.workspaces.find((w) => w.key === key) ?? null));

// ---------- quotes ----------

export function createQuote(wsKey: string, input: unknown): Promise<Quote> {
  const content = parseContent(input);
  return write((db) => {
    if (!db.workspaces.some((w) => w.key === wsKey)) throw notFound("Workspace not found.");
    const t = now();
    const q: Quote = {
      ...content,
      id: nanoid(10),
      workspaceKey: wsKey,
      editId: nanoid(10),
      shareId: nanoid(10),
      status: "draft",
      createdAt: t,
      updatedAt: t,
    };
    db.quotes.push(q);
    return clone(q);
  });
}

export const listQuotes = (wsKey: string) =>
  read((db) =>
    clone(
      db.quotes
        .filter((q) => q.workspaceKey === wsKey)
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    ),
  );

export const getQuoteByEditId = (editId: string) =>
  read((db) => clone(db.quotes.find((q) => q.editId === editId) ?? null));

export const getQuoteByShareId = (shareId: string) =>
  read((db) => clone(db.quotes.find((q) => q.shareId === shareId) ?? null));

export function updateQuote(
  editId: string,
  patch: unknown,
  opts: { baseUpdatedAt?: string } = {},
): Promise<Quote> {
  const p = parseUpdate(patch);
  return write((db) => {
    const q = byEdit(db, editId);
    if (opts.baseUpdatedAt && opts.baseUpdatedAt !== q.updatedAt && q.status !== "accepted")
      throw conflict(
        "This quote changed since you opened it (Claude or your client may have updated it). Reload to see the latest version.",
      );
    if (q.status === "accepted")
      throw locked(
        "This quote was accepted by the client and is locked. Use revise_quote / 'Revise as new quote' to make a new version.",
      );
    const { from, client, ...rest } = p;
    Object.assign(q, rest);
    if (q.validUntil === "") delete q.validUntil; // empty date = no expiry
    if (from) q.from = { ...q.from, ...from };
    if (client) q.client = { ...q.client, ...client };
    if (q.status === "declined") {
      q.status = "sent";
      delete q.declinedReason;
    }
    q.updatedAt = now();
    return clone(q);
  });
}

export const markSent = (editId: string) =>
  write((db) => {
    const q = byEdit(db, editId);
    if (q.status === "draft") {
      q.status = "sent";
      q.updatedAt = now();
    }
    return clone(q);
  });

export const markViewed = (shareId: string) =>
  write((db) => {
    const q = byShare(db, shareId);
    if (q.status === "draft" || q.status === "sent") {
      q.status = "viewed";
      q.viewedAt = now();
    }
    return clone(q);
  });

function assertOpen(q: Quote) {
  if (q.status === "accepted") throw invalidState("This quote has already been accepted.");
  if (q.status === "declined") throw invalidState("This quote was declined.");
}

export function acceptQuote(shareId: string, name: string): Promise<Quote> {
  const clean = (name ?? "").trim();
  if (!clean) return Promise.reject(validation("Please type your full name to accept."));
  return write((db) => {
    const q = byShare(db, shareId);
    assertOpen(q);
    if (isExpired(q)) throw expired(`This quote expired on ${q.validUntil}.`);
    const t = now();
    q.status = "accepted";
    q.acceptedBy = { name: clean.slice(0, 120), at: t };
    q.updatedAt = t;
    return clone(q);
  });
}

export const declineQuote = (shareId: string, reason?: string) =>
  write((db) => {
    const q = byShare(db, shareId);
    assertOpen(q);
    q.status = "declined";
    const r = reason?.trim();
    if (r) q.declinedReason = r.slice(0, 2000);
    q.updatedAt = now();
    return clone(q);
  });

export const reviseQuote = (editId: string) =>
  write((db) => {
    const src = byEdit(db, editId);
    const t = now();
    const q: Quote = {
      ...clone(src),
      id: nanoid(10),
      editId: nanoid(10),
      shareId: nanoid(10),
      status: "draft",
      createdAt: t,
      updatedAt: t,
    };
    delete q.acceptedBy;
    delete q.declinedReason;
    delete q.viewedAt;
    if (isExpired(q)) delete q.validUntil; // a fresh draft shouldn't start out expired
    db.quotes.push(q);
    return clone(q);
  });
