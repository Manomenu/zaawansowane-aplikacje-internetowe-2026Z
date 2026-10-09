"""Real data from Open-Meteo (https://open-meteo.com, CC BY 4.0).

The forecast endpoint with `past_days` is used, not the archive API: the archive lags days
behind, the forecast endpoint serves the recent past up to the current hour.
"""

import json
import math
import urllib.error
import urllib.request
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta

from pomiary_generator.jsonutil import as_dict, as_list

BASE_URL = "https://api.open-meteo.com/v1/forecast"
MAX_PAST_DAYS = 92
TIMEOUT_SECONDS = 20


class OpenMeteoError(Exception):
    """Open-Meteo is unreachable or answered something unexpected."""


@dataclass(frozen=True)
class Place:
    latitude: float
    longitude: float


@dataclass(frozen=True)
class Quantity:
    variable: str  # Open-Meteo hourly variable
    factor: float  # multiplier into the series unit
    unit: str
    low: float  # the series range the app is seeded with
    high: float


PLACES: dict[str, Place] = {
    "warsaw": Place(52.2297, 21.0122),
    "suwalki": Place(54.1118, 22.9309),
    "chelm": Place(51.1431, 23.4716),
}

QUANTITIES: dict[str, Quantity] = {
    "precipitation": Quantity("precipitation", 1.0, "mm", 0, 100),
    "air-temperature": Quantity("temperature_2m", 1.0, "°C", -40, 45),
    "soil-temperature": Quantity("soil_temperature_6cm", 1.0, "°C", -20, 40),
    "soil-moisture": Quantity("soil_moisture_3_to_9cm", 100.0, "% vol", 0, 100),  # m³/m³ -> % vol
}

Hourly = dict[str, list[tuple[datetime, float]]]  # quantity -> hourly (UTC instant, value), oldest first


def build_url(place: str, quantities: list[str], past_days: int) -> str:
    where = PLACES[place]
    variables = ",".join(QUANTITIES[q].variable for q in quantities)
    return (
        f"{BASE_URL}?latitude={where.latitude}&longitude={where.longitude}&hourly={variables}"
        f"&past_days={past_days}&forecast_days=1&timezone=UTC"
    )


def past_days_for(hours: int, now: datetime, end: datetime) -> int:
    """Days of history to ask for so that `hours` hourly values ending at `end` are covered."""
    start = end - timedelta(hours=hours)
    return min(MAX_PAST_DAYS, max(1, math.ceil((now - start) / timedelta(days=1)) + 1))


def parse_hourly(document: object, quantities: list[str], now: datetime) -> Hourly:
    """Hourly values per quantity, converted to series units, never later than `now`; nulls skipped."""
    root = as_dict(document)
    hourly = as_dict(root.get("hourly")) if root else None
    times = as_list(hourly.get("time")) if hourly else None
    if hourly is None or times is None:
        msg = "unexpected Open-Meteo response: no hourly time series"
        raise OpenMeteoError(msg)
    instants = [datetime.fromisoformat(str(t)).replace(tzinfo=UTC) for t in times]
    result: Hourly = {}
    for name in quantities:
        spec = QUANTITIES[name]
        values = as_list(hourly.get(spec.variable))
        if values is None or len(values) != len(instants):
            msg = f"unexpected Open-Meteo response: variable {spec.variable} missing"
            raise OpenMeteoError(msg)
        result[name] = [
            (when, round(float(v) * spec.factor, 3))
            for when, v in zip(instants, values, strict=True)
            if when <= now and isinstance(v, int | float)
        ]
    return result


def fetch_hourly(place: str, quantities: list[str], past_days: int, now: datetime) -> Hourly:
    """One HTTP call for all `quantities` of `place`."""
    url = build_url(place, quantities, past_days)
    try:
        with urllib.request.urlopen(url, timeout=TIMEOUT_SECONDS) as response:  # noqa: S310  (fixed https URL)
            document: object = json.load(response)
    except (urllib.error.URLError, OSError, ValueError) as error:
        msg = f"cannot fetch Open-Meteo data: {error}"
        raise OpenMeteoError(msg) from error
    return parse_hourly(document, quantities, now)
