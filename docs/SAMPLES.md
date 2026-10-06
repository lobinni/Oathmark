# Live samples on Studionet

Two complementary ways to exercise the deployed contract on GenLayer Studionet (chain 61999):

- **Manual website cases** — [docs/MANUAL_TEST_CASES.md](MANUAL_TEST_CASES.md) walks every workflow (wallet, ledger,
  compose, activation, checkpoints, exercise, revisions, archival) through the app UI with MetaMask, with reusable
  sample data and expected results per step.
- **Raw-URL quick test** — `samples/raw/` gives copy-paste cards that use the repo's own raw GitHub URLs as pledge
  sources: drafts, validation, and the authority-enforcement negative test run with zero deployment.
- **Hostable test site** — `samples/test-site/` is a deploy-ready static fixture (promise page + well-known manifest
  template + no-cache headers) so you get a real HTTPS source URL for the workflows in minutes.
- **CLI samples** in `scripts/live/` — plain TypeScript run with `tsx` for automated or scripted testing.

## CLI samples

These terminal samples let a developer exercise every feature of the Oathmark contract against the **live deployment**
— no local network, no mocks. They call the same contract the frontend uses.

| Sample | Path | Needs a key? | Purpose |
| ------ | ---- | ------------ | ------- |
| 01 | `scripts/live/01-read-ledger.ts` | no | Read the live ledger: connection, pledge lists, full record dumps |
| 02 | `scripts/live/02-pledge.ts` | yes (writes) | CLI for every write method: create, update, cancel, activate, checkpoint, exercise, revisions, archive |

Both read the deployed address from the committed configuration (`src/lib/contract/address.ts` /
`deployments/studionet.json`), so there is nothing to configure.

## Prerequisites

```bash
npm install        # provides tsx and genlayer-js
```

For write commands, export a **funded** Studionet key (never commit it):

```bash
export OATHMARK_SAMPLE_PRIVATE_KEY=0x<64 hex chars>
```

Fund the account from the **GenLayer Studio → Accounts** panel, which issues pre-funded sandbox accounts. The public
GenLayer faucet funds a different network and will not help on Studionet.

You can confirm which account the samples will use:

```bash
npx tsx scripts/live/02-pledge.ts whoami
```

## Sample 01 — read the live ledger

```bash
npx tsx scripts/live/01-read-ledger.ts                 # connection + newest pledges
npx tsx scripts/live/01-read-ledger.ts --limit=5       # newest 5 pledges
npx tsx scripts/live/01-read-ledger.ts --id=1          # full dump: record, clauses, checkpoints,
                                                       # source commitments, revisions, receipts, digest
npx tsx scripts/live/01-read-ledger.ts --creator=0x…   # one creator's pledges
```

Fresh deployments print:

```text
=== connection ===
network:   GenLayer Studionet (chain 61999)
rpc:       https://studio.genlayer.com/api
contract:  0x99C44A4bA20360e65879D4aF69018FF58665F63e

pledges issued so far: 0

=== newest pledges (up to 10) ===
  the ledger is empty — create the first pledge with scripts/live/02-pledge.ts
```

## Sample 02 — every write feature

Run `npx tsx scripts/live/02-pledge.ts help` to list commands. Every write:

1. submits from your key,
2. waits for `FINALIZED` + `MAJORITY_AGREE` + successful leader execution,
3. re-reads the contract and confirms the expected state changed,
4. exits non-zero with a readable reason if consensus declined the transition.

### Guided end-to-end walkthrough

Use a domain you control — the manifest must really be served over HTTPS.

