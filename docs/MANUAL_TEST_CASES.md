# Manual test cases — homepage workflows with MetaMask

Step-by-step cases for manually testing every Oathmark workflow on the live app against Studionet (chain 61999).
Work through them in order within each group; later groups assume an active pledge exists.

**Environment:** the deployed app (or `npm run dev`), MetaMask with an account funded on GenLayer Studionet
(Studio → Accounts panel issues pre-funded sandbox accounts), and a domain you control over HTTPS.

**Fastest start — raw-URL quick test (zero deploy):** once this repo is on GitHub, `samples/raw/README.md` gives
copy-paste cards using `raw.githubusercontent.com` as the canonical domain and the repo's raw files as sources —
draft registration, validation, draft maintenance, and the authority-enforcement negative test all work immediately.

**Shortcut — ready-made test site:** `samples/test-site/` in this repository is a deploy-ready static fixture: one
promise page containing the sample clause verbatim, a `.well-known/oathmark.json` template, no-cache headers for fast
checkpoint edits, and deploy recipes for Vercel, GitHub Pages, and Netlify. See `samples/test-site/README.md` — it
takes about two minutes to get a live URL, then every case below works end to end (activation, checkpoints,
exercise, revisions).

**Reusable sample data** (used by the cases below):

- Subject: `Ninety-nine percent uptime pledge`
- Clause: `The service maintains at least 99 percent monthly uptime.`
- Named right: `Right to claim the uptime credit`
- Interval: `3600` seconds (one hour — short enough to test checkpoint gating quickly)
- Source: one HTTPS page on your domain containing that clause verbatim

---

## A. Wallet and network

### A1 — Connect on the correct network
1. Open the homepage, click **Connect wallet** in the header (or any wallet gate).
2. Approve in MetaMask.
**Expect:** header shows your shortened address with the Studionet tag; wallet gates on /compose, /desk and record pages disappear.

### A2 — Wrong network → guided switch
1. In MetaMask, switch to a different chain (e.g. Ethereum mainnet).
2. Click the account chip in the header.
**Expect:** chip shows **Wrong network · Switch to chain 61999**; gated pages show **Switch to Studionet**; confirming in MetaMask lands you on chain 61999 (MetaMask adds the network with the Studionet RPC and explorer if it is unknown).

### A3 — Rejection handling
1. Start any write (e.g. register a draft), then press **Reject** in MetaMask.
**Expect:** the ribbon reports **Request rejected by wallet** and nothing is written; dismissing the ribbon resets the flow.

### A4 — Read-only browsing without a wallet
1. Disconnect MetaMask (or use a private window).
**Expect:** homepage, /method and any record page render fully — the ledger, seals, clauses and checkpoint history do not require a wallet.

---

## B. Homepage ledger reads

### B1 — Live pledge counter
**Expect:** the hero chip shows `N pledges on record` (or “Live on Studionet” while the first read lands).

### B2 — Ledger grid and filters
1. Scroll to **The Ledger**.
2. Click each filter: All, Draft, Active, Stable, Review, Broken, Closed.
**Expect:** cards instantly re-filter; every card shows lifecycle/assessment and right seals, domain, interval, checkpoint count, and pledge number; hover lifts the card.

### B3 — Record reconstruction from the contract
1. Open any pledge card.
2. Reload the page with a hard refresh.
**Expect:** identical data — everything on the page is rebuilt from contract reads (subject, clauses with latest verdicts and excerpts, source commitments with coverage/HTTP status/length/digest, checkpoint timeline, enforcement state, creator and beneficiary links to the explorer).

### B4 — Method page
1. Open **Method** in the navigation.
**Expect:** lifecycle explanation, seal glossary, manifest field explanations, bounds band, and the finality definition — all prose, no wallet prompt.

---

## C. Draft creation (/compose)

### C1 — Validation before submission
On /compose, try each of the following and press **Register pledge draft**: a URL as the domain; a source on a different domain than the canonical one; `http://` source; duplicate sources; an empty clause; a bad beneficiary address.
**Expect:** a clear single error message each time; no transaction is offered to MetaMask.

### C2 — Manifest preview updates live
1. Fill a valid subject, your domain, one source, one clause, named right.
**Expect:** the sidebar shows the well-known publish address, schema value, your connected account as issuer, and a live policy digest preview that changes when you edit any field.

### C3 — Register the draft
1. Submit and confirm in MetaMask.
**Expect:** the ribbon walks through *Confirm in your wallet → Validators are reaching consensus → Finalized → Re-reading contract state → Confirmed and applied*; /desk opens with the new draft on top; the pledge appears in the homepage ledger under Draft.

### C4 — Edit the draft
1. Open the record, press **Edit draft**, change the note and clause, save.
2. Reload the record.
**Expect:** changes persisted; status still Draft; the digest preview on /compose changes accordingly.

### C5 — Cancel a draft
1. Create a second draft, open it, choose **Cancel draft**, confirm.
**Expect:** lifecycle CANCELLED, right CLOSED; it moves to the Closed filter; activate/checkpoint actions disappear.

