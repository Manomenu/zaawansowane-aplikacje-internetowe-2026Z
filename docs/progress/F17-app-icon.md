# F17 — the app icon

Date: 2026-10-10. The owner asked for an icon in the style of the other apps.

## What was met

| Code | Scope |
| --- | --- |
| T6 | The icon is decorative, so a browser tab or bookmark shows it next to the page title, which carries the meaning. Its light-on-dark contrast keeps it recognisable at 16 px. |

## What was done

- `pomiary_web/public/favicon.svg`, in the owner's family of app icons (automat-operat: a house
  on dark blue; grzyby-mcp: a mushroom on beige): a 64×64 rounded square with `rx="14"` like
  grzyby's, a dark forest green background (`#1b4332`), and a flat light green spruce
  (`#95d5b2`, three tiers and a trunk). `index.html` already links `/favicon.svg`.
- The tile prepared for the platform's homepage (suwalski-platform, waiting for the deployment)
  uses the matching `mdi-pine-tree`.

## Why this way

- **One SVG, no `.ico` or PNG set:** every current browser takes an SVG favicon, and the other
  apps do the same (AGENTS.md section 0).
- **A single solid shape with round joins:** at 16 px only the silhouette is left. The stroke
  in the fill colour rounds the tiers' corners, so they do not blur into a triangle.

## How to verify

Open http://localhost:3220 (`just web`) or http://localhost:8092 (`just up`) and look at the
tab. The file renders on its own in any browser: `pomiary_web/public/favicon.svg`.
