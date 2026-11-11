"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { formatDate, formatDateTime } from "@/lib/format";
import { computeTotals, formatMoney } from "@/lib/totals";
import type { PublicQuote } from "@/lib/types";
import { QuoteDocument } from "@/app/components/QuoteDocument";
import { Stamp, btn } from "@/app/components/bits";

export function ClientQuote({ initial, expired }: { initial: PublicQuote; expired: boolean }) {
  const [quote, setQuote] = useState(initial);
  const [name, setName] = useState("");
  const [mode, setMode] = useState<"idle" | "declining">("idle");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [justActed, setJustActed] = useState(false);
  const viewed = useRef(false);

  useEffect(() => {
    if (viewed.current) return;
    viewed.current = true;
    fetch(`/api/q/${initial.shareId}/view`, { method: "POST" }).catch(() => {});
  }, [initial.shareId]);

  async function act(path: "accept" | "decline", body: object) {
    setBusy(true);
    setError("");
    const res = await fetch(`/api/q/${quote.shareId}/${path}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setError(data.error ?? "Something went wrong. Please try again.");
    setQuote(data.quote);
    setJustActed(true);
  }

  const total = formatMoney(computeTotals(quote).total, quote.currency);
  const closed = quote.status === "accepted" || quote.status === "declined";

  const stamp =
    quote.status === "accepted" && quote.acceptedBy ? (
      <Stamp kind="accepted" name={quote.acceptedBy.name} date={formatDate(quote.acceptedBy.at)} land={justActed} />
    ) : quote.status === "declined" ? (
      <Stamp kind="declined" land={justActed} />
    ) : null;

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
      <QuoteDocument quote={quote} stamp={stamp} />

      <section className="no-print mt-6 rounded-lg border border-rule bg-paper p-5 sm:p-6" aria-live="polite">
        {quote.status === "accepted" && quote.acceptedBy ? (
          <div>
            <p className="text-lg font-semibold">Accepted. Thank you, {quote.acceptedBy.name.split(" ")[0]}.</p>
            <p className="mt-1 text-muted">
              You accepted this quote for {total} on{" "}
              {formatDateTime(quote.acceptedBy.at)}. {quote.from.name} can see your acceptance in QuoteLink.
            </p>
            <button className={`${btn.ghost} mt-3`} onClick={() => window.print()}>
              Print or save as PDF
            </button>
          </div>
        ) : quote.status === "declined" ? (
          <div>
            <p className="text-lg font-semibold">You declined this quote.</p>
            <p className="mt-1 text-muted">{quote.from.name} can send you a revised version.</p>
          </div>
        ) : expired ? (
          <div>
            <p className="text-lg font-semibold">This quote expired on {formatDate(quote.validUntil!)}.</p>
            <p className="mt-1 text-muted">Ask {quote.from.name} to extend it if you&rsquo;d still like to go ahead.</p>
          </div>
        ) : mode === "declining" ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              act("decline", { reason });
            }}
          >
            <label htmlFor="reason" className="font-semibold">
              Decline this quote
            </label>
            <p className="text-sm text-muted">Optional: tell {quote.from.name} why, so they can revise it.</p>
            <textarea
              id="reason"
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="mt-3 w-full rounded-md border border-rule px-3 py-2 text-sm focus:border-carbon focus:outline-none"
            />
            <div className="mt-3 flex gap-3">
              <button className={`${btn.secondary} text-decline`} disabled={busy}>
                {busy ? "Sending…" : "Decline quote"}
              </button>
              <button type="button" className={btn.ghost} onClick={() => setMode("idle")}>
                Back
              </button>
            </div>
          </form>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              act("accept", { name });
            }}
          >
            <p className="text-lg font-semibold">
              Accept this quote for {total}
            </p>
            <p className="text-sm text-muted">Typing your full name counts as your agreement to the scope and terms above.</p>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              <input
                aria-label="Your full name"
                placeholder="Your full name"
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="min-w-0 flex-1 rounded-md border border-rule px-3 py-2 focus:border-carbon focus:outline-none"
              />
              <button className={btn.primary} disabled={busy || !name.trim()}>
                {busy ? "Accepting…" : "Accept quote"}
              </button>
            </div>
            <button type="button" className="mt-4 text-sm text-muted underline-offset-4 hover:underline" onClick={() => setMode("declining")}>
              Decline instead
            </button>
          </form>
        )}
        {error && !closed && (
          <p className="mt-3 text-sm text-decline" role="alert">
            {error}
          </p>
        )}
      </section>

      <p className="no-print mt-8 text-center text-xs text-muted">
        Sent with <Link href="/" className="underline-offset-4 hover:underline">QuoteLink</Link>
      </p>
    </main>
  );
}
