"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { btn } from "@/app/components/bits";

export function NewQuoteButton({ wsKey }: { wsKey: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <button
      className={btn.secondary}
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        const res = await fetch(`/api/w/${wsKey}/quotes`, { method: "POST" });
        if (res.ok) router.push(`/edit/${(await res.json()).editId}`);
        else setBusy(false);
      }}
    >
      {busy ? "Creating…" : "New blank quote"}
    </button>
  );
}
