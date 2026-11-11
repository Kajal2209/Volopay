"use client";

import Link from "next/link";
import { useState } from "react";
import { btn } from "./bits";
import { UrlField } from "./CopyButton";

interface Ws {
  key: string;
  mcpUrl: string;
  dashboardUrl: string;
}

export function GetWorkspace({ initial }: { initial: Ws | null }) {
  const [ws, setWs] = useState<Ws | null>(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function create() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/workspaces", { method: "POST" });
      if (!res.ok) throw new Error();
      setWs(await res.json());
    } catch {
      setError("Couldn't create a workspace. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  if (!ws)
    return (
      <div>
        <button className={btn.primary} onClick={create} disabled={busy}>
          {busy ? "Creating…" : "Get my workspace"}
        </button>
        <p className="mt-2 text-sm text-muted">Free, no sign-up. You get a private connector link for your Claude.</p>
        {error && <p className="mt-2 text-sm text-decline">{error}</p>}
      </div>
    );

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium">Your connector link</p>
      <UrlField url={ws.mcpUrl} label="Copy link" />
      <p className="text-sm text-muted">
        Keep this private. Anyone with it can create quotes in your workspace.{" "}
        <Link className={btn.ghost} href={`/w/${ws.key}`}>
          Open my dashboard
        </Link>
      </p>
    </div>
  );
}
