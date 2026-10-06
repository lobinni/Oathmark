"""
Sample lifecycle tests for the Oathmark intelligent contract.

Run with:

    python3 -m pytest tests/contract -q
"""

import json

import pytest

from conftest import BENEFICIARY, CREATOR, OUTSIDER, T0

SUBJECT = "Thirty-day refund promise"
DOMAIN = "example.com"
SOURCES = ["https://example.com/refund-policy"]
CLAUSES = ["Customers may cancel within thirty days for a full refund."]
RIGHT = "Right to claim the promised refund"
INTERVAL = 3600


def make_draft(env):
    pledge_id = env.contract.create_draft(
        SUBJECT, DOMAIN, SOURCES, CLAUSES, "https://example.com/.well-known/oathmark.json", BENEFICIARY, RIGHT, INTERVAL, ""
    )
    return pledge_id


def activate(env, pledge_id):
    pledge = json.loads(env.contract.get_pledge(pledge_id))
    for url in pledge["source_urls"]:
        env.set_web(url, 200, "Our policy states a supporting statement for every clause in full text.")
    env.set_web(pledge["authority_url"], 200, env.manifest_for(pledge))
    env.set_prompt(env.supporting_prompt(len(pledge["clauses"])))
    env.contract.activate_baseline(pledge_id)


# ------------------------------ pure helpers ------------------------------


def test_domain_and_url_validation(env):
    m = env.module
    assert m.normalize_domain("Example.COM.") == "example.com"
    with pytest.raises(ValueError):
        m.normalize_domain("https://example.com")
    with pytest.raises(ValueError):
        m.normalize_domain("127.0.0.1")
    assert m.normalize_source_url("https://example.com/a/", "example.com") == "https://example.com/a"
    with pytest.raises(ValueError):
        m.normalize_source_url("https://other.com/a", "example.com")
    with pytest.raises(ValueError):
        m.normalize_source_url("https://user@example.com/a", "example.com")
    with pytest.raises(ValueError):
        m.normalize_source_url("http://example.com/a", "example.com")


def test_policy_digest_is_deterministic_and_sensitive(env):
    m = env.module
    one = m.policy_digest(SUBJECT, DOMAIN, SOURCES, CLAUSES, 0, BENEFICIARY, RIGHT)
    two = m.policy_digest(SUBJECT, DOMAIN, list(SOURCES), list(CLAUSES), 0, BENEFICIARY.lower() + "", RIGHT)
    three = m.policy_digest(SUBJECT, DOMAIN, SOURCES, CLAUSES, 1, BENEFICIARY, RIGHT)
    assert one == two and len(one) == 64
    assert one != three


def test_checkpoint_aggregation(env):
    agg = env.module.aggregate_checkpoint
    assert agg(["PRESERVED", "PRESERVED"]) == "STABLE"
    assert agg(["PRESERVED", "NARROWED"]) == "REVIEW_REQUIRED"
    assert agg(["PRESERVED", "REMOVED"]) == "BROKEN"
    assert agg(["PRESERVED", "CONTRADICTED"]) == "BROKEN"
    assert agg(["PRESERVED", "SOURCE_UNAVAILABLE"]) == "SOURCE_UNAVAILABLE"
    assert agg(["PRESERVED", "INCONCLUSIVE"]) == "INCONCLUSIVE"
    assert agg([]) == "INCONCLUSIVE"


# ------------------------------ draft flow --------------------------------


def test_create_draft_and_views(env):
    pledge_id = make_draft(env)
    assert pledge_id == "1"
    pledge = json.loads(env.contract.get_pledge(pledge_id))
    assert pledge["lifecycle"] == "DRAFT"
    assert pledge["right_status"] == "PENDING"
    assert pledge["creator"] == CREATOR
    assert env.contract.list_pledge_ids(0, 10) == ["1"]
    assert env.contract.list_creator_pledge_ids(CREATOR, 0, 10) == ["1"]
    assert env.contract.get_next_pledge_id() == 2
    digest = env.contract.get_policy_digest(pledge_id)
    assert len(digest) == 64


def test_create_draft_rejects_bad_authority_url(env):
    with pytest.raises(Exception):
        env.contract.create_draft(
            SUBJECT, DOMAIN, SOURCES, CLAUSES, "https://example.com/wrong.json", BENEFICIARY, RIGHT, INTERVAL, ""
        )


def test_create_draft_rejects_off_domain_source(env):
    with pytest.raises(Exception):
        env.contract.create_draft(
            SUBJECT,
            DOMAIN,
            ["https://unrelated.example.net/page"],
            CLAUSES,
            "https://example.com/.well-known/oathmark.json",
            BENEFICIARY,
            RIGHT,
            INTERVAL,
            "",
        )


