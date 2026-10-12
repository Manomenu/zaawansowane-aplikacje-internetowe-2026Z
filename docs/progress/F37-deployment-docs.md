# F37 — documentation without TODO, login in the PDF

Date: 2026-10-12. The app is deployed (image `sha-069dbf8`, CI green on `master`), so the placeholders in the
documentation could be filled.

## What was met

| Code | Scope |
| --- | --- |
| B5 | **Complete.** `docs/documentation.md` has no TODO left; the administrator's login and password appear in the PDF. |
| T10 | **Confirmed.** The documentation states the app is deployed and available (checked 2026-10-12: page, `/api/health`, `/api/docs`, HTTP to HTTPS redirect). |

## What was done

- `docs/documentation.md`: deployment statement with a date, CI link in X3, the TODO note removed; section 2 holds
  the literal placeholders `{{ADMIN_USERNAME}}` and `{{ADMIN_PASSWORD}}`.
- `scripts/.internal/package.sh`: `build_e2` substitutes the placeholders into a copy of the file in the build
  directory (a small `python3 -c` reading environment variables) and renders the PDF from that copy. It fails
  when the source contains TODO, and when any `{{` survives the substitution.
- `docs/checklist.md` (B5 row) and `README.md` (address paragraph) no longer hedge.

## Why this way

- **Placeholders, not the password:** the repository and the ZIP (taken from `git ls-files`) never hold the
  secret; only the PDF, built on the owner's machine from the platform's secrets file, does.
- **Python for the substitution:** safe for any password characters, unlike `sed` with the value in a pattern.
- **The check lives in `package.sh`:** the documentation is only rendered there, so it is the place that can
  refuse a PDF with a TODO or an unfilled placeholder.

## How to verify

```sh
grep -n TODO docs/documentation.md                       # nothing
./scripts/.internal/package.sh --stage e2                # at most 8 pages
pdftotext .artifacts/submissions/e2/dokumentacja.pdf - | grep -c '{{'   # 0
./scripts/.internal/requirements.sh
shellcheck scripts/.internal/package.sh
```
