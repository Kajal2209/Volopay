"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { computeTotals, formatMoney } from "@/lib/totals";
import { formatDateTime } from "@/lib/format";
import type { Quote, QuoteContent } from "@/lib/types";
import { btn } from "@/app/components/bits";
import { CopyButton } from "@/app/components/CopyButton";

type Item = { description: string; quantity: string; unitPrice: string };
type Form = Omit<QuoteContent, "items" | "taxPercent" | "discount"> & {
  items: Item[];
  taxPercent: string;
  discount: string;
};

type EditorQuote = Omit<Quote, "workspaceKey">;

const toForm = (q: EditorQuote): Form => ({
  title: q.title,
  from: { name: q.from.name, email: q.from.email ?? "" },
  client: { name: q.client.name, company: q.client.company ?? "", email: q.client.email ?? "" },
  currency: q.currency,
  items: q.items.map((i) => ({ description: i.description, quantity: String(i.quantity), unitPrice: String(i.unitPrice) })),
  taxPercent: String(q.taxPercent),
  discount: String(q.discount),
  timeline: q.timeline ?? "",
  terms: q.terms ?? "",
  notes: q.notes ?? "",
  validUntil: q.validUntil ?? "",
});

const field =
  "w-full min-w-0 rounded-md border border-rule bg-paper px-3 py-2 text-sm placeholder:text-muted/70 focus:border-carbon focus:outline-none";
const label = "mb-1 block text-sm font-medium";

