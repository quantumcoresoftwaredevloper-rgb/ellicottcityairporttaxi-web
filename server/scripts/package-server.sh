#!/usr/bin/env bash
#
# Package the API for upload to Interserver.
#
#   ./scripts/package-server.sh
#
# Produces server/server-upload.tar.gz containing only what production needs:
# production dependencies, source, and the dotenv example. No tests, no
# node_modules, no .env (never ship a secret inside an artifact).
#
# For a VPS:  extract to /opt/ellicot, then `npm ci --omit=dev`.
# For cPanel "Setup Node.js App": upload to the app root and use the panel's own
#             dependency install, then set the env vars in the panel UI.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT="$ROOT/server-upload.tar.gz"

echo "==> staging production files"
STAGE="$(mktemp -d)"
trap 'rm -rf "$STAGE"' EXIT

mkdir -p "$STAGE/server"
cd "$ROOT"

# Source + config, minus anything that is not needed to run in production.
for item in src app.js package.json package-lock.json .env.example; do
  [ -e "$item" ] || { echo "error: missing $item" >&2; exit 1; }
  cp -R "$item" "$STAGE/server/"
done

# Tests and the coverage/dev tooling are not needed at runtime and would ship
# mongodb-memory-server + its mongod binary in the archive.
rm -rf "$STAGE/server/tests"
rm -f  "$STAGE/server/vitest.config.js"

echo "==> sanity checks"
[ -f "$STAGE/server/app.js" ] || { echo "error: app.js missing (Passenger entry)" >&2; exit 1; }
[ -f "$STAGE/server/src/index.js" ] || { echo "error: src/index.js missing" >&2; exit 1; }

# A .env must never ride along inside an artifact.
if [ -e "$STAGE/server/.env" ]; then
  echo "error: a .env is staged in the package — refusing to continue" >&2
  exit 1
fi

# Every runtime dependency must be declared, or `npm ci --omit=dev` on the
# server will produce a broken install.
node -e '
  const pkg = require("./package.json");
  const missing = Object.keys(pkg.dependencies || {})
    .filter((d) => !require("fs").existsSync("node_modules/" + d));
  if (missing.length) {
    console.error("error: not installed locally: " + missing.join(", "));
    process.exit(1);
  }
  console.log("    " + Object.keys(pkg.dependencies).length + " runtime deps declared and installed");
'

echo "==> packaging"
rm -f "$OUT"
tar -czf "$OUT" -C "$STAGE" server

echo
echo "Built: $OUT  ($(du -h "$OUT" | cut -f1))"
cat <<'TXT'

On the server:
  1. extract, then:  npm ci --omit=dev
  2. create .env from .env.example and set at minimum:
       NODE_ENV=production
       MONGO_URI=mongodb://127.0.0.1:27017/ellicottaxi
       JWT_ACCESS_SECRET=<random 32+ chars>
       CLIENT_ORIGIN=https://ellicottcityairporttaxi.com
       TRUST_PROXY=true
  3. bound the Mongo cache and the Node heap so they do not fight over RAM:
       --wiredTigerCacheSizeGB 2
       --max-old-space-size=1024
  4. assertEnv() refuses to boot if any of the above is missing or weak.
TXT