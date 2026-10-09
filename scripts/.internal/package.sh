#!/usr/bin/env bash
# Builds the E2 submission package into .artifacts/submission/:
#   documentation.pdf       docs/documentation.md rendered with the ERD embedded (at most 8 pages)
#   pomiary-zai-26z.zip     the repository files, tracked plus new-but-not-ignored (working-tree versions) plus the PDF
# Needs nothing installed beyond what the repo already uses: npx (marked, like lighthouse.sh),
# Playwright's Chromium, zip, pdfinfo (poppler) and git (read-only: `git ls-files`).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"
OUT="$ROOT/.artifacts/submission"
BUILD="$OUT/build"
MAX_PAGES=8
ZIP_NAME="pomiary-zai-26z.zip"

for tool in npx zip unzip pdfinfo git; do
    command -v "$tool" >/dev/null || { echo "Missing tool: $tool" >&2; exit 1; }
done
CHROME="$(find "$HOME/.cache/ms-playwright" -path '*/chromium-*/chrome-linux*/chrome' -type f 2>/dev/null | sort -V | tail -n 1)"
if [ -z "$CHROME" ]; then
    echo "No Playwright Chromium found: run 'cd pomiary_web && pnpm exec playwright install chromium'." >&2
    exit 1
fi

rm -rf "$OUT"
mkdir -p "$BUILD"

# --- the PDF: Markdown -> HTML -> headless Chromium -------------------------------------
cp docs/erd.svg "$BUILD/erd.svg"
{
    cat <<'HTML'
<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>Pomiary: documentation</title>
<style>
  @page { size: A4; margin: 14mm 15mm; }
  body { font: 9.5pt/1.38 "DejaVu Sans", Arial, sans-serif; color: #111; }
  h1 { font-size: 16pt; margin: 0 0 6pt; }
  h2 { font-size: 12.5pt; margin: 12pt 0 4pt; border-bottom: 1px solid #999; }
  h3 { font-size: 10.5pt; margin: 8pt 0 3pt; }
  p, ul, ol { margin: 3pt 0; }
  code { font: 8.3pt "DejaVu Sans Mono", monospace; background: #f1f1f1; padding: 0 1.5pt; }
  pre { font: 7.8pt/1.3 "DejaVu Sans Mono", monospace; background: #f1f1f1; padding: 4pt; white-space: pre-wrap; margin: 4pt 0; }
  pre code { background: none; padding: 0; font-size: inherit; }
  table { border-collapse: collapse; margin: 4pt 0; width: 100%; font-size: 8.5pt; }
  th, td { border: 1px solid #aaa; padding: 2pt 4pt; text-align: left; vertical-align: top; }
  th { background: #e6e6e6; }
  blockquote { margin: 4pt 0; padding-left: 8pt; border-left: 3px solid #bbb; color: #333; }
  img { max-width: 100%; max-height: 120mm; display: block; margin: 4pt auto; }
  tr, pre, img { break-inside: avoid; }
</style></head><body>
HTML
    npx --yes marked@15.0.12 -i docs/documentation.md --gfm
    echo '</body></html>'
} >"$BUILD/documentation.html"

"$CHROME" --headless=new --no-sandbox --disable-gpu --no-pdf-header-footer \
    --print-to-pdf="$OUT/documentation.pdf" "file://$BUILD/documentation.html" 2>/dev/null
[ -s "$OUT/documentation.pdf" ] || { echo "FAIL: the PDF was not produced" >&2; exit 1; }

pages="$(pdfinfo "$OUT/documentation.pdf" | awk '/^Pages:/ {print $2}')"
echo "documentation.pdf: $pages pages"
if [ "$pages" -gt "$MAX_PAGES" ]; then
    echo "FAIL: $pages pages, the specification allows at most $MAX_PAGES" >&2
    exit 1
fi

# --- the ZIP: tracked files + the PDF ----------------------------------------------------
list="$BUILD/files.txt"
git ls-files --cached --others --exclude-standard | sort -u | while IFS= read -r f; do [ -e "$f" ] && printf "%s\n" "$f"; done | grep -v "^\.artifacts/" >"$list"

# A real secret file must never be tracked; the .example files are the point.
bad="$(grep -E '(^|/)\.env(\.[^/]*)?$' "$list" | grep -v -E '\.(example|base)$' || true)"
if [ -n "$bad" ]; then
    echo "FAIL: tracked file(s) look like secrets:" >&2
    echo "$bad" >&2
    exit 1
fi
if grep -E '(^|/)(node_modules|\.venv|\.artifacts|\.git)/' "$list" >&2; then
    echo "FAIL: dependency or tool directories are tracked" >&2
    exit 1
fi
grep -q -E '(^|/)\.env\.example$' "$list" || { echo "FAIL: no .env.example in the archive" >&2; exit 1; }
grep -q '^docs/erd.svg$' "$list" || { echo "FAIL: docs/erd.svg missing" >&2; exit 1; }
grep -q '^pomiary_server/pomiary_server/migrations/.*\.sql$' "$list" || { echo "FAIL: no migrations" >&2; exit 1; }
grep -q '^pomiary_generator/' "$list" || { echo "FAIL: no generator" >&2; exit 1; }

zip -q "$OUT/$ZIP_NAME" -@ <"$list"
(cd "$OUT" && zip -q "$ZIP_NAME" documentation.pdf)

if unzip -Z1 "$OUT/$ZIP_NAME" | grep -q -E '(^|/)node_modules/'; then
    echo "FAIL: node_modules in the ZIP" >&2
    exit 1
fi
count="$(unzip -Z1 "$OUT/$ZIP_NAME" | wc -l)"
size="$(du -h "$OUT/$ZIP_NAME" | cut -f1)"
echo "$ZIP_NAME: $count files, $size"
rm -rf "$BUILD"
echo "OK: $OUT"