def test_update_draft_creator_only_and_draft_only(env):
    pledge_id = make_draft(env)
    env.set_sender(OUTSIDER)
    with pytest.raises(Exception):
        env.contract.update_draft(pledge_id, SUBJECT, DOMAIN, SOURCES, CLAUSES, INTERVAL, "x")
    env.set_sender(CREATOR)
    env.contract.update_draft(pledge_id, "Updated subject", DOMAIN, SOURCES, CLAUSES, INTERVAL, "note")
    pledge = json.loads(env.contract.get_pledge(pledge_id))
    assert pledge["subject"] == "Updated subject"
    activate(env, pledge_id)
    with pytest.raises(Exception):
        env.contract.update_draft(pledge_id, SUBJECT, DOMAIN, SOURCES, CLAUSES, INTERVAL, "x")


def test_cancel_draft_closes_right(env):
    pledge_id = make_draft(env)
    env.contract.cancel_draft(pledge_id)
    pledge = json.loads(env.contract.get_pledge(pledge_id))
    assert pledge["lifecycle"] == "CANCELLED"
    assert pledge["right_status"] == "CLOSED"


# ---------------------------- baseline flow -------------------------------


def test_activation_fails_closed_without_manifest(env):
    pledge_id = make_draft(env)
    env.contract.activate_baseline(pledge_id)
    pledge = json.loads(env.contract.get_pledge(pledge_id))
    assert pledge["lifecycle"] == "DRAFT"
    assert pledge["last_activation_result"]["outcome"] == "AUTHORITY_UNVERIFIED"


def test_activation_mismatched_manifest_stays_draft(env):
    pledge_id = make_draft(env)
    pledge = json.loads(env.contract.get_pledge(pledge_id))
    wrong = json.loads(env.manifest_for(pledge))
    wrong["beneficiary"] = OUTSIDER
    for url in pledge["source_urls"]:
        env.set_web(url, 200, "supporting statement")
    env.set_web(pledge["authority_url"], 200, json.dumps(wrong))
    env.set_prompt(env.supporting_prompt(1))
    env.contract.activate_baseline(pledge_id)
    pledge = json.loads(env.contract.get_pledge(pledge_id))
    assert pledge["lifecycle"] == "DRAFT"
    assert pledge["last_activation_result"]["outcome"] == "AUTHORITY_UNVERIFIED"


def test_activation_success_enables_the_right(env):
    pledge_id = make_draft(env)
    activate(env, pledge_id)
    pledge = json.loads(env.contract.get_pledge(pledge_id))
    assert pledge["lifecycle"] == "ACTIVE"
    assert pledge["authority_verified"] is True
    assert pledge["right_status"] == "ENFORCEABLE"
    assert pledge["fresh_until"] == pledge["activated_at"] + INTERVAL


# --------------------------- checkpoint flow ------------------------------


def test_checkpoint_window_is_gated_by_chain_time(env):
    pledge_id = make_draft(env)
    activate(env, pledge_id)
    with pytest.raises(Exception):
        env.contract.run_checkpoint(pledge_id)


def test_stable_checkpoint_renews_freshness_and_exercise(env):
    pledge_id = make_draft(env)
    activate(env, pledge_id)
    env.set_time(T0 + INTERVAL + 1)
    env.set_prompt(env.checkpoint_prompt(["PRESERVED"]))
    env.contract.run_checkpoint(pledge_id)
    pledge = json.loads(env.contract.get_pledge(pledge_id))
    assert pledge["assessment"] == "STABLE"
    assert pledge["right_status"] == "ENFORCEABLE"
    assert pledge["fresh_until"] == T0 + INTERVAL + 1 + INTERVAL
    history = json.loads(env.contract.get_checkpoints(pledge_id))
    assert len(history) == 1 and history[0]["outcome"] == "STABLE"

    digest = "ab" * 32
    env.set_sender(BENEFICIARY)
    receipt = env.contract.exercise_right(pledge_id, digest)
    assert receipt == f"{pledge_id}:1"
    with pytest.raises(Exception):
        env.contract.exercise_right(pledge_id, digest)
    env.set_sender(OUTSIDER)
    with pytest.raises(Exception):
        env.contract.exercise_right(pledge_id, "cd" * 32)
    exercises = json.loads(env.contract.get_exercises(pledge_id))
    assert exercises[0]["beneficiary"] == BENEFICIARY


def test_broken_checkpoint_revokes_the_right(env):
    pledge_id = make_draft(env)
    activate(env, pledge_id)
    env.set_time(T0 + INTERVAL + 1)
    env.set_prompt(env.checkpoint_prompt(["REMOVED"]))
    env.contract.run_checkpoint(pledge_id)
    pledge = json.loads(env.contract.get_pledge(pledge_id))
    assert pledge["assessment"] == "BROKEN"
    assert pledge["right_status"] == "REVOKED"
    env.set_sender(BENEFICIARY)
    with pytest.raises(Exception):
        env.contract.exercise_right(pledge_id, "ef" * 32)


