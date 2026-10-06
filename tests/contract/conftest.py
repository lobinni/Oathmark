"""
Test harness for the Oathmark intelligent contract.

The GenLayer runtime is not importable in a plain Python environment, so this
fixture installs a faithful in-memory stub of `genlayer` before loading
contracts/oathmark.py. The stub provides:

- TreeMap / DynArray / u256 storage primitives
- gl.public.write / gl.public.view decorators (pass-through)
- gl.nondet.web.get and gl.nondet.exec_prompt, both scriptable per test
- gl.vm.run_nondet_unsafe, executed as the leader function
- gl.message.sender_address and gl.message_raw["datetime"], both settable

This lets the tests drive full pledge lifecycles deterministically.
"""

from __future__ import annotations

import importlib.util
import json
import sys
import types
from datetime import datetime, timezone
from pathlib import Path

import pytest

CONTRACT_PATH = Path(__file__).resolve().parents[2] / "contracts" / "oathmark.py"

CREATOR = "0x" + "1" * 40
BENEFICIARY = "0x" + "2" * 40
OUTSIDER = "0x" + "3" * 40
T0 = 1_735_689_600  # 2025-01-01T00:00:00Z


class TreeMap(dict):
    """dict with .get returning None for missing keys (like GenLayer storage)."""


class DynArray(list):
    pass


def u256(value=0):
    return int(value)


def _make_storage(hint):
    import typing

    origin = typing.get_origin(hint)
    if origin is not None:
        if issubclass(origin, TreeMap):
            return TreeMap()
        if issubclass(origin, DynArray):
            return DynArray()
    if hint is u256:
        return 0
    return None


class _ContractBase:
    def __getattr__(self, item):
        annotations = {}
        for klass in reversed(type(self).__mro__):
            annotations.update(getattr(klass, "__annotations__", {}))
        if item in annotations:
            value = _make_storage(annotations[item])
            object.__setattr__(self, item, value)
            return value
        raise AttributeError(item)


class _Public:
    @staticmethod
    def write(fn):
        return fn

    @staticmethod
    def view(fn):
        return fn


class _Web:
    def __init__(self):
        self.routes = {}

    def set(self, url, status, body):
        self.routes[url] = (status, body)

    def get(self, url):
        status, body = self.routes.get(url, (404, ""))
        return types.SimpleNamespace(status=status, body=body)


class _Nondet:
    def __init__(self):
        self.web = _Web()
        self.prompt_response = "{}"

    def exec_prompt(self, prompt):
        response = self.prompt_response
        if callable(response):
            response = response(prompt)
        if isinstance(response, Exception):
            raise response
        return str(response)


class _Vm:
    @staticmethod
    def run_nondet_unsafe(leader_fn, validator_fn):
        return leader_fn()


def build_fake_genlayer():
    fake = types.ModuleType("genlayer")
    fake.TreeMap = TreeMap
    fake.DynArray = DynArray
    fake.u256 = u256
    gl = types.SimpleNamespace()
    gl.Contract = _ContractBase
    gl.public = _Public()
    gl.nondet = _Nondet()
    gl.vm = _Vm()
    gl.message = types.SimpleNamespace(sender_address=CREATOR)
    gl.message_raw = {"datetime": datetime.fromtimestamp(T0, tz=timezone.utc).isoformat()}
    fake.gl = gl
    fake.__all__ = ["gl", "TreeMap", "DynArray", "u256"]
    return fake


class Env:
    def __init__(self):
        self.fake = build_fake_genlayer()
        sys.modules["genlayer"] = self.fake
        spec = importlib.util.spec_from_file_location("oathmark_contract", CONTRACT_PATH)
        self.module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(self.module)
        self.contract = self.module.Oathmark()

    # -- runtime controls ---------------------------------------------------

    def set_sender(self, address: str) -> None:
        self.fake.gl.message.sender_address = address

    def set_time(self, epoch: int) -> None:
        self.fake.gl.message_raw["datetime"] = datetime.fromtimestamp(epoch, tz=timezone.utc).isoformat()

    def set_web(self, url: str, status: int, body: str) -> None:
        self.fake.gl.nondet.web.set(url, status, body)

    def set_prompt(self, response) -> None:
        self.fake.gl.nondet.prompt_response = response

    # -- scenario helpers ---------------------------------------------------

    def manifest_for(self, pledge: dict) -> str:
        digest = self.module.policy_digest(
            pledge["subject"],
            pledge["canonical_domain"],
            pledge["source_urls"],
            pledge["clauses"],
            pledge["active_revision"],
            pledge["beneficiary"],
            pledge["right_label"],
        )
        return json.dumps(
            {
                "schema": self.module.AUTHORITY_SCHEMA,
                "canonical_domain": pledge["canonical_domain"],
                "issuer": pledge["creator"],
                "beneficiary": pledge["beneficiary"],
                "policy_digest": digest,
            }
        )

    def supporting_prompt(self, clause_count: int) -> str:
        return json.dumps(
            {
                "outcome": "VERIFIED",
                "reason": "every clause is affirmed by the official sources",
                "clauses": [
                    {"index": index, "supported": True, "source_index": 0, "excerpt": "supporting statement"}
                    for index in range(clause_count)
                ],
            }
        )

    def checkpoint_prompt(self, verdicts: list) -> str:
        return json.dumps(
            {
                "reason": "checkpoint evaluation complete",
                "clauses": [
                    {
                        "index": index,
                        "verdict": verdict,
                        "source_index": 0,
                        "excerpt": "" if verdict == "INCONCLUSIVE" else "relevant statement",
                        "reason": "evaluated against current evidence",
                    }
                    for index, verdict in enumerate(verdicts)
                ],
            }
        )


@pytest.fixture()
def env():
    return Env()
