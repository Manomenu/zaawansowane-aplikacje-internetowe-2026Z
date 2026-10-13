#!/usr/bin/env bash
# Builds the submission packages into .artifacts/submissions/<stage>/:
#   e1/formularz.md          the E1 form on Leia, field by field: student number, addresses, admin account, repo, CI
#   e2/dokumentacja.pdf      docs/documentation.md rendered with the ERD embedded (at most 8 pages)
#   e2/formularz-e2.pdf      docs/submissions/formularz-e2.md: addresses, admin account, repo, CI, the uploaded files
#   e2/lista-kontrolna-e2.pdf  docs/submissions/lista-kontrolna-e2.md: B1–B5 and the extensions with their minutes
#   e2/pomiary-zai-26z.zip  the repository files, tracked plus new-but-not-ignored (working-tree versions) plus the PDF
# What the teacher reads is Polish (the course's language): the forms, the PDF and the checklist.
# The script's own messages stay English, like the rest of the repository.
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
# The author's student number, the form's `student` field (also in the author block of docs/documentation.md).
STUDENT_ID="320690"
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

# E2 has no form fields on Leia, only uploaded files: its form is the PDF from docs/submissions/.
write_form_e1() {
    local out="$1"
    {
        echo "# Formularz zgłoszenia, E1"
        echo
        echo "Pola w kolejności formularza na Leia; wartość z kolumny po prawej wklej bez zmian."
        echo
        echo "| Pole na Leia | Wartość |"
        echo "| --- | --- |"
        echo "| student - Numer albumu | \`$STUDENT_ID\` |"
        echo "| app_url - Adres UI aplikacji | \`$APP_URL\` |"
        # The host alone: the teacher's script appends /api/... itself, so ".../api" would test /api/api/... (404).
        echo "| api_url - Adres API | \`$APP_URL\` (sam host, bez \`/api\`: skrypt prowadzącego sam dokleja \`/api/...\`) |"
        echo "| username - Nazwa użytkownika aplikacji | \`$ADMIN_USERNAME\` |"
        echo "| password - Hasło | \`$ADMIN_PASSWORD\` |"
        echo "| repo_url - Adres repozytorium z kodem źródłowym | \`$REPO_URL\` |"
        echo "| ci_url - Adres skonfigurowanego narzędzia CI | \`$REPO_URL/actions/workflows/ci.yml\` |"
        echo
        echo "Konto musi działać do czasu wystawienia oceny: nie zmieniaj hasła po zgłoszeniu."
        echo
        echo "Zbudowane z commita $(git rev-parse --short HEAD), $(date +%F)."
    } >"$out/formularz.md"
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
    write_form_e1 "$out"
    echo "OK: $out"
}

# One Markdown source -> one signed PDF in "$OUT" (uses $BUILD, $CHROME of build_e2). The repository's files carry
# placeholders, filled here: {{ADMIN_USERNAME}}, {{ADMIN_PASSWORD}} (the platform's secrets file) and {{DATA}}
# (today, in Polish). The ZIP keeps the placeholders. A TODO or an unfilled placeholder stops the build.
render_pdf() {
    local src="$1" pdf="$2" footer="$3" name
    name="$(basename "$src" .md)"
    if grep -q 'TODO' "$src"; then
        echo "FAIL: $src still contains TODO" >&2
        exit 1
    fi
    ADMIN_USERNAME="$ADMIN_USERNAME" ADMIN_PASSWORD="$ADMIN_PASSWORD" python3 -c '
import datetime, os, sys
months = ["stycznia", "lutego", "marca", "kwietnia", "maja", "czerwca", "lipca", "sierpnia", "września",
          "października", "listopada", "grudnia"]
today = datetime.date.today()
values = {"ADMIN_USERNAME": os.environ["ADMIN_USERNAME"], "ADMIN_PASSWORD": os.environ["ADMIN_PASSWORD"],
          "DATA": f"{today.day} {months[today.month - 1]} {today.year}"}
text = open(sys.argv[1], encoding="utf-8").read()
for key, value in values.items():
    text = text.replace("{{" + key + "}}", value)
open(sys.argv[2], "w", encoding="utf-8").write(text)
' "$src" "$BUILD/$name.md"
    if grep -q '{{' "$BUILD/$name.md"; then
        echo "FAIL: an unfilled {{placeholder}} remains in $src" >&2
        exit 1
    fi
    {
        printf '<!doctype html>\n<html lang="pl"><head><meta charset="utf-8"><title>%s (Piotr Gugnowski)</title>\n<style>\n' "$footer"
        printf '%s' "${PDF_CSS//__FOOTER__/$footer}"
        echo '</style></head><body>'
        npx --yes marked@15.0.12 -i "$BUILD/$name.md" --gfm
        echo '</body></html>'
    } >"$BUILD/$name.html"
    "$CHROME" --headless=new --no-sandbox --disable-gpu --no-pdf-header-footer \
        --print-to-pdf="$OUT/$pdf" "file://$BUILD/$name.html" 2>/dev/null
    [ -s "$OUT/$pdf" ] || { echo "FAIL: $pdf was not produced" >&2; exit 1; }
    echo "$pdf: $(pdfinfo "$OUT/$pdf" | awk '/^Pages:/ {print $2}') pages"
}

