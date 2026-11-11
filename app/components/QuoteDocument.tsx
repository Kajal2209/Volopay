import { formatDate } from "@/lib/format";
import { computeTotals, formatMoney } from "@/lib/totals";
import type { QuoteContent } from "@/lib/types";

interface Props {
  quote: QuoteContent & { createdAt?: string; shareId?: string };
  /** Rendered over the totals area, e.g. the Accepted stamp. */
  stamp?: React.ReactNode;
  compact?: boolean;
}

export function QuoteDocument({ quote, stamp, compact }: Props) {
  const t = computeTotals(quote);
  const money = (n: number) => formatMoney(n, quote.currency);
  const pad = compact ? "p-6" : "p-6 sm:p-10";

  return (
    <article className={`paper relative rounded-sm border border-rule bg-paper shadow-[0_1px_0_#cfd5de,0_12px_32px_-18px_rgba(28,34,48,0.35)] ${pad}`}>
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-rule pb-5">
        <div className="min-w-0">
          <p className="text-sm text-muted">Quote from</p>
          <p className="font-semibold">{quote.from.name}</p>
          {quote.from.email && <p className="text-sm text-muted break-all">{quote.from.email}</p>}
        </div>
        <div className="text-left sm:text-right">
          <p className="text-sm text-muted">Prepared for</p>
          <p className="font-semibold">{quote.client.name}</p>
          {quote.client.company && <p className="text-sm">{quote.client.company}</p>}
          {quote.client.email && <p className="text-sm text-muted break-all">{quote.client.email}</p>}
        </div>
      </header>

      <h1 className={`mt-6 font-semibold tracking-tight text-balance ${compact ? "text-xl" : "text-2xl sm:text-3xl"}`}>
        {quote.title}
      </h1>
      <p className="mt-1 text-sm text-muted">
        {quote.createdAt && <>Issued {formatDate(quote.createdAt)}</>}
        {quote.createdAt && quote.validUntil && <>, </>}
        {quote.validUntil && <>valid until {formatDate(quote.validUntil)}</>}
      </p>

      <table className="mt-6 w-full text-sm">
        <thead>
          <tr className="border-b border-ink text-left">
            <th className="py-2 pr-3 font-medium">Description</th>
            <th className="py-2 px-2 text-right font-medium">Qty</th>
            <th className="hidden py-2 px-2 text-right font-medium sm:table-cell">Rate</th>
            <th className="py-2 pl-2 text-right font-medium">Amount</th>
          </tr>
        </thead>
        <tbody>
          {quote.items.map((i, idx) => (
            <tr key={idx} className="border-b border-rule align-top">
              <td className="py-2.5 pr-3">
                {i.description}
                <span className="money block text-xs text-muted sm:hidden">{money(Number(i.unitPrice) || 0)} each</span>
              </td>
              <td className="money py-2.5 px-2 text-right">{i.quantity}</td>
              <td className="money hidden py-2.5 px-2 text-right sm:table-cell">{money(Number(i.unitPrice) || 0)}</td>
              <td className="money py-2.5 pl-2 text-right">
                {money((Number(i.quantity) || 0) * (Number(i.unitPrice) || 0))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-4 flex flex-wrap-reverse items-center justify-between gap-x-6 gap-y-4">
        <div className="pointer-events-none pl-2">{stamp}</div>
        <dl className="money ml-auto w-full max-w-64 space-y-1 text-sm">
          <Row label="Subtotal" value={money(t.subtotal)} />
          {t.discount > 0 && <Row label="Discount" value={`− ${money(t.discount)}`} />}
          {quote.taxPercent > 0 && <Row label={`Tax (${quote.taxPercent}%)`} value={money(t.tax)} />}
          <div className="flex justify-between border-t border-ink pt-2 text-base font-semibold">
            <dt>Total</dt>
            <dd>{money(t.total)}</dd>
          </div>
        </dl>
      </div>

      {(quote.timeline || quote.terms || quote.notes) && (
        <div className="mt-8 grid gap-5 border-t border-rule pt-6 text-sm sm:grid-cols-2">
          {quote.timeline && <Block title="Timeline">{quote.timeline}</Block>}
          {quote.terms && <Block title="Terms">{quote.terms}</Block>}
          {quote.notes && <Block title="Note">{quote.notes}</Block>}
        </div>
      )}
    </article>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <dt className="text-muted">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="font-medium">{title}</h2>
      <p className="mt-1 whitespace-pre-line text-muted">{children}</p>
    </div>
  );
}
