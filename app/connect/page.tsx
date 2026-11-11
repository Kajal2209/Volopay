import type { Metadata } from "next";
import Link from "next/link";
import { cookies, headers } from "next/headers";
import { getWorkspace } from "@/lib/store";
import { WS_COOKIE } from "@/lib/http";
import { baseUrlFromHeaders, mcpUrl } from "@/lib/urls";
import { TopBar, btn } from "@/app/components/bits";
import { ConnectGuide } from "./ConnectGuide";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Connect Claude – QuoteLink" };

export default async function ConnectPage() {
  const base = baseUrlFromHeaders(await headers());
  const key = (await cookies()).get(WS_COOKIE)?.value;
  const ws = key ? await getWorkspace(key) : null;

  return (
    <main>
      <TopBar>
        {ws && (
          <Link className={btn.ghost} href={`/w/${ws.key}`}>
            My dashboard
          </Link>
        )}
      </TopBar>
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Connect QuoteLink to your Claude</h1>
        <p className="mt-3 max-w-2xl text-lg text-muted">
          QuoteLink works inside the Claude you already pay for, whether that&rsquo;s on the web, the desktop app, or
          Claude Code. Claude writes the quote; QuoteLink saves it, hosts it, and gets it accepted.
        </p>
        <div className="mt-10">
          <ConnectGuide initial={ws ? { key: ws.key, mcpUrl: mcpUrl(base, ws.key) } : null} />
        </div>
      </div>
    </main>
  );
}
