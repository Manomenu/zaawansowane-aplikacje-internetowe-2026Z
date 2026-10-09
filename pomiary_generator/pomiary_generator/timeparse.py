"""Durations (`5s`, `1h`) and instants (ISO 8601 or `now`)."""

import re
from datetime import UTC, datetime, timedelta

_UNITS = {"s": 1, "m": 60, "h": 3600, "d": 86400}
_DURATION = re.compile(r"^(\d+(?:\.\d+)?)([smhd])$")


def parse_duration(text: str) -> timedelta:
    """Parse `30s`, `5m`, `1h`, `2d` into a positive timedelta."""
    match = _DURATION.match(text.strip())
    if match is None:
        msg = f"invalid duration {text!r}: use a number and a unit s, m, h or d, e.g. 5s, 15m, 1h"
        raise ValueError(msg)
    seconds = float(match.group(1)) * _UNITS[match.group(2)]
    if seconds <= 0:
        msg = f"duration must be positive, got {text!r}"
        raise ValueError(msg)
    return timedelta(seconds=seconds)


def parse_instant(text: str, now: datetime) -> datetime:
    """Parse `now` or an ISO 8601 instant; a naive instant is taken as UTC."""
    if text.strip().lower() == "now":
        return now
    try:
        parsed = datetime.fromisoformat(text.strip().replace("Z", "+00:00"))
    except ValueError:
        msg = f"invalid time {text!r}: use 'now' or ISO 8601, e.g. 2026-10-09T10:00:00Z"
        raise ValueError(msg) from None
    return parsed.replace(tzinfo=UTC) if parsed.tzinfo is None else parsed.astimezone(UTC)


def format_instant(moment: datetime) -> str:
    """Format as `2026-10-09T10:00:00Z` (whole seconds, UTC)."""
    return moment.astimezone(UTC).strftime("%Y-%m-%dT%H:%M:%SZ")


def backfill_times(count: int, step: timedelta, end: datetime) -> list[datetime]:
    """`count` instants ending at `end`, `step` apart, oldest first."""
    return [end - step * (count - 1 - i) for i in range(count)]
