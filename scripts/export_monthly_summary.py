#!/usr/bin/env python3
"""Export the monthly vehicle summary used by the static portfolio preview.

The database connection is read from DATABASE_URL or POSTGRES_DSN. Neither
value is written to the output or printed by this script.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path


QUERY = """
SELECT
    registration_month,
    CASE
        WHEN lower(trim(vehicle_category)) = 'ev' THEN 'EV'
        WHEN lower(trim(vehicle_category)) = 'ice' THEN 'ICE'
        WHEN lower(trim(vehicle_category)) = 'hybrid' THEN 'Hybrid'
        ELSE 'Other'
    END AS vehicle_category,
    SUM(total_registrations) AS total_registrations
FROM monthly_vehicle_summary
GROUP BY registration_month,
         CASE
             WHEN lower(trim(vehicle_category)) = 'ev' THEN 'EV'
             WHEN lower(trim(vehicle_category)) = 'ice' THEN 'ICE'
             WHEN lower(trim(vehicle_category)) = 'hybrid' THEN 'Hybrid'
             ELSE 'Other'
         END
ORDER BY registration_month, vehicle_category
"""


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--output",
        type=Path,
        default=Path("data/monthly_summary.json"),
        help="JSON output path (default: data/monthly_summary.json)",
    )
    return parser.parse_args()


def load_connection():
    dsn = os.environ.get("DATABASE_URL") or os.environ.get("POSTGRES_DSN")
    if not dsn:
        raise RuntimeError("Set DATABASE_URL or POSTGRES_DSN in the environment before exporting.")
    try:
        import psycopg  # type: ignore[import-not-found]
    except ImportError as exc:
        raise RuntimeError("Install psycopg[binary] in the project's Python environment.") from exc
    return psycopg.connect(dsn)


def export_summary(output: Path) -> int:
    with load_connection() as connection, connection.cursor() as cursor:
        cursor.execute(QUERY)
        rows = cursor.fetchall()

    records = [
        {
            "registration_month": row[0].isoformat()[:7] if hasattr(row[0], "isoformat") else str(row[0])[:7],
            "vehicle_category": row[1],
            "total_registrations": int(row[2]),
        }
        for row in rows
    ]
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(records, indent=2) + "\n", encoding="utf-8")
    print(f"Exported {len(records)} monthly category rows to {output}")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(export_summary(parse_args().output))
    except Exception as error:
        print(f"Export failed: {error}", file=sys.stderr)
        raise SystemExit(1)
