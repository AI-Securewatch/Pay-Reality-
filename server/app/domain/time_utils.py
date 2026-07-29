"""Shared timestamp formatting used anywhere a datetime is compared inside
Rego. Split out of the legacy domain/compiler/compiler.py (retired,
PHASE_0.md) since intent_service.py depends on it for the current,
live Compiler V2 pipeline too -- it was never actually legacy-specific.
"""

from datetime import datetime, timezone


def to_utc_iso(dt: datetime) -> str:
    """Normalize to a UTC-offset ISO8601 string.

    Required because a compiled Rego module compares timestamps with
    plain string `<=`/`>=`, which is lexicographic, not chronological.
    Two otherwise-correct ISO8601 timestamps with different UTC offsets
    (e.g. "...19:49:27+02:00" vs "...17:50:49+00:00") do NOT compare
    correctly as strings even though they represent nearby instants:
    every timestamp that ever reaches a Rego comparison must be rendered
    in this exact same offset for lexicographic order to match
    chronological order.
    """
    return dt.astimezone(timezone.utc).isoformat()
