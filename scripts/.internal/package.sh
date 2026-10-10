#!/usr/bin/env bash
# Builds the submission packages into .artifacts/submissions/<stage>/:
#   e1/form.md              what the E1 form on Leia asks for: the API address, the admin account, the repository
#   e2/form.md              the same for E2, plus the application address, the CI link and the recording's rules
#   e2/checklist.md         docs/checklist.md, the draft of the checklist form (B1–B5, extensions)
#   e2/documentation.pdf    docs/documentation.md rendered with the ERD embedded (at most 8 pages)
#   e2/pomiary-zai-26z.zip  the repository files, tracked plus new-but-not-ignored (working-tree versions) plus the PDF
# Usage: package.sh [--stage e1|e2]; without --stage both are built.
# Needs nothing installed beyond what the repo already uses: npx (marked, like lighthouse.sh),
# Playwright's Chromium, zip, pdfinfo (poppler), curl and git (read-only: `git ls-files`).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"
SUBMISSIONS="$ROOT/.artifacts/submissions"
MAX_PAGES=8
ZIP_NAME="pomiary-zai-26z.zip"
APP_URL="https://pomiary-lasy.gugnowski.com"
REPO_URL="https://github.com/Manomenu/zaawansowane-aplikacje-internetowe-2026Z"
# The administrator's test account, created on the cluster by the platform repo's setup.sh.
ADMIN_SECRETS="${ADMIN_SECRETS:-$HOME/repos/suwalski-platform/.secrets/pomiary.env}"

stages=(e1 e2)
case "${1:-}" in
    "") ;;
    --stage)
        case "${2:-}" in
            e1 | e2) stages=("$2") ;;
            *) echo "Usage: package.sh [--stage e1|e2]" >&2; exit 2 ;;
        esac ;;
    *) echo "Usage: package.sh [--stage e1|e2]" >&2; exit 2 ;;
esac

# --- the forms: what to paste into Leia ---------------------------------------------------
# The form carries the admin's real login and password, read (not sourced) from the platform's
# secrets file, which lib.sh's save_source writes as KEY="value". .artifacts/ is outside git, outside the ZIP and outside gitleaks' untracked scan.
read_admin() {
    if [ ! -r "$ADMIN_SECRETS" ]; then
        echo "FAIL: no admin account file $ADMIN_SECRETS" >&2
        echo "      run scripts/projects/pomiary/setup.sh in suwalski-platform (or 'just secrets restore' there)," >&2
        echo "      or point ADMIN_SECRETS at the file" >&2
        exit 1
    fi
    ADMIN_USERNAME="$(sed -n 's/^ADMIN_USERNAME=//p' "$ADMIN_SECRETS" | tail -n 1)"
    ADMIN_USERNAME="${ADMIN_USERNAME#\"}"
    ADMIN_USERNAME="${ADMIN_USERNAME%\"}"
    ADMIN_PASSWORD="$(sed -n 's/^ADMIN_PASSWORD=//p' "$ADMIN_SECRETS" | tail -n 1)"
    ADMIN_PASSWORD="${ADMIN_PASSWORD#\"}"
    ADMIN_PASSWORD="${ADMIN_PASSWORD%\"}"
    local missing=()
    [ -n "$ADMIN_USERNAME" ] || missing+=(ADMIN_USERNAME)
    [ -n "$ADMIN_PASSWORD" ] || missing+=(ADMIN_PASSWORD)
    if [ "${#missing[@]}" -gt 0 ]; then
        echo "FAIL: ${missing[*]} missing or empty in $ADMIN_SECRETS — run setup.sh in suwalski-platform again" >&2
        exit 1
    fi
}

write_form() {
    local stage="$1" out="$2"
    {
        echo "# Submission form, ${stage^^}"
        echo
        if [ "$stage" = e2 ]; then
            echo "- **Application address:** $APP_URL"
        fi
        echo "- **API address:** $APP_URL/api"
        echo "- **Administrator test account:** login \`$ADMIN_USERNAME\`, password \`$ADMIN_PASSWORD\`"
        echo "  (it must keep working until grading)"
        echo "- **Repository:** $REPO_URL"
        if [ "$stage" = e2 ]; then
            echo "- **CI status:** $REPO_URL/actions/workflows/ci.yml"
            echo
            echo "Files to upload: \`$ZIP_NAME\` (code and documentation.pdf), the recording, the checklist."
            echo
            echo "- **Recording:** MP4, at most 100 MB, 5 to 7 minutes, the deployed app with the address bar"
            echo "  visible, each requirement's code shown or said first (script: \`docs/recording.md\`)."
            echo "- **Checklist:** \`checklist.md\` here; check every minute against the real recording."
        fi
        echo
        echo "Built from commit $(git rev-parse --short HEAD) on $(date +%F)."
    } >"$out/form.md"
}

# Not a failure: the package can be built before the deployment, but it should not be submitted then.
check_live() {
    if curl -fsS --max-time 10 "$APP_URL/api/health" >/dev/null 2>&1; then
        echo "$APP_URL/api/health answers"
    else
        echo "WARN: $APP_URL/api/health does not answer — deploy before submitting" >&2
    fi
}

build_e1() {
    local out="$SUBMISSIONS/e1"
    rm -rf "$out"
    mkdir -p "$out"
    write_form e1 "$out"
    echo "OK: $out"
}

build_e2() {
    for tool in npx zip unzip pdfinfo git; do
        command -v "$tool" >/dev/null || { echo "Missing tool: $tool" >&2; exit 1; }
    done
    local CHROME
    CHROME="$(find "$HOME/.cache/ms-playwright" -path '*/chromium-*/chrome-linux*/chrome' -type f 2>/dev/null | sort -V | tail -n 1)"
    if [ -z "$CHROME" ]; then
        echo "No Playwright Chromium found: run 'cd pomiary_web && pnpm exec playwright install chromium'." >&2
        exit 1
    fi

    local OUT="$SUBMISSIONS/e2"
    local BUILD="$OUT/build"
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

    local pages count size
    pages="$(pdfinfo "$OUT/documentation.pdf" | awk '/^Pages:/ {print $2}')"
    echo "documentation.pdf: $pages pages"
    if [ "$pages" -gt "$MAX_PAGES" ]; then
        echo "FAIL: $pages pages, the specification allows at most $MAX_PAGES" >&2
        exit 1
    fi

    # --- the ZIP: tracked files + the PDF ----------------------------------------------------
    local list="$BUILD/files.txt"
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
    write_form e2 "$OUT"
    cp docs/checklist.md "$OUT/checklist.md"
    echo "OK: $OUT"
}

read_admin
for stage in "${stages[@]}"; do
    "build_$stage"
done
check_live
