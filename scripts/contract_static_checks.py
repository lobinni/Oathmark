"""
Static release checks for contracts/oathmark.py.

These checks complement the GenVM linter: they enforce invariants that are
cheap to verify without a GenLayer runtime.

Run with:

    python3 scripts/contract_static_checks.py
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

CONTRACT = Path(__file__).resolve().parents[1] / "contracts" / "oathmark.py"

FORBIDDEN_PATTERNS = [
    (r"\bimport\s+(os|sys|subprocess|socket|requests|urllib)\b", "forbidden import"),
    (r"\b(eval|exec)\s*\(", "dynamic code execution"),
    (r"PRIVATE[_ ]?KEY", "secret reference"),
    (r"0x[0-9a-fA-F]{64}\b", "embedded raw private material"),
]

REQUIRED_SNIPPETS = [
    '# { "Depends": "py-genlayer:',
    "class Oathmark(gl.Contract)",
    "run_nondet_unsafe",
    '"/.well-known/oathmark.json"',
    "AUTHORITY_SCHEMA",
    "@gl.public.write",
    "@gl.public.view",
    "MAX_SOURCE_CHARS",
    "MAX_TOTAL_SOURCE_CHARS",
]

REQUIRED_METHODS = [
    "create_draft",
    "update_draft",
    "cancel_draft",
    "activate_baseline",
    "propose_revision",
    "activate_revision",
    "run_checkpoint",
    "archive_pledge",
    "exercise_right",
    "get_pledge",
    "list_pledge_ids",
    "list_creator_pledge_ids",
    "get_policy_digest",
]


def main() -> int:
    source = CONTRACT.read_text(encoding="utf-8")
    failures = []

    for pattern, label in FORBIDDEN_PATTERNS:
        if re.search(pattern, source):
            failures.append(f"{label}: pattern {pattern!r} found")

    for snippet in REQUIRED_SNIPPETS:
        if snippet not in source:
            failures.append(f"missing required snippet: {snippet!r}")

    for method in REQUIRED_METHODS:
        if not re.search(rf"def {method}\(", source):
            failures.append(f"missing required method: {method}")

    class_count = len(re.findall(r"class\s+\w+\(gl\.Contract\)", source))
    if class_count != 1:
        failures.append(f"expected exactly one gl.Contract subclass, found {class_count}")

    if failures:
        for failure in failures:
            print(f"FAIL  {failure}")
        return 1
    print("contract static checks passed")
    return 0


if __name__ == "__main__":
    sys.exit(main())
