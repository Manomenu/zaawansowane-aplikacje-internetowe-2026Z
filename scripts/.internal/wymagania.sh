#!/usr/bin/env bash
# Hard checks of the course requirements that live in files, not in code (docs/wymagania.md):
#   1. the spec files (contract, the teacher's tests, the PDF) are unchanged — T3 forbids
#      changing the contract, and the tests are what grades the project;
#   2. every requirement code of the spec has its row in docs/wymagania.md, with a known status;
#   3. a row marked "zrobione" points at an existing docs/progress/*.md that names the code;
#   4. every progress file has the sections that say what was met, done, why, and how to check.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
MATRIX="$ROOT/docs/wymagania.md"
FAILED=0
fail() { echo "  $*" >&2; FAILED=1; }

# 1. Spec files untouched.
(cd "$ROOT/docs/spec" && sha256sum --check --quiet SHA256SUMS) ||
    fail "docs/spec changed — the contract and the teacher's tests must stay as published"

# 2. Every code present, each row with a valid status.
CODES=()
for n in $(seq 1 13); do CODES+=("F$n"); done
for n in $(seq 1 11); do CODES+=("T$n"); done
for n in $(seq 1 5); do CODES+=("A$n" "B$n"); done
for n in $(seq 1 4); do CODES+=("X$n"); done

for code in "${CODES[@]}"; do
    row="$(grep -E "^\| ${code} \|" "$MATRIX" || true)"
    if [ -z "$row" ]; then
        fail "$code: no row in docs/wymagania.md"
        continue
    fi
    status="$(awk -F'|' '{ gsub(/^ +| +$/, "", $4); print $4 }' <<<"$row")"
    proof="$(awk -F'|' '{ gsub(/^ +| +$/, "", $5); print $5 }' <<<"$row")"
    case "$status" in
        todo | "w toku") ;;
        zrobione)
            # 3. Done means a progress file says how.
            if [ -z "$proof" ] || [ ! -f "$ROOT/$proof" ]; then
                fail "$code: \"zrobione\" without an existing progress file (got \"$proof\")"
            elif ! grep -qw "$code" "$ROOT/$proof"; then
                fail "$code: $proof does not mention $code"
            fi
            ;;
        *) fail "$code: unknown status \"$status\" (todo | w toku | zrobione)" ;;
    esac
    if [ -n "$proof" ] && [ ! -f "$ROOT/$proof" ]; then
        fail "$code: proof $proof does not exist"
    fi
done

# 4. Progress files have their sections.
SECTIONS=("## Co spełniono" "## Co zrobiono" "## Dlaczego tak" "## Jak sprawdzić")
shopt -s nullglob
files=("$ROOT"/docs/progress/F*.md)
[ ${#files[@]} -gt 0 ] || fail "docs/progress/ has no F*.md files"
for f in "${files[@]}"; do
    for s in "${SECTIONS[@]}"; do
        grep -qxF "$s" "$f" || fail "${f#"$ROOT"/}: missing section \"$s\""
    done
done

[ "$FAILED" -eq 0 ] && echo "requirements matrix: ${#CODES[@]} codes, ${#files[@]} progress files — OK"
exit "$FAILED"
