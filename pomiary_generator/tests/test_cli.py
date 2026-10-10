from datetime import UTC, datetime, timedelta
from functools import partial
from typing import Any

import pytest
from pomiary_generator.cli import main
from pomiary_generator.send import run_live


def run(argv: list[str], monkeypatch: pytest.MonkeyPatch) -> tuple[int, list[str]]:
    monkeypatch.delenv("POMIARY_API", raising=False)
    monkeypatch.delenv("POMIARY_API_KEY", raising=False)
    lines: list[str] = []
    return main(argv, lines.append), lines


Fake = tuple[Any, str]


def test_missing_key_is_a_clear_error(monkeypatch: pytest.MonkeyPatch, capsys: pytest.CaptureFixture[str]) -> None:
    code, _ = run(["send", "--api", "http://x", "--count", "1"], monkeypatch)
    assert code == 2
    assert "POMIARY_API_KEY" in capsys.readouterr().err


def test_key_and_api_come_from_the_environment(fake: Fake, monkeypatch: pytest.MonkeyPatch) -> None:
    state, url = fake
    state.series.append({"id": 1, "name": "s", "minValue": 0, "maxValue": 100})
    state.sensors["envkey"] = 1
    monkeypatch.setenv("POMIARY_API", url)
    monkeypatch.setenv("POMIARY_API_KEY", "envkey")
    lines: list[str] = []
    assert main(["send", "--count", "3", "--step", "10m", "--seed", "1"], lines.append) == 0
    stamps = [m["timestamp"] for m in state.measurements]
    assert stamps == sorted(stamps)
    assert len(stamps) == 3
    assert lines[0].startswith("201 ")


def test_out_of_range_demo_exits_nonzero(fake: Fake, monkeypatch: pytest.MonkeyPatch) -> None:
    state, url = fake
    state.series.append({"id": 1, "name": "s", "minValue": 0, "maxValue": 100})
    state.sensors["k"] = 1
    code, lines = run(
        [*["send", "--api", url, "--api-key", "k", "--count", "1"], *["--shape", "constant", "--min", "120", "--max", "120"]], monkeypatch
    )
    assert code == 1
    assert lines[0].startswith("REJECTED 422: value 120 is outside the series range [0, 100]")


@pytest.mark.parametrize(
    "argv",
    [
        ["send", "--dry-run"],
        ["send", "--dry-run", "--count", "0"],
        ["send", "--dry-run", "--count", "1", "--step", "fast"],
        ["send", "--dry-run", "--count", "1", "--source", "open-meteo"],
        ["send", "--dry-run", "--count", "1", "--min", "5", "--max", "1"],
    ],
)
def test_bad_arguments_exit_2(argv: list[str], monkeypatch: pytest.MonkeyPatch) -> None:
    code, _ = run(argv, monkeypatch)
    assert code == 2


def test_seed_requires_credentials(monkeypatch: pytest.MonkeyPatch) -> None:
    for name in ("POMIARY_ADMIN_USER", "POMIARY_ADMIN_PASSWORD"):
        monkeypatch.delenv(name, raising=False)
    code, _ = run(["seed", "--api", "http://x"], monkeypatch)
    assert code == 2


def _dry_values(argv: list[str], monkeypatch: pytest.MonkeyPatch) -> list[float]:
    code, lines = run(["send", "--dry-run", "--shape", "sine", "--min", "0", "--max", "100", *argv], monkeypatch)
    assert code == 0
    return [float(line.split()[-1]) for line in lines if line.startswith("DRY-RUN")]


def _ticking_clock(monkeypatch: pytest.MonkeyPatch) -> None:
    """Replace the live clock by one that advances 1 s per call, starting at a fixed moment."""
    ticks = iter(datetime(2026, 10, 1, tzinfo=UTC) + timedelta(seconds=s) for s in range(1000))
    monkeypatch.setattr("pomiary_generator.send.now_utc", lambda: next(ticks))
    no_sleep = partial(run_live, sleep=lambda _seconds: None)
    monkeypatch.setattr("pomiary_generator.cli.run_live", no_sleep)


def test_live_default_period_is_a_minute(monkeypatch: pytest.MonkeyPatch) -> None:
    _ticking_clock(monkeypatch)
    values = _dry_values(["--interval", "1s", "--count", "61"], monkeypatch)
    assert values[0] == values[60]
    assert values[30] == pytest.approx(100 - values[0], abs=0.01)  # half a period: mirrored around the middle
    assert max(values) - min(values) > 99


def test_explicit_period_wins_in_live(monkeypatch: pytest.MonkeyPatch) -> None:
    _ticking_clock(monkeypatch)
    values = _dry_values(["--interval", "1s", "--count", "121", "--period", "2m"], monkeypatch)
    assert values[0] == values[120]
    assert values[30] == pytest.approx(100, abs=0.01)  # a quarter of 2m, not of the 60 s default


def test_backfill_default_period_is_a_day(monkeypatch: pytest.MonkeyPatch) -> None:
    daily = _dry_values(["--count", "25", "--step", "1h", "--end", "2026-10-01T00:00:00Z"], monkeypatch)
    assert daily[0] == daily[24]
    assert max(daily) - min(daily) > 90


def test_explicit_period_wins_in_backfill(monkeypatch: pytest.MonkeyPatch) -> None:
    minute = _dry_values(["--count", "61", "--step", "1s", "--end", "2026-10-01T00:00:00Z", "--period", "1m"], monkeypatch)
    assert minute[0] == minute[60]
    assert max(minute) - min(minute) > 99
