"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { btn } from "@/app/components/bits";

export function ReviseButton({ editId }: { editId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <button
      className={btn.primary}
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        const res = await fetch(`/api/quotes/${editId}/revise`, { method: "POST" });
        if (res.ok) router.push(`/edit/${(await res.json()).editId}`);
        else setBusy(false);
      }}
    >
      {busy ? "Copying…" : "Revise as new quote"}
    </button>
  );
}
