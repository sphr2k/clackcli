import { describe, expect, test } from "bun:test";
import * as publicApi from "../src/index";
import type { Plan } from "../src/plan";

describe("renderPlan", () => {
  test("renders a plan summary, before and after values, and risks", () => {
    const renderPlan = (publicApi as unknown as Record<string, unknown>).renderPlan;
    expect(typeof renderPlan).toBe("function");

    const plan: Plan = {
      summary: "Update the example service",
      changes: [
        { description: "Set the service version", before: "1.2.0", after: "1.3.0" },
        { description: "Restart the service" },
      ],
      risks: [{ description: "The service restarts during the update", level: "low" }],
    };

    expect((renderPlan as (value: Plan) => string)(plan)).toBe(
      "Summary: Update the example service\n\nChanges:\n" +
      "- Set the service version (1.2.0 → 1.3.0)\n" +
      "- Restart the service\n\nRisks:\n" +
      "- [low] The service restarts during the update\n",
    );
  });

  test("renders empty change and risk sections", () => {
    const renderPlan = (publicApi as unknown as Record<string, unknown>).renderPlan as
      (value: Plan) => string;
    expect(typeof renderPlan).toBe("function");

    expect(renderPlan({ summary: "No changes", changes: [], risks: [] })).toBe(
      "Summary: No changes\n\nChanges:\n- None\n\nRisks:\n- None\n",
    );
  });
});
