import Link from "next/link";
import type { QuoteStatus } from "@/lib/types";

const BADGE: Record<QuoteStatus, { label: string; cls: string }> = {
  draft: { label: "Draft", cls: "bg-desk text-muted" },
  sent: { label: "Sent", cls: "bg-carbon-soft text-carbon" },
  viewed: { label: "Viewed", cls: "bg-[#fff4d6] text-[#7a5300]" },
  accepted: { label: "Accepted", cls: "bg-ok-soft text-ok" },
  declined: { label: "Declined", cls: "bg-decline-soft text-decline" },
};

export function StatusBadge({ status }: { status: QuoteStatus }) {
  const b = BADGE[status];
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${b.cls}`}>
      {b.label}
    </span>
  );
}

export function Stamp({
  kind,
  name,
  date,
  land,
}: {
  kind: "accepted" | "declined";
  name?: string;
  date?: string;
  land?: boolean;
}) {
  return (
    <div className={`stamp ${kind === "declined" ? "stamp--declined" : ""} ${land ? "stamp--land" : ""}`}>
      <span className="text-lg font-bold">{kind === "accepted" ? "ACCEPTED" : "DECLINED"}</span>
      {name && <span className="max-w-40 truncate text-[11px] font-medium tracking-normal">{name}</span>}
      {date && <span className="text-[10px] font-medium tracking-normal">{date}</span>}
    </div>
  );
}

export function Wordmark() {
  return (
    <Link href="/" className="inline-flex items-center gap-2 font-semibold tracking-tight">
      <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden>
        <rect x="3" y="2" width="14" height="18" rx="1.5" fill="white" stroke="#1c2230" strokeWidth="1.5" />
        <path d="M6 7h8M6 10h8M6 13h5" stroke="#1c2230" strokeWidth="1.3" />
        <circle cx="16" cy="16" r="4.5" fill="#2340a8" />
        <path d="M14 16l1.4 1.4L18 14.8" stroke="white" strokeWidth="1.4" fill="none" />
      </svg>
      QuoteLink
    </Link>
  );
}

export function TopBar({ children }: { children?: React.ReactNode }) {
  return (
    <div className="no-print border-b border-rule bg-desk/80">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <Wordmark />
        <div className="flex items-center gap-3 text-sm">{children}</div>
      </div>
    </div>
  );
}

export const btn = {
  primary:
    "inline-flex items-center justify-center rounded-md bg-carbon px-4 py-2 text-sm font-medium text-white hover:bg-carbon-dark disabled:opacity-50",
  secondary:
    "inline-flex items-center justify-center rounded-md border border-rule bg-paper px-4 py-2 text-sm font-medium text-ink hover:border-ink disabled:opacity-50",
  ghost: "text-sm font-medium text-carbon underline-offset-4 hover:underline",
};
