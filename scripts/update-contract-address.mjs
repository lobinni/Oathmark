#!/usr/bin/env node
/**
 * Rotates the deployed contract address across the codebase.
 *
 * Usage:
 *   node scripts/update-contract-address.mjs 0xYourFinalizedAddress
 *
 * Updates:
 *   - DEPLOYED_CONTRACT_ADDRESS in src/lib/contract/address.ts
 *   - deployments/studionet.json
 *
 * Afterwards: run the tests, rebuild, and redeploy the frontend. No
 * environment variable is required anywhere.
 */

import { readFileSync, writeFileSync } from "node:fs";

const ADDRESS_FILE = "src/lib/contract/address.ts";
const DEPLOYMENTS_FILE = "deployments/studionet.json";

const address = (process.argv[2] ?? "").trim();
if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
  console.error("Usage: node scripts/update-contract-address.mjs 0x<40 hex chars>");
  process.exit(1);
}

const source = readFileSync(ADDRESS_FILE, "utf8");
const pattern = /export const DEPLOYED_CONTRACT_ADDRESS = "0x[a-fA-F0-9]{40}";/;
if (!pattern.test(source)) {
  console.error(`Could not find DEPLOYED_CONTRACT_ADDRESS in ${ADDRESS_FILE}`);
  process.exit(1);
}
writeFileSync(ADDRESS_FILE, source.replace(pattern, `export const DEPLOYED_CONTRACT_ADDRESS = "${address}";`));

let deployments = {};
try {
  deployments = JSON.parse(readFileSync(DEPLOYMENTS_FILE, "utf8"));
} catch {
  /* file will be created below */
}
writeFileSync(
  DEPLOYMENTS_FILE,
  JSON.stringify(
    {
      ...deployments,
      contractAddress: address,
      explorerAddressUrl: `https://explorer-studio.genlayer.com/address/${address}`,
      status: "live",
    },
    null,
    2,
  ) + "\n",
);

console.log(`contract address updated to ${address}`);
console.log("next steps:");
console.log("  1. npx vitest run && python3 -m pytest tests/contract -q");
console.log("  2. npm run build");
console.log("  3. commit, push to GitHub, and redeploy the frontend");
