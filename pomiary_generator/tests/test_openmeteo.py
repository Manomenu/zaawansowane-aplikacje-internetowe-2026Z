import json
from datetime import UTC, datetime, timedelta
from pathlib import Path

import pytest
from pomiary_generator.openmeteo import OpenMeteoError, build_url, fetch_hourly, parse_hourly, past_days_for

FIXTURES = Path(__file__).parent / "fixtures"
DOCUMENT = json.loads((FIXTURES / "open_meteo_suwalki.json").read_text())
NOW = datetime(2026, 10, 9, 17, 30, tzinfo=UTC)
ALL = ["precipitation", "air-temperature", "soil-temperature", "soil-moisture"]


def test_url() -> None:
    url = build_url("suwalki", ["soil-moisture"], 3)
    assert "latitude=54.1118&longitude=22.9309" in url
    assert "hourly=soil_moisture_3_to_9cm" in url
    assert "past_days=3&forecast_days=1&timezone=UTC" in url


def test_parse_has_all_quantities_oldest_first_utc() -> None:
    parsed = parse_hourly(DOCUMENT, ALL, NOW)
    assert set(parsed) == set(ALL)
    times = [t for t, _ in parsed["air-temperature"]]
    assert times == sorted(times)
    assert times[0] == datetime(2026, 10, 8, 0, tzinfo=UTC)
    assert all(t.tzinfo is not None for t in times)


def test_no_future_hours() -> None:
    parsed = parse_hourly(DOCUMENT, ALL, NOW)
    for points in parsed.values():
        assert all(t <= NOW for t, _ in points)
    assert parsed["precipitation"][-1][0] == datetime(2026, 10, 9, 17, tzinfo=UTC)


def test_soil_moisture_is_converted_to_percent() -> None:
    raw = DOCUMENT["hourly"]["soil_moisture_3_to_9cm"][0]
    parsed = parse_hourly(DOCUMENT, ["soil-moisture"], NOW)
    assert parsed["soil-moisture"][0][1] == pytest.approx(raw * 100, abs=0.001)
    assert 0 < parsed["soil-moisture"][0][1] <= 100


def test_other_quantities_are_not_scaled() -> None:
    raw = DOCUMENT["hourly"]["temperature_2m"][5]
    assert parse_hourly(DOCUMENT, ["air-temperature"], NOW)["air-temperature"][5][1] == pytest.approx(raw)


def test_nulls_are_skipped() -> None:
    document = json.loads(json.dumps(DOCUMENT))
    document["hourly"]["precipitation"][0] = None
    parsed = parse_hourly(document, ["precipitation"], NOW)["precipitation"]
    assert parsed[0][0] == datetime(2026, 10, 8, 1, tzinfo=UTC)


def test_unexpected_document() -> None:
    with pytest.raises(OpenMeteoError):
        parse_hourly({"error": True}, ["precipitation"], NOW)
    with pytest.raises(OpenMeteoError):
        parse_hourly({"hourly": {"time": []}}, ["precipitation"], NOW)


def test_past_days_covers_the_window_and_is_capped() -> None:
    assert past_days_for(24, NOW, NOW) == 2
    assert past_days_for(720, NOW, NOW) == 31
    assert past_days_for(10_000, NOW, NOW) == 92
    assert past_days_for(1, NOW, NOW - timedelta(days=5)) >= 6


@pytest.mark.live
def test_live_open_meteo() -> None:
    now = datetime.now(UTC)
    hourly = fetch_hourly("chelm", ["air-temperature", "soil-moisture"], 1, now)
    assert len(hourly["air-temperature"]) >= 24
    assert all(t <= now for t, _ in hourly["air-temperature"])
