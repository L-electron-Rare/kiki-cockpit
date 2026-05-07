"""Persist sample flags as append-only JSONL per domain.

Layout: <flags_dir>/<domain>.jsonl
Each line is a JSON object:
  - Flag record: {"idx": N, "reason": "...", "flagged_at": "ISO", "flagged_by": "..."|null}
  - Delete tombstone: {"idx": N, "deleted": true}

On read, all lines are replayed; last record per idx wins.
Tombstones filter out the entry.
"""
from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path

from ailiance_demo.models.dataset import Flag


class DatasetFlagsService:
    def __init__(self, flags_dir: Path) -> None:
        self.flags_dir = flags_dir

    def list_flags(self, domain: str) -> list[Flag]:
        """Return all active flags for *domain* (tombstones excluded)."""
        path = self._path(domain)
        if not path.exists():
            return []
        records: dict[int, Flag | None] = {}
        with path.open() as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                try:
                    obj = json.loads(line)
                except json.JSONDecodeError:
                    continue
                idx = obj.get("idx")
                if idx is None:
                    continue
                if obj.get("deleted"):
                    records[idx] = None
                else:
                    records[idx] = Flag(
                        idx=idx,
                        reason=obj.get("reason", ""),
                        flagged_at=datetime.fromisoformat(obj["flagged_at"]),
                        flagged_by=obj.get("flagged_by"),
                    )
        return [f for f in records.values() if f is not None]

    def add_flag(self, domain: str, idx: int, reason: str, flagged_by: str | None) -> Flag:
        """Append a flag record and return the created Flag."""
        flag = Flag(
            idx=idx,
            reason=reason,
            flagged_at=datetime.now(tz=timezone.utc),
            flagged_by=flagged_by,
        )
        self._append(
            domain,
            {
                "idx": idx,
                "reason": reason,
                "flagged_at": flag.flagged_at.isoformat(),
                "flagged_by": flagged_by,
            },
        )
        return flag

    def delete_flag(self, domain: str, idx: int) -> bool:
        """Write a tombstone for *idx*. Returns False if not currently flagged."""
        existing = {f.idx for f in self.list_flags(domain)}
        if idx not in existing:
            return False
        self._append(domain, {"idx": idx, "deleted": True})
        return True

    # ------------------------------------------------------------------ helpers

    def _path(self, domain: str) -> Path:
        return self.flags_dir / f"{domain}.jsonl"

    def _append(self, domain: str, record: dict) -> None:
        self.flags_dir.mkdir(parents=True, exist_ok=True)
        with self._path(domain).open("a") as f:
            f.write(json.dumps(record) + "\n")
