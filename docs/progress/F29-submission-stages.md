# F29 — submission packages per stage: `just package` builds E1 and E2

Date: 2026-10-10. The owner asked for one package per stage, `just package --stage e1|e2`, and both at
once without the flag.

## What was met

| Code | Scope |
| --- | --- |
| B4 | **Kept.** The E2 ZIP still fails to build without `docs/erd.svg` and the migrations. |
| B5 | **Kept, in progress.** The E2 PDF is built as before (6 pages, fails above 8); the deployment TODOs remain. |

The stages themselves (E1 on 7 Nov, E2 on 21 Nov) are not requirement codes; this makes handing them in
a single command each.

## What was done

- `scripts/.internal/package.sh` takes `[--stage e1|e2]`; without it both are built. Anything else exits 2
  with the usage line. Output moved from `.artifacts/submission/` to `.artifacts/submissions/<stage>/`.
- **E1** (`e1/form.md`): what the E1 form on Leia asks for — the API address, the administrator's test
  login and password, the repository link.
- **The account** is read (not sourced) from the platform repo's `.secrets/pomiary.env`, which its
  `setup.sh` writes as `KEY="value"`; `ADMIN_SECRETS` points elsewhere. A missing file, or a missing or empty
  `ADMIN_USERNAME`/`ADMIN_PASSWORD`, stops the script with a FAIL line saying which and how to fix it.
- **E2** (`e2/`): `documentation.pdf` and `pomiary-zai-26z.zip` as before, `form.md` with the application
  and API addresses, the account, the repository, the CI link and the recording's rules from the
  specification, and `checklist.md`, a copy of `docs/checklist.md`.
- Each form ends with the commit and date it was built from.
- After building, the script asks `GET /api/health` on the public address and prints a WARN when it does
  not answer.
- `justfile` (`package *args`), `AGENTS.md` (the scripts table) and `docs/development.md` describe it.

## Why this way

- **The forms carry the real login and password**, at the owner's request: the form is pasted as it is. The
  value stays out of git: `.artifacts/` is ignored, so neither the ZIP nor gitleaks' scan of untracked files
  sees it, and the source of truth stays the platform's secrets file. The first draft only named the file.
- **E1 has no ZIP or PDF:** the specification asks only for the address, the account and the repository link.
- **The live check warns, not fails:** the package is useful before the deployment (to check the PDF's page
  count), but it should not be submitted while the public address is down.
- **One script, not two:** E2 shares the form with E1 and adds files; a stage is a function in the same script.

## How to verify

```sh
just package                 # both: .artifacts/submissions/e1/, e2/
just package --stage e1      # only e1/form.md
just package --stage e3      # exits 2 with the usage line
ADMIN_SECRETS=/nonexistent just package --stage e1   # FAIL: no admin account file …
find .artifacts/submissions -type f | sort
unzip -Z1 .artifacts/submissions/e2/pomiary-zai-26z.zip | grep documentation.pdf
```
