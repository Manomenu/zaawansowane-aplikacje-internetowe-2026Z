from datetime import UTC, datetime, timedelta
from itertools import pairwise

import pytest
from pomiary_generator.synthetic import BACKFILL_PERIOD_SECONDS, LIVE_PERIOD_SECONDS, SHAPES, Shape, Synthetic

START = datetime(2026, 10, 1, tzinfo=UTC)
TIMES = [START + timedelta(hours=i) for i in range(200)]


@pytest.mark.parametrize("shape", SHAPES)
def test_values_stay_within_range_even_with_noise(shape: Shape) -> None:
    source = Synthetic(shape, -5, 7, noise=10, seed=1)
    assert all(-5 <= source.value(t) <= 7 for t in TIMES)


@pytest.mark.parametrize("shape", SHAPES)
def test_seed_makes_values_reproducible(shape: Shape) -> None:
    first = [Synthetic(shape, 0, 100, noise=2, seed=42).value(t) for t in TIMES]
    second = [Synthetic(shape, 0, 100, noise=2, seed=42).value(t) for t in TIMES]
    assert first == second


def test_different_seeds_differ() -> None:
    a = [Synthetic("random", 0, 100, seed=1).value(t) for t in TIMES]
    b = [Synthetic("random", 0, 100, seed=2).value(t) for t in TIMES]
    assert a != b


def test_constant_is_the_middle() -> None:
    assert {Synthetic("constant", 0, 10).value(t) for t in TIMES} == {5.0}


def test_sine_has_the_period_and_reaches_the_extremes() -> None:
    source = Synthetic("sine", 0, 10, period_seconds=24 * 3600)
    values = [source.value(START + timedelta(hours=h)) for h in range(24)]
    assert max(values) == pytest.approx(10, abs=0.1)
    assert min(values) == pytest.approx(0, abs=0.1)
    assert source.value(START) == source.value(START + timedelta(hours=24))


def test_random_walk_moves_in_small_steps() -> None:
    source = Synthetic("random-walk", 0, 100, seed=3)
    values = [source.value(t) for t in TIMES]
    assert max(abs(b - a) for a, b in pairwise(values)) < 50


def test_min_above_max_is_an_error() -> None:
    with pytest.raises(ValueError, match="--min"):
        Synthetic("random", 10, 0)


def _live_values(source: Synthetic, seconds: int) -> list[float]:
    clock = START  # injected clock: one tick per second, no sleeping
    return [source.value(clock + timedelta(seconds=s)) for s in range(seconds + 1)]


def test_default_periods_per_mode() -> None:
    assert LIVE_PERIOD_SECONDS == 60
    assert BACKFILL_PERIOD_SECONDS == 24 * 3600
    assert Synthetic("sine", 0, 1).period_seconds == BACKFILL_PERIOD_SECONDS


def test_live_sine_spans_the_range_and_falls_in_half_a_period() -> None:
    source = Synthetic("sine", 10, 90, period_seconds=LIVE_PERIOD_SECONDS)
    values = _live_values(source, 60)
    assert max(values) == pytest.approx(90, abs=0.01)
    assert min(values) == pytest.approx(10, abs=0.01)
    peak = values.index(max(values))
    assert values.index(min(values)) - peak == 30


def test_live_sine_phase_depends_only_on_the_clock() -> None:
    first = Synthetic("sine", 0, 100, period_seconds=LIVE_PERIOD_SECONDS)
    second = Synthetic("sine", 0, 100, period_seconds=LIVE_PERIOD_SECONDS)
    second.value(START)  # a generator that started earlier
    moment = START + timedelta(seconds=17)
    assert first.value(moment) == second.value(moment)


def test_noise_applies_to_the_live_sine() -> None:
    plain = _live_values(Synthetic("sine", 0, 100, period_seconds=60), 30)
    noisy = _live_values(Synthetic("sine", 0, 100, period_seconds=60, noise=3, seed=1), 30)
    assert plain != noisy
