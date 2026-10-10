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
    assert any(s["name"] == "Suwałki: Soil moisture" for s in state.series)
    # distinct colour/icon pair per series (T6), icons per quantity
    assert len({(s["color"], s["icon"]) for s in state.series}) == 12
    assert len({s["icon"] for s in state.series}) == 4
    # keys are printed once at the end
    assert sum("key-" in line for line in lines) == 12


def names(state: Any) -> list[str]:
    return [str(s["name"]) for s in state.series]


def test_seed_deletes_owned_names_new_and_legacy_and_nothing_else(fake: Fake) -> None:
    state, url = fake
    api = Api(url)
    token = api.login("admin", "good")
    for name in ("Warsaw: Precipitation", "Precipitation — Warsaw", "Soil moisture — Suwałki", "ZAI-TEST-1", "My own series"):
        api.create_series(token, {"name": name, "minValue": 0, "maxValue": 1})
    lines: list[str] = []
    assert run_seed(api, "admin", "good", 1, "synthetic", NOW, lines.append) == 0
    assert "deleted 3 sample series (and their sensors and measurements)" in lines
    assert len(state.series) == 12 + 2
    assert {"ZAI-TEST-1", "My own series"} <= set(names(state))
    assert "Precipitation — Warsaw" not in names(state)
    assert names(state).count("Warsaw: Precipitation") == 1
    assert {m["seriesId"] for m in state.measurements}.isdisjoint({s["id"] for s in state.series if s["name"] == "My own series"})


def test_seed_twice_replaces_without_duplicates(fake: Fake) -> None:
    state, url = fake
    run_seed(Api(url), "admin", "good", 1, "open-meteo", NOW, lambda _l: None, fake_fetch)
    first_keys = set(state.sensors)
    lines: list[str] = []
    code = run_seed(Api(url), "admin", "good", 1, "open-meteo", NOW, lines.append, fake_fetch)
    assert code == 0
    assert "deleted 12 sample series (and their sensors and measurements)" in lines
    assert len(state.series) == 12
    assert len(state.sensors) == 12
    assert len(state.measurements) == 12 * 24
    assert first_keys.isdisjoint(state.sensors)


def test_seed_delete_failure_stops_before_creating(fake: Fake) -> None:
    state, url = fake
    api = Api(url)
    api.create_series(api.login("admin", "good"), {"name": "Warsaw: Precipitation", "minValue": 0, "maxValue": 1})
    state.fail_delete = True
    lines: list[str] = []
    assert run_seed(api, "admin", "good", 1, "synthetic", NOW, lines.append) == 1
    assert "seed failed" in lines[0]
    assert "DELETE /api/series/1" in lines[0]
    assert len(state.series) == 1


def test_seed_synthetic_fallback_stays_in_range(fake: Fake) -> None:
    state, url = fake
    assert run_seed(Api(url), "admin", "good", 2, "synthetic", NOW, lambda _l: None) == 0
    assert len(state.measurements) == 12 * 48


def test_seed_bad_login_fails_with_a_message(fake: Fake) -> None:
    _, url = fake
    lines: list[str] = []
    assert run_seed(Api(url), "admin", "wrong", 1, "synthetic", NOW, lines.append) == 1
    assert "seed failed" in lines[0]
