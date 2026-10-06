/**
 * Single source of truth for the deployed Oathmark contract address.
 *
 * The finalized Studionet deployment ships directly in the codebase so a plain
 * clone, GitHub push, or Vercel deploy works out of the box with no
 * environment configuration.
 *
 * To rotate to a new deployment, run:
 *
 *     node scripts/update-contract-address.mjs 0xYourNewAddress
 *
 * which updates this constant and deployments/studionet.json together. An
 * operator may still override per environment with
 * NEXT_PUBLIC_OATHMARK_CONTRACT_ADDRESS when needed.
 */
export const DEPLOYED_CONTRACT_ADDRESS = "0x99C44A4bA20360e65879D4aF69018FF58665F63e";

export const OATHMARK_CONTRACT_ADDRESS: string = (
  process.env.NEXT_PUBLIC_OATHMARK_CONTRACT_ADDRESS ?? DEPLOYED_CONTRACT_ADDRESS
).trim();

const ADDRESS_PATTERN = /^0x[a-fA-F0-9]{40}$/;

export function isContractConfigured(): boolean {
  return ADDRESS_PATTERN.test(OATHMARK_CONTRACT_ADDRESS);
}

export function contractAddressOrNull(): `0x${string}` | null {
  return isContractConfigured() ? (OATHMARK_CONTRACT_ADDRESS as `0x${string}`) : null;
}

export function requireContractAddress(): `0x${string}` {
  if (!isContractConfigured()) {
    throw new Error(
      "Oathmark contract address is not configured. Set DEPLOYED_CONTRACT_ADDRESS in src/lib/contract/address.ts to a finalized Studionet deployment.",
    );
  }
  return OATHMARK_CONTRACT_ADDRESS as `0x${string}`;
}
