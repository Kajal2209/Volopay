# QuoteLink

**Your Claude writes the quote. QuoteLink gets it signed.**

Freelancers and small agencies ask their own Claude for a quote. Claude writes the scope, line items, prices and terms, and sends them to QuoteLink over MCP. The quote shows up in the freelancer's dashboard. They edit the numbers and send the client one link. The client opens it, types their name and clicks **Accept**. The freelancer sees the quote move through Sent, then Viewed, then Accepted.

QuoteLink has **no AI inside**: no model API keys and no AI SDKs. Claude does the writing on the customer's own plan. QuoteLink stores the quote, lets the freelancer edit it, hosts it for the client and tracks its status.

## Connect it to Claude

1. Open the app and click **Get my workspace**. Copy your connector link (`https://<app>/api/mcp?ws=<key>`).
2. In Claude, go to **Settings → Connectors → Add custom connector**. Name it *QuoteLink* and paste the link.
3. In a chat, enable QuoteLink and ask for something like: *"Create a quote for Acme Corp: a 5-page marketing website, 2 revision rounds, 50% upfront, in INR, valid for 14 days."*

**Claude Code:** run this once, then check it with `/mcp` inside `claude`:

```bash
claude mcp add --transport http --scope user quotelink "https://<app>/api/mcp?ws=<key>"
```

The full guide, with each visitor's own link filled in, is at `/connect` in the app.

### MCP tools

| Tool | What it does |
|---|---|
| `create_quote` | Creates a quote and returns the private edit link and the client link |
| `list_quotes` | Lists quotes in the workspace with their totals and statuses |
| `get_quote` | Returns one quote in full, e.g. to check "did Acme accept?" |
| `update_quote` | Changes fields on a quote (accepted quotes are locked) |
| `revise_quote` | Copies a quote into a new draft with new links |

## How it works

- **Next.js 16** (App Router). One server handles the pages, the JSON API and the MCP endpoint (`/api/mcp`, streamable HTTP, stateless).
- **No database.** Everything is in one JSON file, `${DATA_DIR}/quotes.json`. Writes are serialised in-process and written atomically (temp file, then rename).
- **Workspaces without login.** Each visitor gets a random workspace key, which goes in their connector link and their dashboard URL. Each quote has a private `editId` and a public `shareId`. The client page never exposes the edit link.
- **Status rules.** Accepted quotes are locked (use "Revise as new quote"). Editing a declined quote moves it back to Sent. When the editor previews their own quote, it doesn't count as a client view. Expired quotes can't be accepted.

## Run locally

```bash
npm install
npm run dev          # http://localhost:3000
npm test             # vitest: store rules, API, MCP endpoint
./scripts/smoke.sh http://localhost:3000   # end-to-end HTTP flow
```

## Deploy (Railway)

1. Create a service from this repo. Railway detects Next.js and runs `npm run build` then `npm start`.
2. Add a **Volume** mounted at `/data`.
3. Set these variables: `DATA_DIR=/data` and `PUBLIC_BASE_URL=https://<your-domain>`.
4. Generate a public domain and redeploy.
