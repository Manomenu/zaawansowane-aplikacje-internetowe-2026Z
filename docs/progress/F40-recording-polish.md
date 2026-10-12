# F40 — the recording script in Polish

Date: 2026-10-12. The owner records the video in Polish and asked for the script in Polish.

## What was met

| Code | Scope |
| --- | --- |
| B1, B2, B3 | **Kept.** The same plan of the video (scenes, codes, minutes, commands), now in the owner's language. |

## What was done

- `docs/recording.md` translated into Polish (by a Sonnet subagent, then checked): the code spans, the code
  blocks apart from their `#` comments, the timeline's minutes and the table's 22 rows were compared with the
  English version by a script and found identical. The app's English labels ("Register a sensor", tab names)
  stay English, since that is what the screen shows.
- `AGENTS.md`: the language exception names `docs/recording.md` too.

## Why this way

- **Polish, because the take is Polish:** the owner reads the script aloud and follows it during the take;
  translating it in the head while recording costs time and mistakes. The UI strings stay English so the
  script matches the screen word for word.

## How to verify

```sh
git show HEAD~1:docs/recording.md | grep -o '`[^`]*`' | sort > /tmp/a; grep -o '`[^`]*`' docs/recording.md | sort > /tmp/b; diff /tmp/a /tmp/b && echo same
```
