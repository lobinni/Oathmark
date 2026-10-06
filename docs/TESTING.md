# Testing guide

Oathmark ships with three automated test layers plus a manual Studionet plan. All commands run from the repository
root.

## 1. Frontend unit tests

Vitest covers the finality reader (majority agreement, leader execution extraction, idle-validator handling), the
digest helpers (SHA-256 vectors, canonical JSON, policy digest determinism), and the input limit mirrors.

```bash
npx vitest run
```

Expected: all test files pass.

## 2. Contract static checks

```bash
python3 scripts/contract_static_checks.py
```

Asserts the GenLayer dependency header, the single contract class, required write/view methods, and the absence of
forbidden imports, dynamic execution, or embedded secret material. When the GenVM linter is available locally, also
run:

```bash
genvm-lint check contracts/oathmark.py
```

## 3. Contract lifecycle tests

The suite in `tests/contract/` loads `contracts/oathmark.py` against an in-memory GenLayer stub (`conftest.py`) that
provides scriptable web fetch, LLM prompt, sender, and chain-time controls. It exercises the complete lifecycle:

- input and URL validation, policy digest determinism, checkpoint aggregation
- draft creation, indexing, creator-only edits, cancellation
- authority manifest verification: missing manifest and mismatched fields stay drafts; a matching manifest activates
- checkpoint window gating by chain time
- `STABLE` freshness renewal, exercise receipts, replay and outsider rejection
- `BROKEN` revocation, `SOURCE_UNAVAILABLE` fail-closed suspension
- full revision staging → manifest update → verification → application
- archival closing the record

Setup and run:

```bash
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
.venv/bin/python -m pytest tests/contract -q
```

(or any environment with `pytest` installed — the tests have no other dependency).

Expected: all tests pass.

## 4. Manual website test cases

For step-by-step manual testing of every workflow in the app with MetaMask (wallet, ledger reads, compose, activation,
checkpoints, exercise, revisions, archival, transaction integrity), follow the case-by-case guide in
[docs/MANUAL_TEST_CASES.md](MANUAL_TEST_CASES.md) — it includes reusable sample data and the expected result of each
step.

## 5. Script-driven Studionet end-to-end test

The frontend links to the live Studionet deployment directly from code — no environment configuration is needed. Only
point the app at a different deployment (via `node scripts/update-contract-address.mjs`) when you want to test one.

1. **Build and start** — `npm run build && npm run start` (or deploy to Vercel with no environment variables).
2. **Connect** — MetaMask on GenLayer Studionet (chain 61999).
3. **Draft** — compose a pledge against a domain you control; verify the policy digest preview appears.
4. **Manifest** — download the manifest file and publish it at the exact well-known path.
5. **Activate** — verify the baseline; expect lifecycle `ACTIVE`, right `ENFORCEABLE`, and a freshness deadline.
6. **Negative control** — edit the manifest to break the digest on a second draft; activation must stay a draft with
   `AUTHORITY_UNVERIFIED` recorded.
7. **Checkpoint** — after one interval, trigger a checkpoint from a different account; confirm clause verdicts, source
   commitments (coverage, status, length, digest), and the requester are recorded.
8. **Exercise** — as the beneficiary, exercise the right; confirm the receipt and that repeating the same action digest
   is rejected.
9. **Revision** — stage a revision, publish the updated manifest, verify it, confirm the source set rotated and the
   revision history gained one entry.
10. **Archive** — archive the record; checkpoints and exercises must now be rejected.

## 6. Runnable live samples

For hands-on verification against the deployed contract, use the ready-made samples in `scripts/live/`:

```bash
npx tsx scripts/live/01-read-ledger.ts          # read-only: connection + ledger dump, no key needed
npx tsx scripts/live/02-pledge.ts help          # write CLI: create/activate/checkpoint/exercise/revision/archive
```

They submit real transactions on Studionet, wait for finality and consensus, re-read state, and print clause-level
verdicts — the complete walkthrough, expected outputs, and exit codes are in [docs/SAMPLES.md](SAMPLES.md).

## Definition of success for writes

The UI reports a write as successful only after `FINALIZED`, `MAJORITY_AGREE`, the leader's successful execution
result (`FINISHED_WITH_RETURN` or Studionet's `SUCCESS`), and an authoritative state re-read. Submission or `ACCEPTED`
alone is never success.