def test_unavailable_source_suspends_fail_closed(env):
    pledge_id = make_draft(env)
    activate(env, pledge_id)
    pledge = json.loads(env.contract.get_pledge(pledge_id))
    env.set_web(pledge["source_urls"][0], 503, "")
    env.set_time(T0 + INTERVAL + 1)
    env.contract.run_checkpoint(pledge_id)
    pledge = json.loads(env.contract.get_pledge(pledge_id))
    assert pledge["assessment"] == "SOURCE_UNAVAILABLE"
    assert pledge["right_status"] == "SUSPENDED"


# ---------------------------- revision flow -------------------------------


def test_revision_lifecycle(env):
    pledge_id = make_draft(env)
    activate(env, pledge_id)
    new_sources = ["https://example.com/refund-policy-v2"]
    new_clauses = ["Customers may cancel within sixty days for a full refund."]

    env.set_sender(OUTSIDER)
    with pytest.raises(Exception):
        env.contract.propose_revision(pledge_id, new_sources, new_clauses, INTERVAL, "")

    env.set_sender(CREATOR)
    env.contract.propose_revision(pledge_id, new_sources, new_clauses, INTERVAL, "")
    pledge = json.loads(env.contract.get_pledge(pledge_id))
    assert pledge["right_status"] == "SUSPENDED"
    proposal = json.loads(env.contract.get_revision_proposal(pledge_id))
    assert proposal["revision"] == 1

    env.set_web(new_sources[0], 200, "supporting statement")
    pledge["source_urls"] = new_sources
    pledge["clauses"] = new_clauses
    pledge["active_revision"] = 1
    env.set_web("https://example.com/.well-known/oathmark.json", 200, env.manifest_for(pledge))
    env.set_prompt(env.supporting_prompt(1))
    env.contract.activate_revision(pledge_id)

    pledge = json.loads(env.contract.get_pledge(pledge_id))
    assert pledge["active_revision"] == 1
    assert pledge["source_urls"] == new_sources
    assert pledge["right_status"] == "ENFORCEABLE"
    assert json.loads(env.contract.get_revision_proposal(pledge_id)) is None
    revisions = json.loads(env.contract.get_revisions(pledge_id))
    assert revisions[0]["revision"] == 1 and revisions[0]["outcome"] == "VERIFIED"


def test_checksummed_addresses_are_normalized_everywhere(env):
    """Regression: EIP-55 (mixed-case) wallet senders must not desync the
    creator index, creator checks, or beneficiary checks."""
    mixed_creator = "0x" + "Ab" * 20
    mixed_beneficiary = "0x" + "Cd" * 20
    env.set_sender(mixed_creator)
    pledge_id = env.contract.create_draft(
        SUBJECT, DOMAIN, SOURCES, CLAUSES, "https://example.com/.well-known/oathmark.json", mixed_beneficiary, RIGHT, INTERVAL, ""
    )
    pledge = json.loads(env.contract.get_pledge(pledge_id))
    assert pledge["creator"] == mixed_creator.lower()
    assert pledge["beneficiary"] == mixed_beneficiary.lower()
    # owner index queryable in any case
    assert env.contract.list_creator_pledge_ids(mixed_creator.lower(), 0, 10) == [pledge_id]
    assert env.contract.list_creator_pledge_ids(mixed_creator, 0, 10) == [pledge_id]
    # activation still passes the creator check from the checksummed sender
    activate(env, pledge_id)
    pledge = json.loads(env.contract.get_pledge(pledge_id))
    assert pledge["lifecycle"] == "ACTIVE"
    # beneficiary exercises from the checksummed sender
    env.set_time(T0 + INTERVAL + 1)
    env.set_prompt(env.checkpoint_prompt(["PRESERVED"]))
    env.contract.run_checkpoint(pledge_id)
    env.set_sender(mixed_beneficiary)
    receipt = env.contract.exercise_right(pledge_id, "aa" * 32)
    assert receipt == f"{pledge_id}:1"


def test_archive_closes_the_record(env):
    pledge_id = make_draft(env)
    activate(env, pledge_id)
    env.contract.archive_pledge(pledge_id)
    pledge = json.loads(env.contract.get_pledge(pledge_id))
    assert pledge["lifecycle"] == "ARCHIVED"
    assert pledge["right_status"] == "CLOSED"
    with pytest.raises(Exception):
        env.contract.run_checkpoint(pledge_id)
