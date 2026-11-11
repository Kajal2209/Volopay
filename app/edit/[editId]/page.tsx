import Link from "next/link";
import { cookies, headers } from "next/headers";
import { notFound } from "next/navigation";
import { getQuoteByEditId, isExpired } from "@/lib/store";
import { WS_COOKIE } from "@/lib/http";
import { DEMO_KEY } from "@/lib/seed";
import { baseUrlFromHeaders, shareUrl } from "@/lib/urls";
import { formatDateTime } from "@/lib/format";
import { QuoteDocument } from "@/app/components/QuoteDocument";
import { Stamp, StatusBadge, TopBar, btn } from "@/app/components/bits";
import { UrlField } from "@/app/components/CopyButton";
import { Editor } from "./Editor";
import { ReviseButton } from "./ReviseButton";

export const dynamic = "force-dynamic";

export default async function EditPage({ params }: { params: Promise<{ editId: string }> }) {
  const { editId } = await params;
  const quote = await getQuoteByEditId(editId);
  if (!quote) notFound();
  const base = baseUrlFromHeaders(await headers());
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { workspaceKey, ...editorQuote } = quote;
  const clientUrl = shareUrl(base, quote.shareId);
  // Only link to the workspace for its owner (cookie) or the public demo:
  // an edit link alone must not reveal the whole workspace.
  const ownsWorkspace =
    quote.workspaceKey === DEMO_KEY || (await cookies()).get(WS_COOKIE)?.value === quote.workspaceKey;
  const back = ownsWorkspace ? (
    <Link className={btn.ghost} href={`/w/${quote.workspaceKey}`}>
      All quotes
    </Link>
  ) : null;

  if (quote.status === "accepted") {
    return (
      <main>
        <TopBar>{back}</TopBar>
        <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
          <div className="no-print mb-6 rounded-lg border border-ok/30 bg-ok-soft p-4 text-ok">
            <p className="font-medium">
              Accepted by {quote.acceptedBy?.name} on {quote.acceptedBy && formatDateTime(quote.acceptedBy.at)}.
            </p>
            <p className="mt-1 text-sm">
              This quote is locked so it always matches what your client agreed to. Need changes? Make a new version.
            </p>
            <div className="mt-3">
              <ReviseButton editId={editId} />
            </div>
          </div>
          <QuoteDocument
            quote={quote}
            stamp={
              quote.acceptedBy && (
                <Stamp kind="accepted" name={quote.acceptedBy.name} date={formatDateTime(quote.acceptedBy.at).split(",")[0]} />
              )
            }
          />
          <div className="no-print mt-6">
            <p className="mb-2 text-sm font-medium">Client link</p>
            <UrlField url={clientUrl} />
          </div>
        </div>
      </main>
    );
  }

  return (
    <main>
      <TopBar>
        {back}
        <StatusBadge status={quote.status} />
      </TopBar>
      <Editor initial={editorQuote} clientUrl={clientUrl} expired={isExpired(quote)} />
    </main>
  );
}
