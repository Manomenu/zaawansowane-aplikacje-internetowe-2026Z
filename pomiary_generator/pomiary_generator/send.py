"""The `send` command: one sensor's measurements, as a backfill or live."""

import sys
import time
from collections.abc import Callable
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta

from pomiary_generator.client import Api, Outcome
from pomiary_generator.openmeteo import Hourly, OpenMeteoError, fetch_hourly, past_days_for
from pomiary_generator.synthetic import Synthetic
from pomiary_generator.timeparse import format_instant

Emit = Callable[[str], None]
Point = tuple[datetime, float]


def emit_stdout(line: str) -> None:
    sys.stdout.write(line + "\n")
    sys.stdout.flush()


def now_utc() -> datetime:
    return datetime.now(UTC)


@dataclass
class Stats:
    sent: int = 0
    problems: int = 0  # rejected or failed

    @property
    def exit_code(self) -> int:
        return 1 if self.problems else 0


def deliver(  # noqa: PLR0913
    api: Api, key: str, value: float, moment: datetime | None, *, dry_run: bool, emit: Emit, stats: Stats
) -> Outcome:
    """Send (or just print) one value and print one line about it."""
    label = format_instant(moment) if moment else "now"
    if dry_run:
        emit(f"DRY-RUN {label} {value:g}")
        stats.sent += 1
        return Outcome("ok", None, "dry run")
    outcome = api.send_measurement(key, value, moment)
    if outcome.kind == "ok":
        stats.sent += 1
        emit(f"{outcome.status} {outcome.timestamp or label} {value:g}")
        return outcome
    stats.problems += 1
    if outcome.kind == "rejected":
        emit(f"REJECTED {outcome.status}: {outcome.message}  (value {value:g}, time {label})")
    elif outcome.kind == "unauthorized":
        emit(f"ERROR 401: {outcome.message}. Stopping.")
    elif outcome.kind == "network":
        emit(f"NETWORK ERROR: {outcome.message} (value {value:g}, time {label})")
    else:
        emit(f"FAILED {outcome.status}: {outcome.message}  (value {value:g}, time {label})")
    return outcome


def synthetic_points(source: Synthetic, times: list[datetime]) -> list[Point]:
    return [(when, source.value(when)) for when in times]


def open_meteo_points(place: str, quantity: str, count: int, end: datetime, now: datetime) -> list[Point]:
    """The last `count` hourly values at or before `end` (and never after `now`)."""
    limit = min(end, now)
    days = past_days_for(count, now, limit)
    hourly = fetch_hourly(place, [quantity], days, now)[quantity]
    return [p for p in hourly if p[0] <= limit][-count:]


def run_backfill(api: Api, key: str, points: list[Point], *, dry_run: bool, emit: Emit) -> int:
    """Send oldest first; stop on a bad key or a network error, go on after a rejection."""
    stats = Stats()
    for when, value in points:
        outcome = deliver(api, key, value, when, dry_run=dry_run, emit=emit, stats=stats)
        if outcome.kind in ("unauthorized", "network"):
            break
    emit(f"Done: {stats.sent} sent, {stats.problems} problems.")
    return stats.exit_code


class LiveOpenMeteo:
    """The latest hourly value at or before now. The hour is fetched again only when it changes."""

    def __init__(self, place: str, quantity: str, fetch: Callable[..., Hourly] = fetch_hourly) -> None:
        self.place, self.quantity, self._fetch = place, quantity, fetch
        self._hour: datetime | None = None
        self._value = 0.0

    def value(self, now: datetime) -> float:
        hour = now.replace(minute=0, second=0, microsecond=0)
        if hour != self._hour:
            latest = self._fetch(self.place, [self.quantity], 1, now)[self.quantity]
            if not latest:
                msg = "Open-Meteo returned no value up to now"
                raise OpenMeteoError(msg)
            self._value, self._hour = latest[-1][1], hour
        return self._value


def run_live(  # noqa: PLR0913
    api: Api,
    key: str,
    value_at: Callable[[datetime], float],
    interval: timedelta,
    count: int | None,
    *,
    dry_run: bool,
    emit: Emit,
    sleep: Callable[[float], None] = time.sleep,
) -> int:
    """Send the current value every `interval` (no timestamp: the server stamps it), forever unless `count`."""
    stats = Stats()
    done = 0
    while count is None or done < count:
        if done:
            sleep(interval.total_seconds())
        done += 1
        try:
            value = value_at(now_utc())
        except OpenMeteoError as error:
            stats.problems += 1
            emit(f"NETWORK ERROR: {error}")
            continue
        if deliver(api, key, value, None, dry_run=dry_run, emit=emit, stats=stats).kind == "unauthorized":
            break
    emit(f"Done: {stats.sent} sent, {stats.problems} problems.")
    return stats.exit_code
