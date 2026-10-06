# Raw-URL quick tests — no deployment needed

These fixtures let you test the contract **within minutes after pushing this repo to GitHub**, using only
`raw.githubusercontent.com` URLs. No host to deploy, no manifest to serve: the canonical domain for these tests is
`raw.githubusercontent.com` itself, and the files below are the frozen sources.

> One important boundary, by design: the authority manifest must live at
> `https://<canonical-domain>/.well-known/oathmark.json` — the **root of the canonical domain**. Only GitHub controls
> the root of `raw.githubusercontent.com`, so activations here must fail closed as `AUTHORITY_UNVERIFIED`. That failure
> is itself one of the most valuable manual tests (it proves creator assertion alone cannot activate a pledge). For
> full activation → checkpoint → exercise flows, deploy `samples/test-site/` (one command) and use that domain instead.

## Step 0 — publish the repo and build your URLs

Push this repository to GitHub (see docs/DEPLOYMENT.md), then substitute `<owner>` and `<repo>` below
(`main` is the default branch):

| Fixture | Source URL |
| ------- | ---------- |
| Uptime scenario | `https://raw.githubusercontent.com/<owner>/<repo>/main/samples/raw/uptime-promise.txt` |
| Refund scenario | `https://raw.githubusercontent.com/<owner>/<repo>/main/samples/raw/refund-promise.txt` |

Tip: replace `main` with a commit SHA to pin immutable evidence for demos.

## Scenario A — single-clause pledge (copy-paste card)

Open `/compose`, connect MetaMask, and enter exactly:

| Field | Value |
| ----- | ----- |
| Subject | `Ninety-nine percent uptime pledge` |
| Canonical domain | `raw.githubusercontent.com` |
| Source (1 of 1) | `https://raw.githubusercontent.com/<owner>/<repo>/main/samples/raw/uptime-promise.txt` |
| Clause (1 of 1) | `The service maintains at least 99 percent monthly uptime.` |
| Beneficiary | your connected address (prefilled) |
| Named right | `Right to claim the uptime credit` |
| Interval | `3600` |
| Note | `Registered from the raw-URL quick test.` |

## Scenario B — two clauses across two files

| Field | Value |
| ----- | ----- |
| Subject | `Customer protection pair` |
| Canonical domain | `raw.githubusercontent.com` |
| Source 1 | `https://raw.githubusercontent.com/<owner>/<repo>/main/samples/raw/refund-promise.txt` |
| Source 2 | `https://raw.githubusercontent.com/<owner>/<repo>/main/samples/raw/uptime-promise.txt` |
| Clause 1 | `Customers may cancel within thirty days and receive a full refund.` |
| Clause 2 | `The service maintains at least 99 percent monthly uptime.` |
| Named right | `Right to invoke the customer protection terms` |
| Interval | `3600` |

## What to test and what to expect

| Case | Action | Expected result |
| ---- | ------ | --------------- |
| R1 — validation passes | Register Scenario A | Source host matches the canonical domain, the draft registers, appears in the ledger and on /desk; sidebar shows the live policy digest |
| R2 — domain mismatch | Register Scenario A but set the canonical domain to `example.com` | Blocked before signing: "source must belong to the canonical domain" |
| R3 — second file ordering | Register Scenario B | Two distinct sources accepted; duplicating the same URL twice is rejected as a duplicate |
| R4 — authority enforcement (negative test) | Open the record, press **Verify baseline & activate** | The round finalizes but the pledge stays a draft: **AUTHORITY_UNVERIFIED** — no one can publish `/.well-known/oathmark.json` at the root of `raw.githubusercontent.com`. This confirms creator assertion cannot activate a pledge without control of the domain root |
| R5 — draft maintenance | Edit and cancel the drafts | Edits persist and re-compute the digest; cancelled drafts move to the Closed filter with right CLOSED |

## Upgrading to the full lifecycle

When you want activation, checkpoints, and right exercise, the only missing ingredient is a domain root you control —
deploy `samples/test-site/` once (Vercel / GitHub Pages user site / Netlify; about two minutes per
`samples/test-site/README.md`) and rerun the same scenarios against that domain. Everything else — fields, clauses,
expected behaviors — stays identical.

## Fast content edits without a deploy

Need fresh source content for another pass? Edit these `.txt` files directly in the GitHub web UI and commit. Branch
URLs reflect new content after GitHub's short raw-cache window (about five minutes); commit-pinned URLs never change.
