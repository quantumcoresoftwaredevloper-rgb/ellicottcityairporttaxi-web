#!/usr/bin/env bash
#
# Restore the API database from a backup archive.
#
# A backup you have never restored is a hypothesis, not a backup. This script
# exists so a restore can be rehearsed before it is ever needed for real.
#
# HOW IT TARGETS THE DATABASE — this is the part that is easy to get wrong:
# `mongorestore --nsInclude="db.coll"` writes to the database named IN THE
# NAMESPACE, not the database in the --uri. So the target mongod comes from the
# URI, and the database name always comes from the archive. Two consequences:
#
#   drill  : point --target-uri at a THROWAWAY mongod. It will gain an
#            `ellicottaxi` database, but on the scratch instance. Production is
#            untouched.
#   in-place: point at the real URI. `ellicottaxi` is dropped and replaced.
#
# `--nsFrom`/`--nsTo` are deliberately NOT used. On mongodb-database-tools
# 100.14 they restore 0 documents against an archive, which looks like success;
# the post-restore document check below is what catches that.
#
# Usage:
#   restore-mongo.sh                                  # drill vs the newest archive (needs --target-uri)
#   restore-mongo.sh /path/to/archive.gz --target-uri mongodb://127.0.0.1:27018
#   restore-mongo.sh --in-place                       # REAL restore over the live database
#
# Environment:
#   MONGO_URI         source/credential string; read from ../.env when unset
#   BACKUP_DEST       where archives are looked for (default /var/backups/ellicott)
#   BACKUP_DBNAME     database name inside the archives (default ellicottaxi)
#
# Exit codes: 0 ok · 1 configuration · 2 archive unreadable
#             3 restore produced no data · 4 target safety check failed
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SERVER_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

log()  { printf '%s [restore] %s\n' "$(date -u '+%Y-%m-%dT%H:%M:%SZ')" "$*"; }
fail() { local msg="$1" code="${2:-1}"; printf '%s [restore] ERROR: %s\n' "$(date -u '+%Y-%m-%dT%H:%M:%SZ')" "$msg" >&2; exit "$code"; }

BACKUP_DEST="${BACKUP_DEST:-/var/backups/ellicott}"
BACKUP_DBNAME="${BACKUP_DBNAME:-ellicottaxi}"

IN_PLACE=0
ARCHIVE=""
TARGET_URI=""

while [ $# -gt 0 ]; do
  case "$1" in
    --in-place)   IN_PLACE=1; shift ;;
    --target-uri) TARGET_URI="${2:-}"; shift 2 ;;
    -h|--help)    sed -n '2,28p' "$0"; exit 0 ;;
    -*)           fail "unknown option: $1" 1 ;;
    *)            ARCHIVE="$1"; shift ;;
  esac
done

for bin in mongorestore mongosh; do
  command -v "$bin" >/dev/null 2>&1 || fail "$bin not found — install mongodb-database-tools / mongosh" 1
done

# ---- source URI: where the credentials and the live database come from ------
if [ -z "${MONGO_URI:-}" ]; then
  ENV_FILE="$SERVER_DIR/.env"
  [ -f "$ENV_FILE" ] || fail "MONGO_URI unset and no .env at $ENV_FILE" 1
  MONGO_URI="$(grep -E '^MONGO_URI=' "$ENV_FILE" | tail -1 | cut -d= -f2- | sed -E 's/[[:space:]]*#.*$//' | tr -d '\r' | sed -E 's/^[[:space:]]*//;s/[[:space:]]*$//')"
  [ -n "$MONGO_URI" ] || fail "MONGO_URI not found in $ENV_FILE" 1
fi

# ---- pick the archive --------------------------------------------------------
if [ -z "$ARCHIVE" ]; then
  ARCHIVE="$(ls -1t "$BACKUP_DEST"/"$BACKUP_DBNAME"-*.gz 2>/dev/null | head -1 || true)"
  [ -n "$ARCHIVE" ] || fail "no archives in $BACKUP_DEST — run backup-mongo.sh first" 1
fi
[ -f "$ARCHIVE" ] || fail "archive not found: $ARCHIVE" 1

gzip -t "$ARCHIVE" 2>/dev/null || fail "archive failed gzip integrity check: $ARCHIVE" 2
log "archive OK: $(basename "$ARCHIVE") ($(wc -c < "$ARCHIVE" | tr -d ' ') bytes)"

# ---- choose the target mongod ------------------------------------------------
if [ "$IN_PLACE" -eq 1 ]; then
  if [ -n "$TARGET_URI" ]; then
    fail "--in-place and --target-uri are mutually exclusive" 1
  fi
  RESTORE_URI="$MONGO_URI"
  log "IN-PLACE MODE on the live instance — database '$BACKUP_DBNAME' WILL BE DROPPED AND REPLACED."
  printf "Type the database name to confirm: "
  read -r CONFIRM
  [ "$CONFIRM" = "$BACKUP_DBNAME" ] || fail "confirmation did not match '$BACKUP_DBNAME' — aborting" 4
else
  [ -n "$TARGET_URI" ] || fail "DRILL MODE needs --target-uri pointing at a THROWAWAY mongod, e.g. mongodb://127.0.0.1:27018. Refusing to guess." 1
  RESTORE_URI="$TARGET_URI"
  # The safety property worth enforcing: a drill must not be able to touch the
  # live instance even if someone fat-fingers the URI.
  LIVE_HOST="$(printf '%s' "$MONGO_URI" | sed -E 's#^mongodb(\+srv)?://##; s#/.*$##')"
  DRILL_HOST="$(printf '%s' "$TARGET_URI"  | sed -E 's#^mongodb(\+srv)?://##; s#/.*$##')"
  [ "$LIVE_HOST" != "$DRILL_HOST" ] || fail "--target-uri resolves to the same host as MONGO_URI ($LIVE_HOST) — a drill must target an isolated instance" 4
  log "DRILL MODE -> isolated instance at $DRILL_HOST (creates '$BACKUP_DBNAME' THERE ONLY)"
fi

# ---- restore -----------------------------------------------------------------
# --nsInclude carries the database name from the archive. The target mongod
# comes from RESTORE_URI. See the header for why this split matters.
if ! mongorestore \
      --uri="$RESTORE_URI" \
      --archive="$ARCHIVE" \
      --gzip \
      --nsInclude="$BACKUP_DBNAME.*" \
      --drop; then
  fail "mongorestore failed" 3
fi

# ---- prove data actually landed ---------------------------------------------
# mongorestore 100.14 can exit 0 having written nothing, so this check is the
# only thing standing between a silent no-op and a false "restored OK".
COUNTS="$(mongosh --quiet "$RESTORE_URI" --eval "
  const d = db.getSiblingDB('$BACKUP_DBNAME');
  d.getCollectionNames().filter(c => !c.startsWith('system.'))
   .map(c => ({ c, n: d.getCollection(c).countDocuments({}) }))
   .filter(x => x.n > 0).sort((a,b) => b.n - a.n)
   .map(x => x.c + '=' + x.n).join(' ');
" 2>/dev/null || true)"

[ -n "$COUNTS" ] || fail "mongorestore reported success but '$BACKUP_DBNAME' on the target has no documents — treat this archive as unusable" 3

log "restored: $COUNTS"
log "DONE"
exit 0