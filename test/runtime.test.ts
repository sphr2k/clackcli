import { describe, expect, test } from "bun:test";
import { createRuntime } from "../src/runtime";
import { EXIT_CODES, UserCancelledError, exitCodeFor, isUserCancelled } from "../src/exit";
import { inputStream, outputStream } from "./streams";

describe("createRuntime", () => {
  test("exposes usable readable and writable process stream APIs", () => {
    const runtime = createRuntime();

    expect(typeof runtime.input.on).toBe("function");
    expect(typeof runtime.stdout.end).toBe("function");
    expect(typeof runtime.stderr.write).toBe("function");
  });

  test("keeps injected streams and detects non-interactive input", () => {
    const input = inputStream(false);
    const stdout = outputStream(true);
    const stderr = outputStream(true);

    const runtime = createRuntime({ input, stdout, stderr, env: {} });

    expect(runtime.input).toBe(input);
    expect(runtime.stdout).toBe(stdout);
    expect(runtime.stderr).toBe(stderr);
    expect(runtime.capabilities).toEqual({ interactive: false, ci: false });
  });

  test("detects an interactive terminal and CI environment", () => {
    const runtime = createRuntime({
      input: inputStream(true),
      stdout: outputStream(true),
      stderr: outputStream(true),
      env: { CI: "true" },
    });

    expect(runtime.capabilities).toEqual({ interactive: true, ci: true });
  });

  test("allows explicit capability injection", () => {
    const runtime = createRuntime({
      input: inputStream(false),
      stdout: outputStream(false),
      stderr: outputStream(false),
      env: {},
      capabilities: { interactive: true, ci: false },
    });

    expect(runtime.capabilities.interactive).toBe(true);
  });
});

describe("exit classification", () => {
  test("maps command outcomes to documented process exit codes", () => {
    expect(EXIT_CODES).toEqual({ success: 0, negative: 1, failure: 2, cancelled: 130 });
    expect(exitCodeFor("success")).toBe(0);
    expect(exitCodeFor("negative")).toBe(1);
    expect(exitCodeFor("failure")).toBe(2);
    expect(exitCodeFor("cancelled")).toBe(130);
  });

  test("recognizes explicit user cancellation", () => {
    expect(isUserCancelled(new UserCancelledError())).toBe(true);
    expect(isUserCancelled(new Error("unexpected"))).toBe(false);
  });
});
