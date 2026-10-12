# F43 — the submission form matches the Leia form field by field

Date: 2026-10-13. The owner showed the E1 form on Leia: `student`, `app_url`, `api_url`, `username`, `password`,
`repo_url`, `ci_url`.

## What was met

| Code | Scope |
| --- | --- |
| A1 | **Protected.** `formularz.md` gives `api_url` as the bare host; the teacher's script appends `/api/...` itself, so `…/api` there would have sent every E1 test to `/api/api/…` (404). |

## What was done

- `scripts/.internal/package.sh`: `formularz.md` is a table of the seven Leia fields in their order, each with the
  value to paste (`STUDENT_ID` 320690, the addresses, the account from the platform's secrets file, the CI link);
  E2 adds the files to upload and the recording's rules below it.

## Why this way

- **The script decides what `api_url` means:** `zai-tests.mjs` builds every URL as `joinUrl(api_url || app_url,
  '/api/...')`. Checked: `https://pomiary-lasy.gugnowski.com/api/api/health` answers 404.
- **Field names as Leia shows them:** pasting is then a one-to-one copy, with nothing to interpret on the day.

## How to verify

```sh
just package --stage e1 && head -15 .artifacts/submissions/e1/formularz.md
curl -s -o /dev/null -w "%{http_code}\n" https://pomiary-lasy.gugnowski.com/api/api/health   # 404: why api_url has no /api
```
