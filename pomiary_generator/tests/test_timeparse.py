from datetime import UTC, datetime, timedelta
from itertools import pairwise

import pytest
from pomiary_generator.timeparse import backfill_times, format_instant, parse_duration, parse_instant

NOW = datetime(2026, 10, 9, 12, 0, tzinfo=UTC)


@pytest.mark.parametrize(
    ("text", "expected"),
    [("5s", 5), ("15m", 900), ("1h", 3600), ("2d", 172800), ("0.5h", 1800)],
)
def test_parse_duration(text: str, expected: int) -> None:
    assert parse_duration(text) == timedelta(seconds=expected)


@pytest.mark.parametrize("text", ["", "5", "h", "-1h", "0s", "5x", "1 hour"])
def test_parse_duration_rejects(text: str) -> None:
    with pytest.raises(ValueError, match="duration"):
        parse_duration(text)


def test_parse_instant() -> None:
    assert parse_instant("now", NOW) == NOW
    assert parse_instant("2026-10-09T10:00:00Z", NOW) == datetime(2026, 10, 9, 10, tzinfo=UTC)
    assert parse_instant("2026-10-09T12:00:00+02:00", NOW) == datetime(2026, 10, 9, 10, tzinfo=UTC)
    assert parse_instant("2026-10-09T10:00:00", NOW) == datetime(2026, 10, 9, 10, tzinfo=UTC)


def test_parse_instant_rejects_garbage() -> None:
    with pytest.raises(ValueError, match="invalid time"):
        parse_instant("yesterday", NOW)


def test_format_instant() -> None:
    assert format_instant(datetime(2026, 10, 9, 12, 0, 5, 999, tzinfo=UTC)) == "2026-10-09T12:00:05Z"


def test_backfill_times_count_order_and_end() -> None:
    times = backfill_times(4, timedelta(hours=1), NOW)
    assert len(times) == 4
    assert times[-1] == NOW
    assert times == sorted(times)
    assert times[0] == NOW - timedelta(hours=3)
    assert {b - a for a, b in pairwise(times)} == {timedelta(hours=1)}
