"""Writes the golden output for a DSE fixture using the live Python parser.

    python -I services/price-feed/tests/tools/gen_expected.py <fixture.json> <out.json>

The Rust transform must reproduce this output exactly (tests/transform_golden.rs).
Re-run whenever scripts/vps/scrapers/market_sync.py changes.
"""
import json
import os
import sys

REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", ".."))
sys.path.insert(0, os.path.join(REPO, "scripts", "vps", "scrapers"))

import market_sync  # noqa: E402

with open(sys.argv[1], encoding="utf-8") as f:
    data = json.load(f)
stocks, status = market_sync.parse_new_dse_payload(data, exclude_gov=True, public_only=False)
with open(sys.argv[2], "w", encoding="utf-8") as f:
    json.dump({"stocks": stocks, "marketStatus": status}, f, indent=1)
print(len(stocks), "stocks,", "status", status)
