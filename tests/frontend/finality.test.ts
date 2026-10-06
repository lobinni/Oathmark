import { describe, expect, it } from "vitest";
import { consensusDecision, executionDecision, isSuccessfulExecution } from "@/lib/contract/finality";

describe("consensusDecision", () => {
  it("detects majority agreement anywhere in the receipt", () => {
    expect(consensusDecision({ consensus_data: { votes: { "0x1": { result: "MAJORITY_AGREE" } } } })).toBe("MAJORITY_AGREE");
  });
  it("prefers failure signals", () => {
    expect(consensusDecision({ status: "MAJORITY_AGREE", detail: { vote: "NO_MAJORITY" } })).toBe("NO_MAJORITY");
    expect(consensusDecision({ a: { consensus: "MAJORITY_DISAGREE" } })).toBe("MAJORITY_DISAGREE");
  });
  it("returns null when nothing is known", () => {
    expect(consensusDecision({ foo: "bar" })).toBeNull();
  });
});

describe("executionDecision", () => {
  it("reads direct camelCase and snake_case fields", () => {
    expect(executionDecision({ txExecutionResultName: "FINISHED_WITH_RETURN" })).toBe("FINISHED_WITH_RETURN");
    expect(executionDecision({ execution_result: "SUCCESS" })).toBe("SUCCESS");
  });
  it("finds the leader execution result under any nesting", () => {
    const receipt = { consensus_data: { votes: [{ mode: "LEADER", execution_result: "success" }] } };
    expect(executionDecision(receipt)).toBe("SUCCESS");
  });
  it("ignores idle validator cancellations when the leader succeeded", () => {
    const receipt = {
      consensus_data: {
        votes: [
          { mode: "VALIDATOR", execution_result: "ERROR" },
          { mode: "LEADER", execution_result: "FINISHED_WITH_RETURN" },
        ],
      },
    };
    expect(executionDecision(receipt)).toBe("FINISHED_WITH_RETURN");
  });
});

describe("isSuccessfulExecution", () => {
  it("accepts both success spellings", () => {
    expect(isSuccessfulExecution("FINISHED_WITH_RETURN")).toBe(true);
    expect(isSuccessfulExecution("SUCCESS")).toBe(true);
    expect(isSuccessfulExecution("ERROR")).toBe(false);
    expect(isSuccessfulExecution(null)).toBe(false);
  });
});
