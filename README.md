# Oathmark

Oathmark is an authority-bound semantic guarantee for promises published on official websites. A domain owner binds
named HTTPS sources, precise reliance clauses, and a beneficiary through a well-known manifest; GenLayer validators
independently verify the baseline, control whether the beneficiary's right is enforceable, and later determine whether
the promise was preserved, narrowed, removed, contradicted, unavailable, or inconclusive.

## Why GenLayer

A content hash can prove bytes changed, but not whether a policy's practical meaning changed. Oathmark puts that
substantive judgment inside GenLayer consensus, and the judgment directly gates an on-chain right. The browser never
decides an outcome and there is no project-controlled oracle or backend.

## Architecture

- Next.js App Router frontend with an injected EIP-1193 wallet (MetaMask).
- One intelligent contract, `Oathmark` (`contracts/oathmark.py`), owning drafts, authority proofs, verified revisions,
  checkpoints, source commitments, enforcement state, exercise receipts, and terminal states.
- No database, API server, signer service, scheduler, or authoritative browser storage.

The contract is the source of truth. Refreshing the application reconstructs records from contract reads.

## Live deployment

| Setting          | Value                                                                                     |
| ---------------- | ----------------------------------------------------------------------------------------- |
| Network          | GenLayer Studionet                                                                         |
| Chain ID         | 61999                                                                                     |
| RPC              | https://studio.genlayer.com/api                                                            |
| Explorer         | https://explorer-studio.genlayer.com                                                       |
| Currency         | GEN                                                                                        |
| Contract address | [0x99C44A4bA20360e65879D4aF69018FF58665F63e](https://explorer-studio.genlayer.com/address/0x99C44A4bA20360e65879D4aF69018FF58665F63e) |

The address ships in the codebase (`src/lib/contract/address.ts` + `deployments/studionet.json`), so cloning, pushing
to GitHub, or deploying to Vercel works with zero environment configuration. No other network is configured.

## Lifecycle

1. Create a draft with a subject, canonical domain, beneficiary, named right, one to four official URLs, one to five
   clauses, and a review interval.
2. Publish the exact authority manifest at `https://<canonical-domain>/.well-known/oathmark.json`.
3. Activate only after validators independently verify that manifest and every frozen clause from the complete source
   responses.
4. Let any account initiate an eligible checkpoint. Consensus deterministically makes the right enforceable, suspended,
   or revoked.
5. Let only the bound beneficiary exercise a fresh, enforceable right; the contract rejects duplicates and records an
   immutable receipt.
6. Read clause-level evidence, coverage metadata, reasons, SHA-256 full-response commitments, enforcement state,
   requester, and chain timestamp.
7. The creator may stage and verify an immutable revision or archive the record; no administrator can rewrite consensus
   history.

Missing, oversized, empty, or conflicting evidence fails closed as `SOURCE_UNAVAILABLE` or `INCONCLUSIVE`. `EXPIRED`,
checkpoint eligibility, and effective right suspension are derived from chain time.

## Why this is enforcement, not an attestation

The semantic verdict changes what the contract permits. A verified baseline or `STABLE` checkpoint makes the
beneficiary's named right `ENFORCEABLE`; `BROKEN` revokes it; unavailable, inconclusive, stale, revised, or archived
records suspend or close it. `exercise_right` checks beneficiary identity, freshness, enforcement state, and replay
protection before writing a receipt.

## Authority manifest

Creator assertion is insufficient. For every activation, validators fetch the canonical domain's fixed well-known path
and require `schema`, `canonical_domain`, `issuer`, `beneficiary`, and `policy_digest` to match the proposed record
exactly. The digest commits to the subject, domain, ordered sources and clauses, revision, beneficiary, and right
label. A missing or mismatched manifest leaves the draft unverified.

## Complete-response policy

Validators hash and measure each complete response before semantic evaluation. Responses up to 60,000 characters per
source and 120,000 characters in aggregate are evaluated without prefix truncation. Larger responses fail closed as
`TOO_LARGE` while preserving their full length and SHA-256 commitment. Each source records explicit coverage, HTTP
status, content length, and full-response hash; the contract never silently treats a prefix as the whole source.

## Setup

```bash
npm install
npm run dev
```

No environment variables are required — the live contract address is committed in the codebase. Connecting MetaMask
on GenLayer Studionet (chain 61999) is required for every write. An optional `.env.local` may set
`NEXT_PUBLIC_OATHMARK_CONTRACT_ADDRESS` purely as a local override while testing a different deployment.

## Scripts and verification

```bash
npx vitest run                              # frontend unit tests (finality, digests, limits, address config)
python3 -m pytest tests/contract -q         # contract lifecycle tests (17 scenarios, see docs/TESTING.md)
python3 scripts/contract_static_checks.py   # static contract checks
node scripts/generate-icon.mjs              # regenerate the app icon PNG (src/app/icon.png)
node scripts/update-contract-address.mjs 0x… # rotate the deployed address across code + deployment record
npm run typecheck && npm run build          # types and production build
```

Live samples that exercise the deployed contract on Studionet:

- **Manual website cases** — [docs/MANUAL_TEST_CASES.md](docs/MANUAL_TEST_CASES.md): every workflow tested by hand in
  the app with MetaMask, with sample data and expected results.
- **Raw-URL quick test** — `samples/raw/`: copy-paste cards using the repo's own raw GitHub URLs as sources — no
  deployment at all.
- **Hostable test site** — `samples/test-site/`: a deploy-ready static fixture that gives you a real HTTPS source URL
  and manifest host for the workflows.
- **CLI** — read ledger, create/activate/checkpoint/exercise/revision/archive from `scripts/live/`.

See [docs/SAMPLES.md](docs/SAMPLES.md).

The full testing guide — including the Studionet manual test plan — lives in [docs/TESTING.md](docs/TESTING.md).

## Deployment

Publishing the frontend on GitHub and Vercel, rotating the contract address, and the post-deployment smoke test are
documented in [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

## Security and limitations

- Sources must be HTTPS pages on the frozen canonical domain; fragments, credentials, IP literals, and local hosts are
  rejected.
- The canonical domain must publish a matching well-known authority manifest; wallet authorship alone proves nothing.
- Validators process complete bounded responses, record coverage metadata, compare URL-bound commitments, and reject
  ungrounded excerpts.
- Inputs, fetch size, and history are bounded; duplicate digests and invalid transitions are rejected.
- Consensus controls right enforcement; only the named beneficiary may exercise an enforceable, fresh right, and action
  digests cannot be replayed.
- The creator controls draft edits, revisions, and archival, but cannot rewrite verified outcomes or exercise another
  beneficiary's right.
- Validators must be able to access the public source. Login walls and bot protection produce fail-closed outcomes.
- Users initiate checkpoints; there is deliberately no centralized scheduler.

## Documentation

- [docs/CONTRACT.md](docs/CONTRACT.md) — contract storage, methods, state machines, bounds
- [docs/USER_FLOW.md](docs/USER_FLOW.md) — reader, creator, checkpoint trigger, and beneficiary walkthroughs
- [docs/TESTING.md](docs/TESTING.md) — automated and manual test guides
- [docs/SAMPLES.md](docs/SAMPLES.md) — live Studionet samples for every contract feature
- [docs/MANUAL_TEST_CASES.md](docs/MANUAL_TEST_CASES.md) — manual website test cases per workflow
- [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) — contract deployment, GitHub + Vercel publishing, address rotation
- [docs/RELEASE.md](docs/RELEASE.md) — release facts and deployment log
- [deployments/studionet.json](deployments/studionet.json) — live deployment record
