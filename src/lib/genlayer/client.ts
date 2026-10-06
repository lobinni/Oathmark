import { createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
import type { Eip1193Provider } from "@/lib/wallet/types";

/**
 * Anonymous client for view calls. Reading never requires a wallet.
 */
export function createReadClient() {
  return createClient({ chain: studionet });
}

/**
 * Wallet-bound client for writes. The account belongs to the visitor's
 * injected EIP-1193 wallet; Oathmark never holds keys.
 */
export function createWriteClient(account: `0x${string}`, provider: Eip1193Provider) {
  return createClient({ chain: studionet, account, provider });
}
