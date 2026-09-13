import { describe, expect, test } from "bun:test";
import { isEmptyPlan, type Plan, type Prepared } from "../src/plan";

describe("plan contracts", () => {
  test("models changes and risks without tying them to a domain", () => {
    const plan: Plan = {
      summary: "Update three resources",
      changes: [{ description: "Change replicas", before: "2", after: "3" }],
      risks: [{ description: "More capacity may be used", level: "low" }],
    };
    const prepared: Prepared<{ token: string }> = {
      plan,
      state: { token: "opaque-to-clackcli" },
      cleanup: () => {},
    };

    expect(prepared.plan).toBe(plan);
    expect(prepared.state.token).toBe("opaque-to-clackcli");
  });

  test("treats a plan with no changes as empty", () => {
    expect(isEmptyPlan({ summary: "No changes", changes: [], risks: [] })).toBe(true);
    expect(isEmptyPlan({ summary: "One change", changes: [{ description: "Update" }], risks: [] })).toBe(false);
  });
});
