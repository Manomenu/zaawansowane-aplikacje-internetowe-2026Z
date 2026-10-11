# F32 — the recording shows the rejection log in k9s

Date: 2026-10-11. The owner watches the cluster's logs in k9s, not with `kubectl logs`.

## What was met

| Code | Scope |
| --- | --- |
| F4 | **Kept.** The recording plan still shows a rejected measurement in the server's log; only the tool changes. |

## What was done

- `docs/recording.md`, the F4 step: `k9s --kubeconfig ~/repos/suwalski-platform/kubeconfig -n pomiary -c deploy`,
  then `pomiary-server`, `l` for its logs and `/measurement rejected` to filter, replacing the
  `kubectl logs … | grep` line. A note to enlarge the terminal font for the take.

## Why this way

- **k9s is the tool the owner uses** for the cluster, so the take shows it without a typed pipeline; the
  filter (`/`) gives the same result as the `grep`.
- **The platform repo's kubeconfig** is passed explicitly, as its `just` recipes do, so k9s never opens
  another cluster from `KUBECONFIG`.

## How to verify

After deployment: run the k9s command, send an out-of-range value
(`python -m pomiary_generator send --count 1 --shape constant --min 120 --max 120`) and watch the filtered
log show `measurement rejected`.
