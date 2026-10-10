"""Synthetic value shapes; every value stays inside [low, high]."""

import math
import random
from dataclasses import dataclass, field
from datetime import datetime
from typing import Literal

Shape = Literal["constant", "random", "sine", "random-walk"]
SHAPES: tuple[Shape, ...] = ("constant", "random", "sine", "random-walk")

# Default sine period per mode. Live: half a period (maximum to minimum) is 30 s, visible in a demo.
# Backfill: a daily cycle across hourly values.
LIVE_PERIOD_SECONDS = 60.0
BACKFILL_PERIOD_SECONDS = 24 * 3600.0


@dataclass
class Synthetic:
    """A value source. `seed` makes it reproducible."""

    shape: Shape
    low: float
    high: float
    period_seconds: float = BACKFILL_PERIOD_SECONDS
    noise: float = 0.0
    seed: int | None = None
    _rng: random.Random = field(init=False)
    _walk: float = field(init=False)

    def __post_init__(self) -> None:
        if self.low > self.high:
            msg = f"--min ({self.low}) must not exceed --max ({self.high})"
            raise ValueError(msg)
        self._rng = random.Random(self.seed)  # noqa: S311  (not for security)
        self._walk = (self.low + self.high) / 2

    def _clamp(self, value: float) -> float:
        return round(min(self.high, max(self.low, value)), 3)

    def value(self, moment: datetime) -> float:
        """The value for `moment`; only `sine` depends on it, and its phase is the wall-clock time."""
        mid = (self.low + self.high) / 2
        half = (self.high - self.low) / 2
        if self.shape == "constant":
            raw = mid
        elif self.shape == "random":
            raw = self._rng.uniform(self.low, self.high)
        elif self.shape == "sine":
            phase = 2 * math.pi * moment.timestamp() / self.period_seconds
            raw = mid + half * math.sin(phase)
        else:
            self._walk = min(self.high, max(self.low, self._walk + self._rng.gauss(0, half * 0.1)))
            raw = self._walk
        if self.noise > 0:
            raw += self._rng.gauss(0, self.noise)
        return self._clamp(raw)
