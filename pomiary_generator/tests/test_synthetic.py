from datetime import UTC, datetime, timedelta
from itertools import pairwise

import pytest
from pomiary_generator.synthetic import SHAPES, Shape, Synthetic

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
