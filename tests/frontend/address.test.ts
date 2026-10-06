import { describe, expect, it } from "vitest";
import {
  DEPLOYED_CONTRACT_ADDRESS,
  OATHMARK_CONTRACT_ADDRESS,
  contractAddressOrNull,
  isContractConfigured,
  requireContractAddress,
} from "@/lib/contract/address";
import deployments from "../../deployments/studionet.json";

describe("contract address configuration", () => {
  it("ships a finalized Studionet address in code", () => {
    expect(DEPLOYED_CONTRACT_ADDRESS).toMatch(/^0x[a-fA-F0-9]{40}$/);
  });

  it("is configured without any environment variable", () => {
    expect(isContractConfigured()).toBe(true);
    expect(requireContractAddress()).toBe(OATHMARK_CONTRACT_ADDRESS);
    expect(contractAddressOrNull()).toBe(OATHMARK_CONTRACT_ADDRESS);
  });

  it("matches the deployments record", () => {
    expect(deployments.contractAddress).toBe(DEPLOYED_CONTRACT_ADDRESS);
    expect(deployments.chainId).toBe(61999);
    expect(deployments.explorerAddressUrl).toContain(DEPLOYED_CONTRACT_ADDRESS);
  });
});
