from typing import Any

import pytest
from pomiary_generator.cli import main


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