# The print style of every PDF; __FOOTER__ becomes the document's name in the running footer.
PDF_CSS="$(cat <<'CSS'
      @page { size: A4; margin: 14mm 15mm 16mm;
        @bottom-left { content: "__FOOTER__"; font: 8pt "DejaVu Sans", Arial, sans-serif; color: #555; }
        @bottom-right { content: "strona " counter(page) " z " counter(pages); font: 8pt "DejaVu Sans", Arial, sans-serif; color: #555; } }
      .doc-meta { margin: 4pt 0 10pt; }
      .doc-meta table { width: auto; }
      thead:not(:has(th:not(:empty))) { display: none; }  /* a Markdown key-value table: no header */
      .doc-meta td:first-child { font-weight: 600; padding-right: 12pt; }
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
      .checklist td:nth-child(1) { width: 40%; } .checklist td:nth-child(2) { width: 9%; }
      .checklist td:nth-child(3) { width: 13%; }
CSS
)"

build_e2() {
    for tool in npx zip unzip pdfinfo git; do
        command -v "$tool" >/dev/null || { echo "Missing tool: $tool" >&2; exit 1; }
    done
    CHROME="$(find "$HOME/.cache/ms-playwright" -path '*/chromium-*/chrome-linux*/chrome' -type f 2>/dev/null | sort -V | tail -n 1)"
    if [ -z "$CHROME" ]; then
        echo "No Playwright Chromium found: run 'cd pomiary_web && pnpm exec playwright install chromium'." >&2
        exit 1
    fi

    OUT="$SUBMISSIONS/e2"
    BUILD="$OUT/build"
    rm -rf "$OUT"
    mkdir -p "$BUILD"

    # --- the PDFs: Markdown -> HTML -> headless Chromium ------------------------------------
    cp docs/erd.svg "$BUILD/erd.svg"
    render_pdf docs/documentation.md dokumentacja.pdf "Pomiary - dokumentacja projektu, ZAI 2026Z"
    render_pdf docs/submissions/formularz-e2.md formularz-e2.pdf "Pomiary - formularz zgłoszenia E2, ZAI 2026Z"
    render_pdf docs/submissions/lista-kontrolna-e2.md lista-kontrolna-e2.pdf "Pomiary - lista kontrolna E2, ZAI 2026Z"

    local pages count size
    pages="$(pdfinfo "$OUT/dokumentacja.pdf" | awk '/^Pages:/ {print $2}')"
    if [ "$pages" -gt "$MAX_PAGES" ]; then
        echo "FAIL: dokumentacja.pdf has $pages pages, the specification allows at most $MAX_PAGES" >&2
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
    (cd "$OUT" && zip -q "$ZIP_NAME" dokumentacja.pdf)

    if unzip -Z1 "$OUT/$ZIP_NAME" | grep -q -E '(^|/)node_modules/'; then
        echo "FAIL: node_modules in the ZIP" >&2
        exit 1
    fi
    count="$(unzip -Z1 "$OUT/$ZIP_NAME" | wc -l)"
    size="$(du -h "$OUT/$ZIP_NAME" | cut -f1)"
    echo "$ZIP_NAME: $count files, $size"
    rm -rf "$BUILD"
    echo "OK: $OUT"
}

read_admin
for stage in "${stages[@]}"; do
    "build_$stage"
done
check_live