```bash
# 0. who you are
npx tsx scripts/live/02-pledge.ts whoami

# 1. register a draft — prints the manifest body you must publish
npx tsx scripts/live/02-pledge.ts create \
  --subject="Ninety-nine percent uptime pledge" \
  --domain=your-domain.example \
  --source=https://your-domain.example/sla \
  --clause="The service maintains at least 99 percent monthly uptime." \
  --right="Right to claim the uptime credit" \
  --interval=3600 \
  --note="Sample pledge created from the live samples"

# 2. (re)print the exact manifest any time, then serve it at the well-known path
npx tsx scripts/live/02-pledge.ts manifest --id=1 --out=oathmark.json
#    → publish oathmark.json at https://your-domain.example/.well-known/oathmark.json

# 3. ask validators to verify the baseline and activate
npx tsx scripts/live/02-pledge.ts activate --id=1
#    success: "pledge #1 is ACTIVE — right ENFORCEABLE, fresh until …"

# 4. edit flow for drafts (only before activation), or cancel
npx tsx scripts/live/02-pledge.ts update --id=1 --note="amended note"
npx tsx scripts/live/02-pledge.ts cancel --id=1

# 5. after one review interval, trigger a permissionless checkpoint
npx tsx scripts/live/02-pledge.ts checkpoint --id=1
#    prints the aggregate assessment plus every clause verdict

# 6. beneficiary-only: exercise the enforceable right (digest is random unless given)
npx tsx scripts/live/02-pledge.ts exercise --id=1

# 7. creator-only: revise the frozen clauses
npx tsx scripts/live/02-pledge.ts propose-revision --id=1 \
  --source=https://your-domain.example/sla-v2 \
  --clause="The service maintains at least 99.5 percent monthly uptime."
npx tsx scripts/live/02-pledge.ts manifest --id=1     # publish the NEW manifest
npx tsx scripts/live/02-pledge.ts activate-revision --id=1

# 8. close the record
npx tsx scripts/live/02-pledge.ts archive --id=1

# helpers
npx tsx scripts/live/02-pledge.ts digest   # generate a one-time action digest yourself
```

### What each command proves on chain

| Command | Contract method | Success signal after re-read |
| ------- | --------------- | ---------------------------- |
| `create` | `create_draft` | new id appears in `list_creator_pledge_ids` |
| `update` | `update_draft` | draft fields match the update |
| `cancel` | `cancel_draft` | lifecycle `CANCELLED`, right `CLOSED` |
| `activate` | `activate_baseline` | lifecycle `ACTIVE`, right `ENFORCEABLE`, freshness set |
| `checkpoint` | `run_checkpoint` | checkpoint count + assessment updated |
| `exercise` | `exercise_right` | exercise count incremented, receipt written |
| `propose-revision` | `propose_revision` | staged proposal readable, right `SUSPENDED` |
| `activate-revision` | `activate_revision` | `active_revision` incremented, right `ENFORCEABLE` |
| `archive` | `archive_pledge` | lifecycle `ARCHIVED`, right `CLOSED` |

### Exit codes

| Code | Meaning |
| ---- | ------- |
| 0 | transaction finalized, majority agreed, execution succeeded, state confirmed |
| 1 | usage error, missing key, or the transaction never reached a successful receipt |
| 2 | the write finalized but the contract declined the transition — the reason (`AUTHORITY_UNVERIFIED`, checkpoint window closed, not the beneficiary, …) is printed |

## Expected live behavior to look for

- **Authority enforcement**: without a published manifest, `activate` exits 2 with `AUTHORITY_UNVERIFIED` and the
  pledge stays a draft — nothing you sign changes that.
- **Checkpoint gating**: calling `checkpoint` before the interval prints the exact opening time and exits 2.
- **Beneficiary gating**: `exercise` refuses non-beneficiary keys before even submitting.
- **Replay protection**: reusing an action digest is rejected by the contract.
- **Fail-closed evidence**: make a source return an error and the next checkpoint becomes `SOURCE_UNAVAILABLE` with the
  right suspended — never optimistic.

## Offline vs live tests憬

These samples complement (not replace) the offline suites: `npx vitest run` and `python3 -m pytest tests/contract -q`
run without a network, while these samples verify the same behaviors against real Studionet consensus.
