# Deployment guide

This guide covers the deployed contract, publishing the frontend to GitHub and Vercel (no environment variables and
no database required), and rotating the contract address directly in the codebase.

## Live contract deployment

The Oathmark intelligent contract (`contracts/oathmark.py`) is deployed on GenLayer Studionet:

- Address: `0x99C44A4bA20360e65879D4aF69018FF58665F63e`
- Explorer: https://explorer-studio.genlayer.com/address/0x99C44A4bA20360e65879D4aF69018FF58665F63e
- Chain ID: 61999 · RPC: https://studio.genlayer.com/api

The address is committed in two places and kept in sync by a script and a test:

- `src/lib/contract/address.ts` (`DEPLOYED_CONTRACT_ADDRESS`) — read by every contract call
- `deployments/studionet.json` — the machine-readable deployment record

Because the address ships in code, the frontend needs **no** `NEXT_PUBLIC_*` variable, **no** `DATABASE_URL`, and no
secrets of any kind.

## Deploying a new contract (only when rotating)

```bash
npm exec -- genlayer network set studionet
npm exec -- genlayer network info
npm exec -- genlayer deploy --contract contracts/oathmark.py --rpc https://studio.genlayer.com/api
```

Use a funded deployer and never commit private keys. Wait for finalization on the explorer, then rotate the address
into the codebase:

```bash
node scripts/update-contract-address.mjs 0xYourFinalizedAddress
npx vitest run
```

The script updates `src/lib/contract/address.ts` and `deployments/studionet.json` together; the address test in
`tests/frontend/address.test.ts` fails if they ever drift apart. Commit, push, redeploy — done. Nothing else in the
app references the address.

## Publishing to GitHub

```bash
git init
git add -A
git commit -m "Oathmark — consensus-enforced promise ledger"
git branch -M main
git remote add origin https://github.com/<your-account>/<your-repo>.git
git push -u origin main
```

The committed `.gitignore` keeps `.env`, `node_modules`, build output, and Python caches out of the repository.

## Deploying the frontend on Vercel

The project builds with zero environment variables and zero databases.

**Option A — dashboard:**

1. Import the repository on vercel.com (Framework preset: Next.js, root directory: the repository root).
2. Leave the environment variable section empty.
3. Deploy — the build command `next build` and output are detected automatically.

**Option B — CLI:**

```bash
npm install -g vercel
vercel login
vercel          # preview deployment — answer prompts with defaults
vercel --prod   # production deployment
```

After deployment, `/api/health` reports `ok`, the active network, and the linked contract address; it works without a
database and also reports database health automatically if one is ever attached.

## Post-deployment smoke test

1. Open the deployed URL; the hero shows the live pledge count (or “Live on Studionet” while the RPC warms up).
2. Connect MetaMask on chain 61999; the header shows your account and the Studionet label.
3. Create a draft pledge for a domain you control (a `*.vercel.app` preview domain works well for testing).
4. Download the authority manifest from the compose sidebar and publish it at
   `https://<your-domain>/.well-known/oathmark.json` with the exact body the app produced.
5. Open the record, choose “Verify baseline & activate”, and confirm in MetaMask.
6. Wait for the ribbon to report “Confirmed and applied” — finalized, majority agreement, successful leader execution,
   and a successful state re-read.
7. After one review interval, run a checkpoint from any account and confirm the assessment updates.
8. As the beneficiary, exercise the right once and confirm the receipt appears.

Common failure causes:

- Manifest published at a path other than the exact well-known URL (record shows `AUTHORITY_UNVERIFIED`).
- Manifest fields that do not match the pledge byte-for-byte (issuer/beneficiary case, digest of a revised clause).
- Sources that require login or return bot-protection pages (record closes as `SOURCE_UNAVAILABLE`).
