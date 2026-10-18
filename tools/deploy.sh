#!/usr/bin/env bash
# Copy the pages to a web server (or any folder) with rsync.
#
#   tools/deploy.sh --target HOST:/PATH/            Show what would be copied (a dry run). Changes nothing.
#   tools/deploy.sh --target HOST:/PATH/ --go       Really copy the files.
#
# Where to copy to, in this order (first one found wins):
#   1. --target USER@HOST:/path/to/folder/   (or a local folder, to try it out)
#   2. the DEPLOY_TARGET environment variable
#   3. a line  DEPLOY_TARGET=USER@HOST:/path/to/folder/  in a file named .deploy.conf in the
#      repository folder (it is in .gitignore, so it is never committed)
# Optional, same three places:  --url / DEPLOY_URL  = the public address, checked after a real copy
#                               --ssh / DEPLOY_SSH  = extra ssh options, for example "-p 2222 -i ~/.ssh/mykey"
#
# There is no built-in host. Only the files a visitor needs are copied; tests, tools, todo notes,
# AGENTS.md, and git data stay behind. Nothing on the server is deleted.
# The site is public on purpose (a Scout's family may open it), so it has no login. Use https:
# the share menu on an iPhone only works on https pages.

set -euo pipefail

cd "$(dirname "$0")/.."

usage() {
  sed -n '2,/^$/p' "$0" | sed 's/^# \{0,1\}//' >&2
  exit "${1:-2}"
}

TARGET="${DEPLOY_TARGET:-}"
URL="${DEPLOY_URL:-}"
SSH_OPTS="${DEPLOY_SSH:-}"
GO=""

# Settings file: only plain NAME=value lines for the three names below are read (it is never run as code).
if [ -f .deploy.conf ]; then
  while IFS='=' read -r name value; do
    value="${value%\"}"; value="${value#\"}"
    case "$name" in
      DEPLOY_TARGET) [ -n "$TARGET" ] || TARGET="$value" ;;
      DEPLOY_URL) [ -n "$URL" ] || URL="$value" ;;
      DEPLOY_SSH) [ -n "$SSH_OPTS" ] || SSH_OPTS="$value" ;;
    esac
  done < <(grep -E '^(DEPLOY_TARGET|DEPLOY_URL|DEPLOY_SSH)=' .deploy.conf || true)
fi

while [ $# -gt 0 ]; do
  case "$1" in
    --go) GO=1 ;;
    --target) TARGET="${2:?--target needs a value}"; shift ;;
    --url) URL="${2:?--url needs a value}"; shift ;;
    --ssh) SSH_OPTS="${2:?--ssh needs a value}"; shift ;;
    -h|--help) usage 0 ;;
    *) echo "Unknown option: $1" >&2; usage ;;
  esac
  shift
done

if [ -z "$TARGET" ]; then
  echo "Say where to copy the files: --target USER@HOST:/path/to/folder/" >&2
  echo >&2
  usage
fi
# Always end in a slash so rsync copies into the folder.
case "$TARGET" in */) ;; *) TARGET="$TARGET/" ;; esac
# A bare "host:" or "/" would copy into the top of the account or disk.
case "$TARGET" in
  /|*:|*:/) echo "That target is the top of the account or disk. Give a specific folder, for example host:/var/www/html/eagle/" >&2; exit 2 ;;
esac

MODE=(--dry-run)
[ -n "$GO" ] && MODE=()

# 1. Refuse to publish uncommitted work, so the site always matches a commit.
if [ -n "$(git status --porcelain)" ]; then
  echo "There are uncommitted changes. Commit them first, then run this again." >&2
  git status --short >&2
  exit 1
fi

# 2. Refuse if a personal file somehow sits in a folder we copy.
if find index.html EagleWorkbook*.html FillOfficialPDF.html BackupFromPDF.html lib docs \
     \( -name '*.json' -o -name '*.pdf' -o -name 'client_secret*' \) 2>/dev/null | grep -q .; then
  echo "A .json, .pdf, or client_secret file is in a folder that would be published. Remove it first." >&2
  exit 1
fi

# 3. Run the quick tests.
LOG="$(mktemp -t eagle-deploy-tests.XXXXXX)"
trap 'rm -f "$LOG"' EXIT
node tests/run-tests.cjs >"$LOG" 2>&1 || {
  tail -n 20 "$LOG" >&2
  echo "Tests failed. Not deploying." >&2
  exit 1
}

# 4. Copy. --relative keeps the folder layout. Files are readable by everyone, writable only by you.
FILES=(
  index.html EagleWorkbook-guided.html EagleWorkbook.html FillOfficialPDF.html BackupFromPDF.html
  README.md INSTALL.md LICENSE .htaccess
  lib/ vendor/ docs/
)
RSYNC_SSH=()
[ -n "$SSH_OPTS" ] && RSYNC_SSH=(-e "ssh $SSH_OPTS")
echo "Target: $TARGET"
[ -z "$GO" ] && echo "(Dry run. Add --go to copy for real.)"
# (${arr[@]+"${arr[@]}"} keeps macOS's old bash from failing on an empty list.)
rsync -avh --relative --itemize-changes ${MODE[@]+"${MODE[@]}"} ${RSYNC_SSH[@]+"${RSYNC_SSH[@]}"} \
  --chmod=D755,F644 \
  --exclude='.DS_Store' \
  "${FILES[@]}" "$TARGET"

# 5. After a real copy, fetch the home page as an anonymous visitor.
if [ -n "$GO" ] && [ -n "$URL" ]; then
  case "$URL" in
    https://*|http://*)
      code=$(curl -s -o /dev/null -m 15 -w '%{http_code}' "$URL" || true)
      echo "Home page $URL answered HTTP ${code:-none} (expect 200)."
      cache=$(curl -s -I -m 15 "$URL" | tr -d '\r' | grep -i '^cache-control:' || true)
      if echo "$cache" | grep -qi 'no-cache\|no-store\|max-age=0'; then
        echo "Caching: $cache (good: browsers will check for new versions)."
      else
        echo "WARNING: the server did not send Cache-Control: no-cache for the home page (${cache:-no Cache-Control header at all})."
        echo "  Browsers may keep old pages and scripts, and mix old and new versions. The .htaccess file just copied"
        echo "  needs Apache's mod_headers and AllowOverride FileInfo; other servers: see Caching in INSTALL.md."
      fi
      case "$URL" in http://*) echo "Note: this address is not https, so the iPhone share menu will not work there." ;; esac
      ;;
    *) echo "Skipping the address check: --url must start with http:// or https://" ;;
  esac
fi
