"use client";

import { useState } from "react";
import { btn } from "./bits";

export function CopyButton({
  text,
  label = "Copy",
  onCopied,
  variant = "secondary",
}: {
  text: string;
  label?: string;
  onCopied?: () => void;
  variant?: "primary" | "secondary";
}) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className={btn[variant]}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
        } catch {
          window.prompt("Copy this link:", text);
        }
        setDone(true);
        onCopied?.();
        setTimeout(() => setDone(false), 1800);
      }}
    >
      {done ? "Copied" : label}
    </button>
  );
}

export function UrlField({ url, label = "Copy" }: { url: string; label?: string }) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      <input
        readOnly
        value={url}
        onFocus={(e) => e.currentTarget.select()}
        className="money min-w-0 flex-1 rounded-md border border-rule bg-paper px-3 py-2 text-sm"
        aria-label="Link"
      />
      <CopyButton text={url} label={label} variant="primary" />
    </div>
  );
}
