#!/usr/bin/env bash
# End-to-end smoke test: ./scripts/smoke.sh https://your-app.example
set -euo pipefail
B="${1:-http://localhost:3000}"
mcp() { curl -sf -X POST "$B/api/mcp?ws=$WS" -H 'content-type: application/json' -H 'accept: application/json, text/event-stream' -d "$1"; }
json() { python3 -c "import sys,json; d=json.load(sys.stdin); print($1)"; }

WS=$(curl -sf -X POST "$B/api/workspaces" | json 'd["key"]'); echo "workspace: $WS"
OUT=$(mcp '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"create_quote","arguments":{"title":"Brand identity for Nimbus Labs","from":{"name":"Northwind Studio"},"client":{"name":"Kabir Shah","company":"Nimbus Labs"},"currency":"inr","items":[{"description":"Logo design, 3 concepts","quantity":1,"unitPrice":"35000"},{"description":"Brand guidelines PDF","unitPrice":15000}],"taxPercent":18,"timeline":"3 weeks","terms":"50% upfront","validUntil":"2030-12-01"}}}' | json 'd["result"]["content"][0]["text"]')
echo "$OUT"
EDIT=$(echo "$OUT" | sed -n 's/^editId: //p'); SHARE=$(echo "$OUT" | grep -o '/q/[A-Za-z0-9_-]*' | head -1 | cut -c4-)
for p in / "/w/$WS" "/edit/$EDIT" "/q/$SHARE" /w/demo; do echo "GET $p -> $(curl -s -o /dev/null -w '%{http_code}' "$B$p")"; done
echo "edit price -> $(curl -sf -X PUT "$B/api/quotes/$EDIT" -H 'content-type: application/json' -d '{"items":[{"description":"Logo design, 3 concepts","unitPrice":40000},{"description":"Brand guidelines PDF","unitPrice":15000}]}' | json 'd["totals"]')"
echo "send -> $(curl -sf -X POST "$B/api/quotes/$EDIT/send")"
echo "editor previews -> $(curl -sf -X POST -H "cookie: ql_editor_$EDIT=1" "$B/api/q/$SHARE/view")"
echo "client views -> $(curl -sf -X POST "$B/api/q/$SHARE/view")"
echo "client accepts -> $(curl -sf -X POST "$B/api/q/$SHARE/accept" -H 'content-type: application/json' -d '{"name":"Kabir Shah"}' | json 'd["quote"]["status"], d["quote"]["acceptedBy"]["name"], "editId" in d["quote"]')"
UPD=$(mcp '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"update_quote","arguments":{"editId":"'"$EDIT"'","notes":"x"}}}')
echo "claude update on accepted -> $(echo "$UPD" | json 'd["result"].get("isError"), d["result"]["content"][0]["text"][:60]')"
echo "editor cookie set -> $(curl -s -D - -o /dev/null "$B/edit/$EDIT" | grep -ic "set-cookie: ql_editor_$EDIT")"
echo "$WS $EDIT $SHARE" > "${IDS_FILE:-/dev/null}"
