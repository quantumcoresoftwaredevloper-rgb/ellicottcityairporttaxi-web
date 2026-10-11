#!/usr/bin/env bash
#
# Build the client and package it for upload to Interserver.
#
#   ./scripts/build-interserver.sh --same-origin
#   ./scripts/build-interserver.sh https://api.example.com
#
# VITE_API_URL is inlined by Vite AT BUILD TIME, so it is baked in here — it
# cannot be set on the server afterwards. Changing the API host means re-running
# this script and re-uploading the zip.
#
# Output: client/dist-interserver.zip — upload, unzip into public_html/.
#
# --same-origin (recommended for a VPS): leaves VITE_API_URL empty so the client
# calls /api on its own domain and Nginx proxies it to the Node process. One
# origin, so there is no CORS configuration at all.
#
# An explicit origin (cPanel "Setup Node.js App" on its own subdomain): bakes
# that host in, and CLIENT_ORIGIN must be set to the site's origin on the API.

set -euo pipefail

MODE="${1:-}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DIST="$ROOT/dist"
OUT="$ROOT/dist-interserver.zip"

if [ "$MODE" = "--same-origin" ]; then
  API_URL=""
elif [ -z "$MODE" ]; then
  echo "usage:" >&2
  echo "  ./scripts/build-interserver.sh --same-origin" >&2
  echo "  ./scripts/build-interserver.sh https://api.example.com" >&2
  exit 1
else
  API_URL="$MODE"
  # Reject a value that is clearly not an absolute origin — a relative path or a
  # trailing slash would produce a broken app at runtime, not a build error.
  case "$API_URL" in
    https://*|http://*) ;;
    *) echo "error: API URL must start with http:// or https:// (got '$API_URL')" >&2; exit 1 ;;
  esac
  if [ "${API_URL%/}" != "$API_URL" ]; then
    echo "error: API URL must not have a trailing slash (got '$API_URL')" >&2
    exit 1
  fi
fi

echo "==> building client (${MODE:-https origin: $API_URL})"
cd "$ROOT"
# An empty VITE_API_URL is meaningful: api.js then falls back to '/api' on the
# same origin, which is what --same-origin wants.
VITE_API_URL="$API_URL" npm run build

echo "==> verifying the build"
[ -f "$DIST/index.html" ] || { echo "error: dist/index.html missing" >&2; exit 1; }
[ -f "$DIST/.htaccess" ] || {
  echo "error: dist/.htaccess missing — SPA deep links will 404." >&2
  echo "       Is client/public/.htaccess still present?" >&2
  exit 1
}

if [ -n "$API_URL" ] && ! grep -rqF "$API_URL" "$DIST/assets"; then
  echo "warning: '$API_URL' not found in dist/assets — the client may still be" >&2
  echo "         pointing at a stale API. Check dist/assets/*.js." >&2
fi

echo "==> packaging"
rm -f "$OUT"
( cd "$DIST" && zip -rq "$OUT" . )

echo
echo "Built: $OUT  ($(du -h "$OUT" | cut -f1))"
if [ -z "$API_URL" ]; then
cat <<'TXT'

Same-origin build. Upload to public_html/ and proxy /api on the server:
  1. cPanel -> File Manager -> public_html
  2. upload dist-interserver.zip, then Extract it (overwrite existing files)
  3. confirm public_html/.htaccess exists and public_html/index.html is at the root
  4. point /api at the Node app — no CLIENT_ORIGIN/CORS needed, same origin
TXT
else
cat <<'TXT'

Cross-origin build (API on its own subdomain). Upload to public_html/:
  1. cPanel -> File Manager -> public_html
  2. upload dist-interserver.zip, then Extract it (overwrite existing files)
  3. confirm public_html/.htaccess exists and public_html/index.html is at the root
  4. on the API, set CLIENT_ORIGIN to this site's origin (single origin, no comma)
  5. cPanel -> Domains -> force HTTPS redirect ON once the cert is issued
TXT
fi