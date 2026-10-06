# Oathmark contract reference

Single intelligent contract: `contracts/oathmark.py` (`class Oathmark`).

## Storage

| Store                | Key       | Value                                                        |
| -------------------- | --------- | ------------------------------------------------------------ |
| `pledges`            | pledge id | canonical JSON pledge record                                 |
| `revisions`          | pledge id | JSON list of verified revision entries                       |
| `checkpoints`        | pledge id | JSON list of checkpoint entries (max 64)                     |
| `exercises`          | pledge id | JSON list of exercise receipts (max 64)                      |
| `revision_proposals` | pledge id | canonical JSON staged revision, or empty string              |
| `used_digests`       | digest    | receipt id that consumed the action digest                   |
| `owner_index`        | creator   | JSON list of pledge ids                                      |
| `public_index`       | —         | append-only list of every pledge id                          |
| `next_pledge_id`     | —         | monotonically increasing counter starting at 1               |

## Writes

| Method                | Caller           | Effect                                                                                          |
| --------------------- | ---------------- | ----------------------------------------------------------------------------------------------- |
| `create_draft`        | anyone           | Validates and stores a draft; returns the new pledge id.                                        |
| `update_draft`        | creator          | Edits mutable draft fields; resets authority verification and recomputes the manifest URL.      |
| `cancel_draft`        | creator          | Draft → `CANCELLED`; right → `CLOSED`.                                                          |
| `activate_baseline`   | creator          | Consensus verifies manifest + clause support. `VERIFIED` → `ACTIVE`, right `ENFORCEABLE`, freshness window opens. Result is stored on the record either way. |
| `propose_revision`    | creator          | Stages revision `n+1` with its own digest; right suspends until verified.                        |
| `activate_revision`   | creator          | Consensus verifies the staged revision against the updated manifest; applies it immutably.       |
| `run_checkpoint`      | anyone           | Once per interval, consensus re-judges every clause and updates assessment, freshness, and right state. |
| `archive_pledge`      | creator          | Draft or active → `ARCHIVED`; right → `CLOSED`.                                                  |
| `exercise_right`      | beneficiary only | Requires active, enforceable, fresh right and an unused 32-byte action digest; writes a receipt. |

## Views

| Method                                        | Returns                                          |
| --------------------------------------------- | ------------------------------------------------ |
| `get_pledge(id)`                              | JSON pledge record                               |
| `get_revisions(id)`                           | JSON list of verified revisions                  |
| `get_checkpoints(id)`                         | JSON list of checkpoints                          |
| `get_exercises(id)`                           | JSON list of exercise receipts                   |
| `get_revision_proposal(id)`                   | JSON staged revision or null                     |
| `list_pledge_ids(offset, limit)`              | newest-first pledge ids                          |
| `list_creator_pledge_ids(creator, off, lim)`  | newest-first ids for a creator                   |
| `get_next_pledge_id()`                        | next id to be issued                             |
| `get_policy_digest(id)`                       | staged digest when a revision is pending, else current policy digest |

## State machines

- Lifecycle: `DRAFT` → `ACTIVE` → `ARCHIVED`, or `DRAFT` → `CANCELLED` / `ARCHIVED`.
- Assessment: `UNCHECKED`, then `STABLE` | `REVIEW_REQUIRED` | `BROKEN` | `SOURCE_UNAVAILABLE` | `INCONCLUSIVE`.
- Clause verdicts: `PRESERVED` | `NARROWED` | `REMOVED` | `CONTRADICTED` | `SOURCE_UNAVAILABLE` | `INCONCLUSIVE`.
- Aggregation: any `REMOVED`/`CONTRADICTED` → `BROKEN`; else any `NARROWED` → `REVIEW_REQUIRED`; else any
  `SOURCE_UNAVAILABLE` → `SOURCE_UNAVAILABLE`; else any `INCONCLUSIVE` → `INCONCLUSIVE`; else `STABLE`.
- Right: `PENDING` → `ENFORCEABLE` ↔ `SUSPENDED`, terminal `REVOKED` or `CLOSED`. `STABLE` re-enables and renews
  freshness; `BROKEN` revokes; every other non-stable outcome suspends.

## Bounds

- 1–4 sources (HTTPS, canonical domain, no credentials/fragments/IP literals, port 443 only)
- 1–5 clauses (≤ 500 chars each), subject ≤ 120 chars, note ≤ 500 chars, right label ≤ 160 chars
- Review interval: 300 seconds to 90 days
- Fetches: ≤ 60,000 chars per source, ≤ 120,000 in aggregate, else fail-closed coverage
- History: 64 checkpoints and 64 receipts per record; 5,000 pledges total

## Manifest

Published at `https://<canonical-domain>/.well-known/oathmark.json`; required fields:

| Field              | Requirement                                             |
| ------------------ | ------------------------------------------------------- |
| `schema`           | exactly `oathmark-authority-v1`                          |
| `canonical_domain` | the frozen domain                                        |
| `issuer`           | the creator address (case-insensitive)                   |
| `beneficiary`      | the beneficiary address (case-insensitive)               |
| `policy_digest`    | SHA-256 of the canonical policy tuple (see `policy_digest` in the contract) |
