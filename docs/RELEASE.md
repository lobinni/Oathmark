# Release facts

## Current release

| Item                    | Value                                        |
| ----------------------- | -------------------------------------------- |
| Contract                | `contracts/oathmark.py` (class `Oathmark`)   |
| Authority schema        | `oathmark-authority-v1`                       |
| Well-known path         | `/.well-known/oathmark.json`                  |
| Network                 | GenLayer Studionet                           |
| Chain ID                | 61999                                        |
| RPC                     | https://studio.genlayer.com/api              |
| Live contract address   | `0x99C44A4bA20360e65879D4aF69018FF58665F63e` |
| Address source of truth | committed in code (`src/lib/contract/address.ts`), mirrored in `deployments/studionet.json` |

The deployed contract address ships in the codebase — no environment variable or database is required to build or
run the frontend. Rotate it per [docs/DEPLOYMENT.md](DEPLOYMENT.md) and record every rotation here.

## Verification status

| Gate                                   | Command                                     | Status |
| -------------------------------------- | ------------------------------------------- | ------ |
| Frontend unit tests                    | `npx vitest run`                            | passing |
| Contract lifecycle tests               | `python3 -m pytest tests/contract -q`       | passing (17) |
| Contract static checks                 | `python3 scripts/contract_static_checks.py` | passing |
| TypeScript                             | `npm run typecheck`                         | passing |
| Production build                       | `npm run build`                             | passing |

## Deployment log

| Network  | Contract address | Explorer | Notes |
| -------- | ---------------- | -------- | ----- |
| Studionet (chain 61999) | `0x99C44A4bA20360e65879D4aF69018FF58665F63e` | [view](https://explorer-studio.genlayer.com/address/0x99C44A4bA20360e65879D4aF69018FF58665F63e) | Live; committed in `src/lib/contract/address.ts` and `deployments/studionet.json`. All senders normalized to lowercase (EIP-55 safe) |
