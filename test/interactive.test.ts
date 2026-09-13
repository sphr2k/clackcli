import { describe, expect, test } from "bun:test";
import { createInteractiveConfirmation, createInteractiveReporter, type InteractiveUi } from "../src/interactive";
import { UserCancelledError } from "../src/exit";
import { createRuntime } from "../src/runtime";
import type { Plan } from "../src/plan";
import { inputStream, outputStream } from "./streams";

const makeRuntime = () => {
  const input = inputStream(true);
  const stdout = outputStream(true);
  const stderr = outputStream(true);
  return { runtime: createRuntime({ input, stdout, stderr, env: {} }), input, stdout, stderr };
};

const plan: Plan = {
  summary: "Update two services",
  changes: [{ description: "Change service A" }, { description: "Change service B" }],
  risks: [],
};

describe("interactive Clack adapters", () => {
  test("renders activity through Clack on stderr", () => {
    const { runtime, stderr } = makeRuntime();
    const events: string[] = [];
    let output: unknown;
    const ui: InteractiveUi = {
      confirm: async () => true,
      isCancel: () => false,
      spinner: (options) => {
        output = options.output;
        return {
          start: (message) => { events.push(`start:${message}`); },
          message: (message) => { events.push(`message:${message}`); },
          stop: (message) => { events.push(`stop:${message}`); },
          error: (message) => { events.push(`error:${message}`); },
        };
      },
    };

    const activity = createInteractiveReporter(runtime, ui).start("Downloading");
    activity.message("50%");
    activity.complete("Downloaded");
    activity.fail("Failed");

    expect(output).toBe(stderr);
    expect(events).toEqual(["start:Downloading", "message:50%", "stop:Downloaded", "error:Failed"]);
  });

  test("confirms the plan using injected input and stderr", async () => {
    const { runtime, input, stdout, stderr } = makeRuntime();
    let options: { message: string; input: unknown; output: unknown } | undefined;
    const ui: InteractiveUi = {
      confirm: async (value) => { options = value; return true; },
      isCancel: () => false,
      spinner: () => ({ start() {}, message() {}, stop() {}, error() {} }),
    };

    const confirmed = await createInteractiveConfirmation(runtime, ui)(plan);

    expect(confirmed).toBe(true);
    expect(options?.input).toBe(input);
    expect(options?.output).toBe(stderr);
    expect(options?.output).not.toBe(stdout);
    expect(options?.message).toContain(plan.summary);
  });

  test("turns Clack cancellation into a user-cancelled outcome", async () => {
    const { runtime } = makeRuntime();
    const cancelled = Symbol("clack-cancel");
    const ui: InteractiveUi = {
      confirm: async () => cancelled,
      isCancel: (value) => value === cancelled,
      spinner: () => ({ start() {}, message() {}, stop() {}, error() {} }),
    };

    await expect(createInteractiveConfirmation(runtime, ui)(plan)).rejects.toBeInstanceOf(UserCancelledError);
  });

  test("refuses interactive adapters when runtime capabilities are non-interactive", () => {
    const runtime = createRuntime({
      input: inputStream(false),
      stdout: outputStream(false),
      stderr: outputStream(false),
      env: {},
    });

    expect(() => createInteractiveReporter(runtime)).toThrow(/interactive capabilities/);
    expect(() => createInteractiveConfirmation(runtime)).toThrow(/interactive capabilities/);
  });

  test.skipIf(process.platform === "win32")("runs the real Clack prompt against Bun PTY streams", async () => {
    let output = "";
    let answered = false;
    const decoder = new TextDecoder();
    const child = Bun.spawn(
      [process.execPath, "run", "examples/plan-apply.ts", "apply"],
      {
        cwd: process.cwd(),
        terminal: {
          cols: 80,
          rows: 24,
          data(terminal, chunk) {
            output += decoder.decode(chunk, { stream: true });
            if (!answered && output.includes("Apply 1 change?") && output.includes("Yes")) {
              answered = true;
              terminal.write("y\n");
            }
          },
        },
      },
    );
    const timeout = setTimeout(() => child.kill(), 5_000);
    const exitCode = await child.exited;
    clearTimeout(timeout);

    expect(answered).toBe(true);
    expect(exitCode).toBe(0);
    expect(output).toContain('"updatedVersion":"1.3.0"');
  });
});
