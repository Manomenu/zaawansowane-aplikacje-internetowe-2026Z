import json
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from pomiary_generator.client import Api
from pomiary_generator.openmeteo import PLACES, QUANTITIES, Hourly, parse_hourly
from pomiary_generator.seed import run_seed

Fake = tuple[Any, str]
NOW = datetime(2026, 10, 9, 17, 30, tzinfo=UTC)
DOCUMENT = json.loads((Path(__file__).parent / "fixtures" / "open_meteo_suwalki.json").read_text())


def fake_fetch(place: str, quantities: list[str], past_days: int, now: datetime) -> Hourly:
    return parse_hourly(DOCUMENT, quantities, now)


def test_seed_creates_12_series_12_sensors_and_values(fake: Fake) -> None:
    state, url = fake
    lines: list[str] = []
    code = run_seed(Api(url), "admin", "good", 1, "open-meteo", NOW, lines.append, fake_fetch)
    assert code == 0
    assert len(state.series) == len(PLACES) * len(QUANTITIES) == 12
    assert len(state.sensors) == 12
    assert len(state.measurements) == 12 * 24
    assert "Suwałki" in " ".join(str(s["name"]) for s in state.series)
    assert any(s["name"] == "Soil moisture — Suwałki" for s in state.series)
    # distinct colour/icon pair per series (T6), icons per quantity
    assert len({(s["color"], s["icon"]) for s in state.series}) == 12
    assert len({s["icon"] for s in state.series}) == 4
    # keys are printed once at the end
    assert sum("key-" in line for line in lines) == 12


def test_seed_twice_does_not_duplicate(fake: Fake) -> None:
    state, url = fake
    run_seed(Api(url), "admin", "good", 1, "open-meteo", NOW, lambda _l: None, fake_fetch)
    lines: list[str] = []
    code = run_seed(Api(url), "admin", "good", 1, "open-meteo", NOW, lines.append, fake_fetch)
    assert code == 0
    assert len(state.series) == 12
    assert len(state.sensors) == 12
    assert sum(line.startswith("skipped") for line in lines) == 12


def test_seed_synthetic_fallback_stays_in_range(fake: Fake) -> None:
    state, url = fake
    assert run_seed(Api(url), "admin", "good", 2, "synthetic", NOW, lambda _l: None) == 0
    assert len(state.measurements) == 12 * 48


def test_seed_bad_login_fails_with_a_message(fake: Fake) -> None:
    _, url = fake
    lines: list[str] = []
    assert run_seed(Api(url), "admin", "wrong", 1, "synthetic", NOW, lines.append) == 1
    assert "seed failed" in lines[0]
