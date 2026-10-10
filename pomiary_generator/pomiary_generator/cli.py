"""Command line: `python -m pomiary_generator send|seed`."""

import argparse
import os
import sys
from collections.abc import Callable, Sequence
from datetime import datetime

from pomiary_generator.client import Api
from pomiary_generator.openmeteo import PLACES, QUANTITIES, OpenMeteoError
from pomiary_generator.seed import run_seed
from pomiary_generator.send import (
    Emit,
    LiveOpenMeteo,
    emit_stdout,
    now_utc,
    open_meteo_points,
    run_backfill,
    run_live,
    synthetic_points,
)
from pomiary_generator.synthetic import BACKFILL_PERIOD_SECONDS, LIVE_PERIOD_SECONDS, SHAPES, Synthetic
from pomiary_generator.timeparse import backfill_times, parse_duration, parse_instant

SEND_HELP = """\
Send one sensor's measurements to POST {api}/api/measurements.

Backfill (past timestamps, oldest first):  --count N [--step 1h] [--end now]
Live (the current value, server-stamped):  --interval 5s [--count N]   (forever without --count)

Open-Meteo data is hourly. In backfill the last N hourly values up to --end are sent with their own
timestamps (--step is ignored). In live mode the latest hourly value is sent with the current time,
so a short --interval repeats the same value until the hour changes.
Weather data by Open-Meteo.com (CC BY 4.0).
"""


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="python -m pomiary_generator", description="Pomiary sensor emulator.")
    commands = parser.add_subparsers(dest="command", required=True)

    send = commands.add_parser(
        "send", help="send one sensor's measurements", description=SEND_HELP, formatter_class=argparse.RawDescriptionHelpFormatter
    )
    send.add_argument("--api", default=os.environ.get("POMIARY_API"), help="API base URL, e.g. http://localhost:8092 (env POMIARY_API)")
    send.add_argument("--api-key", default=os.environ.get("POMIARY_API_KEY"), help="the sensor's API key (env POMIARY_API_KEY)")
    send.add_argument("--count", type=int, help="number of values (backfill) or of sends (live; default forever)")
    send.add_argument("--step", default="1h", help="backfill: time between values (default 1h)")
    send.add_argument("--end", default="now", help="backfill: time of the newest value, ISO 8601 or now (default now)")
    send.add_argument("--interval", help="live: time between sends, e.g. 5s")
    send.add_argument("--source", choices=["synthetic", "open-meteo"], default="synthetic")
    send.add_argument("--shape", choices=SHAPES, default="random", help="synthetic: value shape (default random)")
    send.add_argument("--min", dest="low", type=float, default=0.0, help="synthetic: lowest value (default 0)")
    send.add_argument("--max", dest="high", type=float, default=100.0, help="synthetic: highest value (default 100)")
    send.add_argument("--period", help="synthetic sine: period (default 60s live, 24h backfill)")
    send.add_argument("--noise", type=float, default=0.0, help="synthetic: standard deviation of added noise (default 0)")
    send.add_argument("--seed", type=int, help="synthetic: random seed for reproducible values")
    send.add_argument("--place", choices=list(PLACES), help="open-meteo: place")
    send.add_argument("--quantity", choices=list(QUANTITIES), help="open-meteo: quantity")
    send.add_argument("--dry-run", action="store_true", help="print what would be sent, no network for the API")

    seed = commands.add_parser("seed", help="create the 12 sample series and sensors and fill them (F11)")
    seed.add_argument("--api", default=os.environ.get("POMIARY_API"), help="API base URL (env POMIARY_API)")
    seed.add_argument("--user", default=os.environ.get("POMIARY_ADMIN_USER"), help="administrator (env POMIARY_ADMIN_USER)")
    seed.add_argument("--password", default=os.environ.get("POMIARY_ADMIN_PASSWORD"), help="password (env POMIARY_ADMIN_PASSWORD)")
    seed.add_argument("--days", type=int, default=30, help="days of hourly values per series (default 30)")
    seed.add_argument(
        "--source", choices=["open-meteo", "synthetic"], default="open-meteo", help="synthetic = fallback when Open-Meteo is down"
    )
    return parser


def _fail(message: str) -> int:
    sys.stderr.write(f"error: {message}\n")
    return 2


def run_send(args: argparse.Namespace, emit: Emit, now: datetime) -> int:  # noqa: PLR0911
    api_url: str | None = args.api
    key: str | None = args.api_key
    if not args.dry_run:
        if not api_url:
            return _fail("no API address: use --api or the environment variable POMIARY_API")
        if not key:
            return _fail("no API key: use --api-key or the environment variable POMIARY_API_KEY")
    api = Api(api_url or "")
    key = key or ""
    live = args.interval is not None
    count: int | None = args.count
    if not live and count is None:
        return _fail("give --count N (backfill) or --interval 5s (live)")
    if count is not None and count < 1:
        return _fail("--count must be at least 1")
    if args.source == "open-meteo" and not (args.place and args.quantity):
        return _fail("--source open-meteo needs --place and --quantity")
    try:
        interval = parse_duration(args.interval) if live else None
        step = parse_duration(args.step)
        end = parse_instant(args.end, now)
        default_period = LIVE_PERIOD_SECONDS if live else BACKFILL_PERIOD_SECONDS
        period = parse_duration(args.period).total_seconds() if args.period else default_period
        synthetic = Synthetic(args.shape, args.low, args.high, period, args.noise, args.seed)
        value_at: Callable[[datetime], float] = synthetic.value
        if interval is not None:
            if args.source == "open-meteo":
                value_at = LiveOpenMeteo(args.place, args.quantity).value
            return run_live(api, key, value_at, interval, count, dry_run=args.dry_run, emit=emit)
        if count is None:  # unreachable: checked above
            return _fail("give --count N")
        if args.source == "open-meteo":
            points = open_meteo_points(args.place, args.quantity, count, end, now)
        else:
            points = synthetic_points(synthetic, backfill_times(count, step, end))
    except (ValueError, OpenMeteoError) as error:
        return _fail(str(error))
    return run_backfill(api, key, points, dry_run=args.dry_run, emit=emit)


def run_seed_command(args: argparse.Namespace, emit: Emit, now: datetime) -> int:
    if not (args.api and args.user and args.password):
        return _fail("seed needs --api, --user and --password (or POMIARY_API, POMIARY_ADMIN_USER, POMIARY_ADMIN_PASSWORD)")
    if args.days < 1:
        return _fail("--days must be at least 1")
    return run_seed(Api(args.api), args.user, args.password, args.days, args.source, now, emit)


def main(argv: Sequence[str] | None = None, emit: Emit = emit_stdout) -> int:
    args = build_parser().parse_args(argv)
    try:
        if args.command == "send":
            return run_send(args, emit, now_utc())
        return run_seed_command(args, emit, now_utc())
    except KeyboardInterrupt:
        emit("Interrupted.")
        return 130
