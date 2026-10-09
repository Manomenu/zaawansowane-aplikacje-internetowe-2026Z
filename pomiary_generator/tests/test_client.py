import socket
from datetime import UTC, datetime, timedelta
from typing import Any

from pomiary_generator.client import Api, problem_message
from pomiary_generator.send import Stats, deliver, run_backfill, run_live

Fake = tuple[Any, str]


def make_series(state: Any, low: float = 0, high: float = 100) -> None:
    state.series.append({"id": 1, "name": "s", "minValue": low, "maxValue": high})
    state.sensors["good-key"] = 1


def test_created_value_is_sent_with_key_and_timestamp(fake: Fake) -> None:
    state, url = fake
    make_series(state)
    outcome = Api(url).send_measurement("good-key", 12.3, datetime(2026, 10, 9, 10, tzinfo=UTC))
    assert (outcome.kind, outcome.status, outcome.timestamp) == ("ok", 201, "2026-10-09T10:00:00Z")
    method, path, headers, body = state.requests[-1]
    assert (method, path, headers["X-Api-Key"]) == ("POST", "/api/measurements", "good-key")
    assert body == {"value": 12.3, "timestamp": "2026-10-09T10:00:00Z"}


def test_live_value_has_no_timestamp(fake: Fake) -> None:
    state, url = fake
    make_series(state)
    Api(url).send_measurement("good-key", 1.0, None)
    assert state.requests[-1][3] == {"value": 1.0}


def test_out_of_range_is_rejected_with_a_readable_message(fake: Fake) -> None:
    state, url = fake
    make_series(state)
    lines: list[str] = []
    outcome = deliver(Api(url), "good-key", 120, None, dry_run=False, emit=lines.append, stats=Stats())
    assert outcome.kind == "rejected"
    assert lines[0].startswith("REJECTED 422: value 120 is outside the series range [0, 100]")
    assert not state.measurements


def test_backfill_goes_on_after_a_rejection_and_exits_nonzero(fake: Fake) -> None:
    state, url = fake
    make_series(state, 0, 10)
    when = datetime(2026, 10, 9, tzinfo=UTC)
    lines: list[str] = []
    code = run_backfill(Api(url), "good-key", [(when, 5), (when, 50), (when, 6)], dry_run=False, emit=lines.append)
    assert code == 1
    assert [m["value"] for m in state.measurements] == [5, 6]
    assert lines[-1] == "Done: 2 sent, 1 problems."


def test_unauthorized_stops_with_a_clear_message(fake: Fake) -> None:
    state, url = fake
    make_series(state)
    when = datetime(2026, 10, 9, tzinfo=UTC)
    lines: list[str] = []
    code = run_backfill(Api(url), "bad-key", [(when, 1), (when, 2), (when, 3)], dry_run=False, emit=lines.append)
    assert code == 1
    assert len(state.requests) == 1
    assert "invalid or the sensor was unregistered" in lines[0]


def closed_port() -> int:
    with socket.socket() as probe:
        probe.bind(("127.0.0.1", 0))
        return probe.getsockname()[1]


def test_network_error_stops_a_backfill() -> None:
    lines: list[str] = []
    when = datetime(2026, 10, 9, tzinfo=UTC)
    code = run_backfill(Api(f"http://127.0.0.1:{closed_port()}"), "k", [(when, 1), (when, 2)], dry_run=False, emit=lines.append)
    assert code == 1
    assert sum(line.startswith("NETWORK ERROR") for line in lines) == 1


def test_network_error_in_live_mode_retries_next_interval() -> None:
    lines: list[str] = []
    sleeps: list[float] = []
    code = run_live(
        Api(f"http://127.0.0.1:{closed_port()}"),
        "k",
        lambda _now: 1.0,
        timedelta(seconds=5),
        3,
        dry_run=False,
        emit=lines.append,
        sleep=sleeps.append,
    )
    assert code == 1
    assert sum(line.startswith("NETWORK ERROR") for line in lines) == 3
    assert sleeps == [5.0, 5.0]


def test_live_sends_count_values(fake: Fake) -> None:
    state, url = fake
    make_series(state)
    code = run_live(
        Api(url), "good-key", lambda _now: 7.0, timedelta(seconds=1), 2, dry_run=False, emit=lambda _l: None, sleep=lambda _s: None
    )
    assert code == 0
    assert len(state.measurements) == 2


def test_dry_run_does_not_touch_the_network() -> None:
    lines: list[str] = []
    when = datetime(2026, 10, 9, tzinfo=UTC)
    code = run_backfill(Api("http://127.0.0.1:1"), "", [(when, 1.5)], dry_run=True, emit=lines.append)
    assert code == 0
    assert lines[0] == "DRY-RUN 2026-10-09T00:00:00Z 1.5"


def test_problem_message_uses_detail_then_errors() -> None:
    body = {"title": "Bad Request", "detail": "invalid body", "errors": [{"field": "value", "message": "must be a number"}]}
    assert problem_message(400, body) == "invalid body; value: must be a number"
    assert problem_message(500, None) == "HTTP 500"
    assert problem_message(422, {"title": "Unprocessable"}) == "Unprocessable"