---

## D. Baseline activation

### D1 — Fail-closed without a manifest
1. Register a draft but publish **nothing** on the domain.
2. Press **Verify baseline & activate**.
**Expect:** transaction finalizes; the record stays DRAFT with a “Last activation attempt” panel reading AUTHORITY UNVERIFIED and its reason.

### D2 — Fail-closed with a mismatched manifest
1. Publish a manifest whose beneficiary (or digest) does not match.
2. Activate again.
**Expect:** still DRAFT — AUTHORITY UNVERIFIED with the field that mismatched named.

### D3 — Successful activation
1. Download the manifest from the compose sidebar (or the record’s revision panel) and publish the exact file at `https://<your-domain>/.well-known/oathmark.json`.
2. Press **Verify baseline & activate** again.
**Expect:** consensus confirms; lifecycle ACTIVE, right ENFORCEABLE, a freshness deadline appears, assessment UNCHECKED; the pledge surfaces under the Active filter.

---

## E. Checkpoints

### E1 — Window gating
Immediately after activation, open **Checkpoint** from the record.
**Expect:** eligibility panel shows *Next window opens in …* and the trigger button is disabled — chain time, not the UI, enforces this.

### E2 — STABLE checkpoint
1. After one interval, press **Run checkpoint now** and confirm.
**Expect:** assessment STABLE, right stays ENFORCEABLE, fresh-until renewed; the checkpoint timeline records you as requester with per-clause PRESERVED seals, verbatim excerpts, and source commitments (coverage FULL, HTTP 200, length, digest).

### E3 — NARROWED → suspend
1. Edit your source page to add a material limitation to the clause (e.g. “…uptime, excluding all weekends.”).
2. Run the next checkpoint.
**Expect:** clause seal NARROWED, assessment REVIEW REQUIRED, right SUSPENDED; the exercise action refuses until recovery.

### E4 — BROKEN → revoke
1. Remove the clause from the source entirely (keep the page reachable).
2. Run the next checkpoint.
**Expect:** clause REMOVED, assessment BROKEN, right REVOKED.

### E5 — SOURCE_UNAVAILABLE → fail closed
1. Restore a good clause, then make the source return an error (rename the file).
2. Run the next checkpoint.
**Expect:** SOURCE_UNAVAILABLE everywhere, right SUSPENDED — evidence problems never become STABLE.

### E6 — Permissionless trigger
1. Switch MetaMask to a different funded account and run a checkpoint when the window is open.
**Expect:** it succeeds; the timeline records the second account as requester.

---

## F. Exercising the right

### F1 — Beneficiary only
1. With the right enforcedable and fresh, connect an account that is **not** the beneficiary.
**Expect:** no exercise button; a hint explains only the beneficiary may exercise.

### F2 — Successful exercise with receipt
1. Connect the beneficiary account, press **Exercise**, confirm once, confirm in MetaMask.
**Expect:** exercise count increments; an Exercise receipts panel appears with receipt id, timestamp, and the truncated action digest; the ribbon confirms.

### F3 — Stale right refuses exercise
1. Let the freshness window pass without a checkpoint (effective seal shows EXPIRED).
**Expect:** exercise refused with a hint to run a checkpoint first; after a STABLE checkpoint it works again.

---

## G. Revisions

### G1 — Stage a revision
1. As the creator, press **Propose revision**, adjust sources/clauses/interval, submit.
**Expect:** a **Pending revision v1** panel shows the digest; the right suspends immediately; **Download revision manifest** is offered.

### G2 — Must publish the new manifest
1. Do **not** update `oathmark.json` yet; press **Verify & apply revision**.
**Expect:** verification fails (AUTHORITY UNVERIFIED / digest mismatch); the proposal stays staged; nothing else changes.

### G3 — Verify and apply
1. Publish the updated manifest (it commits to the new digest), retry verification.
**Expect:** active revision becomes v1, sources/clauses rotate, revision history gains a VERIFIED entry, right ENFORCEABLE with a fresh window.

---

## H. Archival

### H1 — Archive closes everything
1. As the creator, press **Archive record**.
**Expect:** lifecycle ARCHIVED, right CLOSED, pledge moves to the Closed filter; checkpoint and exercise actions are rejected/disabled; data remains readable forever.

---

## I. Transaction integrity

### I1 — The ribbon is the truth
For any write, watch the ribbon: submission alone never counts — success appears only after *Finalized on Studionet → Confirmed and applied*, and every message links the transaction on the explorer.

### I2 — Page refresh mid-round
Start an activation and reload the page while validators are voting.
**Expect:** the restored ribbon shows the last known phase (consensus pending with the transaction link); the record itself always reflects true contract state on next read.

### I3 — Non-fresh actions fail politely
Trigger two writes in a row quickly or twice on the same button.
**Expect:** one visible round at a time; collisions surface as readable ribbon errors, never silent state drift.
