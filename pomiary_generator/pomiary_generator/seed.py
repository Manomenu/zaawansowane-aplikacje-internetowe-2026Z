"""The `seed` command: the sample data (F11), entered through the API like any sensor would."""

from collections.abc import Callable
from datetime import datetime, timedelta

from pomiary_generator.client import Api, ApiError
from pomiary_generator.openmeteo import PLACES, QUANTITIES, Hourly, OpenMeteoError, fetch_hourly
from pomiary_generator.send import Emit, Point, Stats, deliver, synthetic_points
from pomiary_generator.synthetic import Synthetic
from pomiary_generator.timeparse import backfill_times

PLACE_TITLES = {"warsaw": "Warsaw", "suwalki": "Suwałki", "chelm": "Chełm"}
QUANTITY_TITLES = {
    "precipitation": "Precipitation",
    "air-temperature": "Air temperature",
    "soil-temperature": "Soil temperature",
    "soil-moisture": "Soil moisture",
}
# Colour tells the place apart, the marker the quantity: two channels, never colour alone (T6).
PLACE_COLORS = {"warsaw": "#1f77b4", "suwalki": "#d95f02", "chelm": "#1b9e77"}
QUANTITY_ICONS = {"precipitation": "circle", "air-temperature": "square", "soil-temperature": "triangle", "soil-moisture": "diamond"}
# The fallback when Open-Meteo is down: a plausible daily wave (or random drizzle) per quantity.
SYNTHETIC_RANGES = {
    "precipitation": (0.0, 3.0),
    "air-temperature": (2.0, 18.0),
    "soil-temperature": (4.0, 14.0),
    "soil-moisture": (25.0, 45.0),
}

Fetch = Callable[[str, list[str], int, datetime], Hourly]


def series_name(place: str, quantity: str) -> str:
    return f"{PLACE_TITLES[place]}: {QUANTITY_TITLES[quantity]}"


def legacy_series_name(place: str, quantity: str) -> str:
    """The name before the rename (`Precipitation — Warsaw`); old data is still cleaned up."""
    return f"{QUANTITY_TITLES[quantity]} — {PLACE_TITLES[place]}"


def owned_names() -> set[str]:
    pairs = [(place, quantity) for place in PLACES for quantity in QUANTITIES]
    return {series_name(*pair) for pair in pairs} | {legacy_series_name(*pair) for pair in pairs}


def sensor_name(place: str, quantity: str, source: str) -> str:
    return f"{'open-meteo' if source == 'open-meteo' else 'synthetic'}/{place}/{quantity}"


def _synthetic(quantity: str, now: datetime, days: int) -> list[Point]:
    low, high = SYNTHETIC_RANGES[quantity]
    shape = "random" if quantity == "precipitation" else "sine"
    generator = Synthetic(shape, low, high, noise=(high - low) * 0.05, seed=sum(map(ord, quantity)))
    hour = now.replace(minute=0, second=0, microsecond=0)
    return synthetic_points(generator, backfill_times(days * 24, timedelta(hours=1), hour))


def run_seed(  # noqa: PLR0913, PLR0917
    api: Api,
    username: str,
    password: str,
    days: int,
    source: str,
    now: datetime,
    emit: Emit,
    fetch: Fetch = fetch_hourly,
) -> int:
    """Replace the sample data: delete the 12 series seed owns, create them anew, backfill `days` of hourly values."""
    try:
        token = api.login(username, password)
        owned = owned_names()
        doomed = [s for s in api.list_series(token) if str(s.get("name")) in owned]
        for old in doomed:  # a failure stops here, before anything is created
            api.delete_series(token, old["id"])
        emit(f"deleted {len(doomed)} sample series (and their sensors and measurements)")
        keys: list[tuple[str, str]] = []
        stats = Stats()
        for place in PLACES:
            hourly: Hourly = {}
            for quantity, spec in QUANTITIES.items():
                name = series_name(place, quantity)
                series = api.create_series(
                    token,
                    {
                        "name": name,
                        "minValue": spec.low,
                        "maxValue": spec.high,
                        "color": PLACE_COLORS[place],
                        "icon": QUANTITY_ICONS[quantity],
                        "unit": spec.unit,
                    },
                )
                emit(f"created series: {name}")
                if not hourly and source == "open-meteo":
                    hourly = fetch(place, list(QUANTITIES), days + 1, now)
                points = hourly[quantity] if source == "open-meteo" else _synthetic(quantity, now, days)
                points = points[-days * 24 :]
                key = api.create_sensor(token, sensor_name(place, quantity, source), series["id"])
                keys.append((sensor_name(place, quantity, source), key))
                emit(f"{name}: sending {len(points)} values")
                for when, value in points:
                    outcome = deliver(api, key, value, when, dry_run=False, emit=lambda _line: None, stats=stats)
                    if outcome.kind != "ok":
                        emit(f"  {outcome.kind}: {outcome.message}")
                        if outcome.kind in ("unauthorized", "network"):
                            break
    except (ApiError, OpenMeteoError) as error:
        emit(f"seed failed: {error}")
        return 1
    emit(f"Done: {stats.sent} values sent, {stats.problems} problems.")
    if keys:
        emit("Sensor API keys (shown only now, the server keeps only hashes; save them if you want to use `send`):")
        for name, key in keys:
            emit(f"  {name}  {key}")
    return stats.exit_code
