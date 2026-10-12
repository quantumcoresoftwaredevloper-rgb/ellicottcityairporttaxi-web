#!/usr/bin/env bash
#
# MongoDB backup for the Ellicott City Airport Taxi API.
#
# Why this is a script and not a line in the docs: `docs/DEPLOY.md` has always
# described a nightly dump, but nothing implemented it. A backup that only
# exists as prose is not a backup — nobody notices until the day it is needed.
# This file is that implementation, and it is deliberately hard to get a green
# exit from without a real, restorable archive.
#
# Design rules, all learned the hard way:
#   * A backup on the same box is not a backup. `BACKUP_REMOTE` copies offsite.
#   * Exit 0 means "verified". An empty or truncated archive FAILS the run, so
#     cron and any alerting see a red job instead of a silent no-op. A backup
#     script that cannot fail is a backup that does not exist.
#   * Never write the Mongo URI into a log or an error message — it carries the
#     database password in production.
#
# Install (VPS):
#   install -m 0755 server/scripts/backup-mongo.sh /usr/local/bin/backup-mongo.sh
#   crontab -e
#   17 3 * * * /usr/local/bin/backup-mongo.sh >> /var/log/ellicott-backup.log 2>&1
#
# Configuration (all optional, all via environment):
#   MONGO_URI          connection string; read from ../.env when unset
#   BACKUP_DEST        directory for archives        (default /var/backups/ellicott)
#   BACKUP_DBNAME      name embedded in the filename (default ellicottaxi)
#   BACKUP_KEEP_DAYS   local retention              (default 14)
#   BACKUP_REMOTE      rclone destination           (default empty = offsite OFF)
#   BACKUP_MIN_BYTES   an archive smaller than this fails the run (default 1024)
#
# Exit codes: 0 verified · 1 configuration/preflight · 2 dump failed
#             3 archive failed verification · 4 offsite copy failed
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SERVER_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

log()  { printf '%s [backup] %s\n' "$(date -u '+%Y-%m-%dT%H:%M:%SZ')" "$*"; }
fail() { local msg="$1" code="${2:-1}"; printf '%s [backup] ERROR: %s\n' "$(date -u '+%Y-%m-%dT%H:%M:%SZ')" "$msg" >&2; exit "$code"; }

BACKUP_DEST="${BACKUP_DEST:-/var/backups/ellicott}"
BACKUP_DBNAME="${BACKUP_DBNAME:-ellicottaxi}"
BACKUP_KEEP_DAYS="${BACKUP_KEEP_DAYS:-14}"
BACKUP_REMOTE="${BACKUP_REMOTE:-}"
BACKUP_MIN_BYTES="${BACKUP_MIN_BYTES:-1024}"

# ---- resolve the connection string -------------------------------------------
# `.env` is the source of truth in production, and this script lives beside it.
# Never echo the result: it contains the password.
if [ -z "${MONGO_URI:-}" ]; then
  ENV_FILE="$SERVER_DIR/.env"
  [ -f "$ENV_FILE" ] || fail "MONGO_URI unset and no .env at $ENV_FILE" 1
  MONGO_URI="$(grep -E '^MONGO_URI=' "$ENV_FILE" | tail -1 | cut -d= -f2- | sed -E 's/[[:space:]]*#.*$//' | tr -d '\r' | sed -E 's/^[[:space:]]*//;s/[[:space:]]*$//')"
  [ -n "$MONGO_URI" ] || fail "MONGO_URI not found in $ENV_FILE" 1
  log "read MONGO_URI from $ENV_FILE"
fi

# ---- preflight ---------------------------------------------------------------
command -v mongodump >/dev/null 2>&1 || fail "mongodump not found — install mongodb-database-tools" 1
command -v gzip     >/dev/null 2>&1 || fail "gzip not found" 1

if [ ! -d "$BACKUP_DEST" ]; then
  mkdir -p "$BACKUP_DEST" 2>/dev/null || fail "cannot create $BACKUP_DEST (needs sudo on first install)" 1
fi
[ -w "$BACKUP_DEST" ] || fail "$BACKUP_DEST is not writable" 1

# Refuse to start a second run while one is in flight. Without this, a slow
# dump can overlap with the next cron tick and both write the same filenames.
#
# mkdir-based rather than `flock`, because flock is absent on macOS and this
# script has to be testable on the same machines it is written on. mkdir is
# atomic on every POSIX filesystem, so it is a correct lock everywhere.
LOCKDIR="$BACKUP_DEST/.backup.lock"
if mkdir "$LOCKDIR" 2>/dev/null; then
  trap 'rmdir "$LOCKDIR" 2>/dev/null || true' EXIT
else
  # A lock left behind by a killed run would otherwise block every future run,
  # which is the worst possible failure for a backup. Age it out.
  if [ -n "$(find "$LOCKDIR" -maxdepth 0 -mmin +${BACKUP_LOCK_MINUTES:-360} 2>/dev/null)" ]; then
    log "clearing stale lock older than ${BACKUP_LOCK_MINUTES:-360} minutes"
    rmdir "$LOCKDIR" 2>/dev/null || true
    mkdir "$LOCKDIR" 2>/dev/null || fail "could not acquire lock at $LOCKDIR" 1
    trap 'rmdir "$LOCKDIR" 2>/dev/null || true' EXIT
  else
    fail "another backup is already running (lock: $LOCKDIR)" 1
  fi
