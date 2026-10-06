# User flow

Oathmark has three participant roles. One wallet can hold several at once.

## Everyone (reader)

1. Open the app. The ledger on the home page is reconstructed from contract reads — no account needed.
2. Filter by lifecycle or assessment, open any pledge, and inspect its clauses, verdicts, source commitments,
   checkpoint history, and enforcement state.
3. Connect MetaMask (GenLayer Studionet, chain 61999) only when you want to write.

## Pledge creator

1. Connect your wallet on chain 61999.
2. Open **New Pledge** and complete the six sections: identity, sources, clauses, right & beneficiary, cadence, note.
3. Watch the sidebar: the authority manifest preview (well-known URL, schema, issuer, policy digest) updates as you
   type. Download the manifest file.
4. Have the domain operator publish that exact file at the shown well-known HTTPS path.
5. Submit **Register pledge draft** and wait for final confirmation (finality + consensus + state re-read).
6. On the record page, choose **Verify baseline & activate**. Validators now fetch the manifest and sources and vote.
7. Maintain the pledge: edit drafts, stage revisions (right suspends until the new manifest verifies), or archive.

## Checkpoint trigger (anyone)

1. Open an active pledge and follow **Run checkpoint** once its interval window opens.
2. Confirm the transaction. Validators re-fetch every source and vote per clause; you never judge.
3. The assessment, the right state, and the freshness window update in the same transaction, with you recorded as
   requester.

## Beneficiary

1. Connect the wallet named as the pledge beneficiary.
2. When the right is `ENFORCEABLE` and fresh, open the record and choose **Exercise**.
3. Confirm. A one-time action digest is committed, replay is impossible, and an immutable receipt is written.

## Reading the record page

- Seals show lifecycle, assessment, and right state; `EXPIRED` means the last good checkpoint aged out.
- Each clause shows its latest consensus verdict with the verbatim supporting excerpt and reason.
- Each source shows coverage, HTTP status, length, and its full-response digest from the latest checkpoint.
- The enforcement panel shows the beneficiary, creator, freshness deadline, revision, and exercise count.
