import { describe, expect, test } from "bun:test";
import { createRuntime } from "../src/runtime";
import { UserCancelledError } from "../src/exit";
import { runPreparedApply } from "../src/apply";
import type { Plan, Prepared } from "../src/plan";
import { inputStream, outputStream } from "./streams";

const plan = (changes = 1): Plan => ({
  summary: "Apply sample changes",
  changes: Array.from({ length: changes }, (_, index) => ({ description: `Change ${index + 1}` })),
  risks: [],
});

const prepared = <State>(value: State, cleanup: () => void | Promise<void> = () => {}): Prepared<State> => ({
  plan: plan(),
  state: value,
  cleanup,
});

const runtime = (interactive: boolean) => createRuntime({
  input: inputStream(interactive),
  stdout: outputStream(interactive),
  stderr: outputStream(interactive),
  env: {},
});

describe("runPreparedApply", () => {
  test("skips empty plans and always cleans prepared state", async () => {
    let applied = false;
    let confirmed = false;
    let cleanups = 0;
    const value = prepared("state", () => { cleanups += 1; });
    value.plan = plan(0);

    const result = await runPreparedApply({
      prepared: value,
      runtime: runtime(true),
      confirm: async () => { confirmed = true; return true; },
      apply: async () => { applied = true; },
    });

    expect(result).toMatchObject({ status: "noop", exitCode: 0 });
    expect(applied).toBe(false);
    expect(confirmed).toBe(false);
    expect(cleanups).toBe(1);
  });

  test("cleans declined prepared state without applying", async () => {
    let applied = false;
    let cleanups = 0;

    const result = await runPreparedApply({
      prepared: prepared("state", () => { cleanups += 1; }),
      runtime: runtime(true),
      confirm: async () => false,
      apply: async () => { applied = true; },
    });

    expect(result).toMatchObject({ status: "declined", exitCode: 1 });
    expect(applied).toBe(false);
    expect(cleanups).toBe(1);
  });

  test("allows an explicit non-interactive bypass", async () => {
    let cleanups = 0;

    const result = await runPreparedApply({
      prepared: prepared("state", () => { cleanups += 1; }),
      runtime: runtime(false),
      bypassConfirmation: true,
      confirm: async () => { throw new Error("must not prompt"); },
      apply: async (state) => `applied ${state}`,
    });

    expect(result).toMatchObject({ status: "applied", exitCode: 0, value: "applied state" });
    expect(cleanups).toBe(1);
  });

  test("requires a non-interactive bypass and cleans state", async () => {
    let cleanups = 0;
    let applied = false;

    const result = await runPreparedApply({
      prepared: prepared("state", () => { cleanups += 1; }),
      runtime: runtime(false),
      apply: async () => { applied = true; },
    });

    expect(result.status).toBe("failed");
    expect(result.exitCode).toBe(2);
    expect(applied).toBe(false);
    expect(cleanups).toBe(1);
  });

  test("returns failure and cleans state when apply throws", async () => {
    let cleanups = 0;
    const error = new Error("write failed");

    const result = await runPreparedApply({
      prepared: prepared("state", () => { cleanups += 1; }),
      runtime: runtime(true),
      confirm: async () => true,
      apply: async () => { throw error; },
    });

    expect(result).toMatchObject({ status: "failed", exitCode: 2, error });
    expect(cleanups).toBe(1);
  });

  test("classifies user cancellation without treating it as a failure", async () => {
    let cleanups = 0;

    const result = await runPreparedApply({
      prepared: prepared("state", () => { cleanups += 1; }),
      runtime: runtime(true),
      confirm: async () => { throw new UserCancelledError(); },
      apply: async () => {},
    });

    expect(result).toMatchObject({ status: "cancelled", exitCode: 130 });
    expect(cleanups).toBe(1);
  });

  test("classifies a cleanup error after successful apply as failure", async () => {
    let cleanups = 0;
    const cleanupError = new Error("cleanup failed");

    const result = await runPreparedApply({
      prepared: prepared("state", () => { cleanups += 1; throw cleanupError; }),
      runtime: runtime(true),
      confirm: async () => true,
      apply: async () => "applied",
    });

    expect(result).toMatchObject({ status: "failed", exitCode: 2, error: cleanupError });
    expect(cleanups).toBe(1);
  });

  test("retains apply and cleanup errors when both fail", async () => {
    let cleanups = 0;
    const applyError = new Error("apply failed");
    const cleanupError = new Error("cleanup failed");

    const result = await runPreparedApply({
      prepared: prepared("state", () => { cleanups += 1; throw cleanupError; }),
      runtime: runtime(true),
      confirm: async () => true,
      apply: async () => { throw applyError; },
    });

    expect(result.status).toBe("failed");
    expect(result.exitCode).toBe(2);
    expect(result.status === "failed" && result.error).toBeInstanceOf(AggregateError);
    expect(result.status === "failed" && (result.error as AggregateError).errors)
      .toEqual([applyError, cleanupError]);
    expect(cleanups).toBe(1);
  });
});