fi

STAMP="$(date -u '+%Y-%m-%d-%H%M%S')"
ARCHIVE="$BACKUP_DEST/$BACKUP_DBNAME-$STAMP.gz"
TMP_ARCHIVE="$ARCHIVE.partial"

cleanup() { rm -f "$TMP_ARCHIVE"; }
trap cleanup EXIT

log "dumping $BACKUP_DBNAME -> $(basename "$ARCHIVE")"

# --gzip writes stdout, so the partial file is used and only renamed to the
# final name AFTER verification. A crash mid-dump can therefore never leave
# something that looks like a complete backup.
if ! mongodump \
      --uri="$MONGO_URI" \
      --archive="$TMP_ARCHIVE" \
      --gzip \
      --quiet 2>/tmp/backup-mongo.err; then
  log "mongodump stderr: $(head -c 400 /tmp/backup-mongo.err 2>/dev/null || echo '(none)')"
  fail "mongodump failed — no archive was kept" 2
fi

# ---- verify before it is allowed to count as a backup -----------------------
[ -s "$TMP_ARCHIVE" ] || fail "dump produced an empty archive" 3

SIZE=$(wc -c < "$TMP_ARCHIVE" | tr -d ' ')
[ "$SIZE" -ge "$BACKUP_MIN_BYTES" ] || fail "archive is $SIZE bytes, under the $BACKUP_MIN_BYTES byte floor — refusing to keep it" 3

# `gzip -t` decompresses and checks the CRC, which is what actually proves the
# bytes are intact and restorable. A size check alone would pass a truncated file.
if ! gzip -t "$TMP_ARCHIVE" 2>/dev/null; then
  fail "archive failed gzip integrity check — refusing to keep it" 3
fi

# Structural check: prove `mongorestore` can actually PARSE this archive, with
# --dryRun so nothing is written.
#
# An earlier version of this script looked for a "__js" magic prefix, which was
# wrong: a mongodump archive has no fixed magic — it opens with a metadata
# header holding a timestamp and the collection names. That check could never
# have passed, which is exactly the kind of "verification" that silently rots.
# `gzip -t` proves the bytes are intact; --dryRun proves they are a restorable
# dump. Together they are what makes exit 0 mean something.
DRYRUN_LOG="$(mktemp)"
if ! mongorestore --uri="$MONGO_URI" --archive="$TMP_ARCHIVE" --gzip --dryRun \
      >"$DRYRUN_LOG" 2>&1; then
  log "mongorestore --dryRun rejected the archive: $(tail -3 "$DRYRUN_LOG" | tr '\n' ' ')"
  rm -f "$DRYRUN_LOG"
  fail "archive is not restorable — refusing to keep it" 3
fi
RESTORABLE="$(grep -c 'document' "$DRYRUN_LOG" 2>/dev/null || echo 0)"
rm -f "$DRYRUN_LOG"
log "archive parses cleanly (mongorestore --dryRun, $RESTORABLE summary line(s))"

mv "$TMP_ARCHIVE" "$ARCHIVE"
trap - EXIT
rmdir "$LOCKDIR" 2>/dev/null || true
log "verified $ARCHIVE ($SIZE bytes)"

# ---- retention ---------------------------------------------------------------
# Only archives this script wrote are eligible for deletion.
if [ "$BACKUP_KEEP_DAYS" -gt 0 ] 2>/dev/null; then
  # Count FIRST, then delete. `find -print -delete` cannot be used to report a
  # count: -delete implies -depth, and under -depth find prints nothing, so the
  # log silently claimed "pruned 0" while actually deleting the files. Counting
  # first also avoids `[ 0 -gt 0 ] && log ...` tripping `set -e` on the last
  # command of the block.
  STALE="$(find "$BACKUP_DEST" -maxdepth 1 -type f -name "$BACKUP_DBNAME-*.gz" \
            -mtime "+$BACKUP_KEEP_DAYS" | wc -l | tr -d ' ')"
  if [ "${STALE:-0}" -gt 0 ]; then
    find "$BACKUP_DEST" -maxdepth 1 -type f -name "$BACKUP_DBNAME-*.gz" \
      -mtime "+$BACKUP_KEEP_DAYS" -delete 2>/dev/null || true
    log "pruned $STALE archive(s) older than ${BACKUP_KEEP_DAYS}d"
  fi
fi

# ---- offsite -----------------------------------------------------------------
if [ -n "$BACKUP_REMOTE" ]; then
  command -v rclone >/dev/null 2>&1 || fail "BACKUP_REMOTE set but rclone is not installed" 4
  log "copying offsite -> $BACKUP_REMOTE"
  rclone copy "$ARCHIVE" "$BACKUP_REMOTE" --quiet || fail "offsite copy failed" 4
  log "offsite copy OK"
else
  log "offsite copy SKIPPED — set BACKUP_REMOTE (a local-only backup is not a backup)"
fi

log "DONE"
exit 0