export function Editor({
  initial,
  clientUrl,
  expired,
}: {
  initial: EditorQuote;
  clientUrl: string;
  expired: boolean;
}) {
  const router = useRouter();
  const [quote, setQuote] = useState(initial);
  const [form, setForm] = useState<Form>(() => toForm(initial));
  const [saved, setSaved] = useState<Form>(() => toForm(initial));
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error" | "conflict">("idle");
  const [error, setError] = useState("");

  const dirty = JSON.stringify(form) !== JSON.stringify(saved);
  const totals = useMemo(
    () =>
      computeTotals({
        items: form.items.map((i) => ({ description: i.description, quantity: Number(i.quantity), unitPrice: Number(i.unitPrice) })),
        taxPercent: Number(form.taxPercent),
        discount: Number(form.discount),
      }),
    [form],
  );
  const money = (n: number) => formatMoney(n, form.currency || "INR");

  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (dirty) e.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }));
  const setItem = (idx: number, patch: Partial<Item>) =>
    setForm((f) => ({ ...f, items: f.items.map((it, i) => (i === idx ? { ...it, ...patch } : it)) }));
  const moveItem = (idx: number, dir: -1 | 1) =>
    setForm((f) => {
      const items = [...f.items];
      const j = idx + dir;
      if (j < 0 || j >= items.length) return f;
      [items[idx], items[j]] = [items[j], items[idx]];
      return { ...f, items };
    });

  async function save() {
    setState("saving");
    setError("");
    let res: Response;
    try {
      res = await fetch(`/api/quotes/${quote.editId}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...form, baseUpdatedAt: quote.updatedAt }),
      });
    } catch {
      setState("error");
      setError("Couldn't reach QuoteLink. Check your connection and save again.");
      return;
    }
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(body.error ?? "Couldn't save. Try again.");
      setState(body.code === "CONFLICT" || body.code === "LOCKED" ? "conflict" : "error");
      return;
    }
    setQuote(body.quote);
    const next = toForm(body.quote);
    setForm(next);
    setSaved(next);
    setState("saved");
  }

  async function markSent() {
    const res = await fetch(`/api/quotes/${quote.editId}/send`, { method: "POST" });
    if (res.ok) {
      const { status, updatedAt } = await res.json();
      setQuote((q) => ({ ...q, status, updatedAt }));
      router.refresh();
    }
  }

  return (
    <div className="mx-auto grid max-w-5xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,1fr)_280px]">
      <div className="min-w-0 space-y-8">
        {expired && (
          <div className="rounded-lg border border-decline/30 bg-decline-soft p-4 text-sm text-decline">
            <p className="font-medium">This quote has expired, so your client can&rsquo;t accept it.</p>
            <p className="mt-1">Set a later &ldquo;Valid until&rdquo; date and save to reopen it.</p>
          </div>
        )}
        {quote.status === "declined" && (
          <div className="rounded-lg border border-decline/30 bg-decline-soft p-4 text-sm text-decline">
            <p className="font-medium">The client declined this quote.</p>
            {quote.declinedReason && <p className="mt-1">Their reason: “{quote.declinedReason}”</p>}
            <p className="mt-1">Saving changes moves it back to Sent, so they can accept the new version.</p>
          </div>
        )}

        <section>
          <label className={label} htmlFor="title">
            Quote title
          </label>
          <input id="title" className={`${field} text-lg font-semibold`} value={form.title} onChange={(e) => set("title", e.target.value)} />
        </section>

        <section className="grid gap-6 sm:grid-cols-2">
          <fieldset className="space-y-3">
            <legend className="mb-2 font-semibold">From</legend>
            <input aria-label="Your name" placeholder="Your name or studio" className={field} value={form.from.name} onChange={(e) => set("from", { ...form.from, name: e.target.value })} />
            <input aria-label="Your email" placeholder="Email (optional)" className={field} value={form.from.email} onChange={(e) => set("from", { ...form.from, email: e.target.value })} />
          </fieldset>
          <fieldset className="space-y-3">
            <legend className="mb-2 font-semibold">Client</legend>
            <input aria-label="Client name" placeholder="Client name" className={field} value={form.client.name} onChange={(e) => set("client", { ...form.client, name: e.target.value })} />
            <input aria-label="Client company" placeholder="Company (optional)" className={field} value={form.client.company} onChange={(e) => set("client", { ...form.client, company: e.target.value })} />
            <input aria-label="Client email" placeholder="Email (optional)" className={field} value={form.client.email} onChange={(e) => set("client", { ...form.client, email: e.target.value })} />
          </fieldset>
        </section>

        <section>
          <h2 className="mb-3 font-semibold">Line items</h2>
          <div className="hidden grid-cols-[minmax(0,1fr)_70px_120px_110px_104px] gap-2 px-1 pb-1 text-xs text-muted sm:grid">
            <span>Description</span>
            <span className="text-right">Qty</span>
            <span className="text-right">Rate</span>
            <span className="text-right">Amount</span>
            <span />
          </div>
          <ul className="space-y-2">
            {form.items.map((it, idx) => (
              <li key={idx} className="grid grid-cols-[minmax(0,1fr)_70px_minmax(0,1fr)] gap-2 rounded-md border border-rule bg-paper p-2 sm:grid-cols-[minmax(0,1fr)_70px_120px_110px_104px] sm:items-center sm:border-0 sm:bg-transparent sm:p-0">
                <input aria-label={`Item ${idx + 1} description`} className={`${field} col-span-3 sm:col-span-1`} value={it.description} onChange={(e) => setItem(idx, { description: e.target.value })} />
                <input aria-label={`Item ${idx + 1} quantity`} inputMode="decimal" className={`${field} money text-right`} value={it.quantity} onChange={(e) => setItem(idx, { quantity: e.target.value })} />
                <input aria-label={`Item ${idx + 1} rate`} inputMode="decimal" className={`${field} money text-right`} value={it.unitPrice} onChange={(e) => setItem(idx, { unitPrice: e.target.value })} />
                <span className="money hidden text-right text-sm sm:block">
                  {money((Number(it.quantity) || 0) * (Number(it.unitPrice) || 0))}
                </span>
                <span className="col-span-3 flex justify-end gap-1 sm:col-span-1">
                  <IconBtn label="Move up" onClick={() => moveItem(idx, -1)} disabled={idx === 0}>↑</IconBtn>
                  <IconBtn label="Move down" onClick={() => moveItem(idx, 1)} disabled={idx === form.items.length - 1}>↓</IconBtn>
                  <IconBtn label="Remove item" onClick={() => set("items", form.items.filter((_, i) => i !== idx))} disabled={form.items.length === 1}>×</IconBtn>
                </span>
              </li>
            ))}
          </ul>
          <button type="button" className={`${btn.ghost} mt-3`} onClick={() => set("items", [...form.items, { description: "", quantity: "1", unitPrice: "0" }])}>
            Add line item
          </button>
        </section>

        <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <label className={label} htmlFor="currency">Currency</label>
            <input id="currency" className={`${field} uppercase`} value={form.currency} maxLength={4} onChange={(e) => set("currency", e.target.value)} />
          </div>
          <div>
            <label className={label} htmlFor="tax">Tax %</label>
            <input id="tax" inputMode="decimal" className={`${field} money`} value={form.taxPercent} onChange={(e) => set("taxPercent", e.target.value)} />
          </div>
          <div>
            <label className={label} htmlFor="discount">Discount</label>
            <input id="discount" inputMode="decimal" className={`${field} money`} value={form.discount} onChange={(e) => set("discount", e.target.value)} />
          </div>
          <div>
            <label className={label} htmlFor="valid">Valid until</label>
            <input id="valid" type="date" className={field} value={form.validUntil} onChange={(e) => set("validUntil", e.target.value)} />
          </div>
        </section>

        <section className="grid gap-4">
          <div>
            <label className={label} htmlFor="timeline">Timeline</label>
            <input id="timeline" className={field} value={form.timeline} onChange={(e) => set("timeline", e.target.value)} />
          </div>
          <div>
            <label className={label} htmlFor="terms">Terms</label>
            <textarea id="terms" rows={4} className={field} value={form.terms} onChange={(e) => set("terms", e.target.value)} />
          </div>
          <div>
            <label className={label} htmlFor="notes">Note to client</label>
            <textarea id="notes" rows={2} className={field} value={form.notes} onChange={(e) => set("notes", e.target.value)} />
          </div>
        </section>
      </div>

      <aside className="lg:sticky lg:top-6 lg:self-start">
        <div className="rounded-lg border border-rule bg-paper p-5">
          <dl className="money space-y-1 text-sm">
            <div className="flex justify-between"><dt className="text-muted">Subtotal</dt><dd>{money(totals.subtotal)}</dd></div>
            {totals.discount > 0 && <div className="flex justify-between"><dt className="text-muted">Discount</dt><dd>− {money(totals.discount)}</dd></div>}
            {totals.tax > 0 && <div className="flex justify-between"><dt className="text-muted">Tax</dt><dd>{money(totals.tax)}</dd></div>}
            <div className="flex justify-between border-t border-ink pt-2 text-lg font-semibold"><dt>Total</dt><dd>{money(totals.total)}</dd></div>
          </dl>

          <button className={`${btn.primary} mt-5 w-full`} onClick={save} disabled={!dirty || state === "saving"}>
            {state === "saving" ? "Saving…" : dirty ? "Save changes" : "Saved"}
          </button>
          {state === "error" && <p className="mt-2 text-sm text-decline" role="alert">{error}</p>}
          {state === "conflict" && (
            <div className="mt-3 rounded-md bg-decline-soft p-3 text-sm text-decline" role="alert">
              <p>{error}</p>
              <button type="button" className="mt-2 font-medium underline underline-offset-4" onClick={() => window.location.reload()}>
                Reload latest version
              </button>
            </div>
          )}

          <div className="mt-6 border-t border-rule pt-5">
            <p className="text-sm font-medium">Send to your client</p>
            <p className="mt-1 text-sm text-muted">
              {dirty ? "Save first, then copy the link." : "They can open it, read it, and accept with their name."}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {dirty ? (
                <button className={btn.secondary} disabled>Copy client link</button>
              ) : (
                <CopyButton text={clientUrl} label="Copy client link" onCopied={markSent} variant="secondary" />
              )}
              <a className={btn.secondary} href={clientUrl} target="_blank" rel="noreferrer">Preview</a>
            </div>
            {quote.status === "viewed" && quote.viewedAt && (
              <p className="mt-3 text-sm text-muted">Client opened it {formatDateTime(quote.viewedAt)}.</p>
            )}
          </div>
        </div>
      </aside>
    </div>
  );
}

function IconBtn({ label, children, ...rest }: { label: string; children: React.ReactNode } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button type="button" aria-label={label} title={label} className="size-8 rounded-md border border-rule bg-paper text-muted hover:border-ink hover:text-ink disabled:opacity-30" {...rest}>
      {children}
    </button>
  );
}
