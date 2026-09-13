import { describe, expect, test } from "bun:test";
import { createReporter } from "../src/reporter";
import { writeJsonResult } from "../src/result";
import { createRuntime } from "../src/runtime";
import { inputStream, outputStream } from "./streams";

const captureRuntime = (interactive: boolean) => {
  let stdoutText = "";
  let stderrText = "";
  const runtime = createRuntime({
    input: inputStream(interactive),
    stdout: outputStream(interactive, (chunk) => { stdoutText += chunk; }),
    stderr: outputStream(interactive, (chunk) => { stderrText += chunk; }),
    env: {},
  });
  return { runtime, stdout: () => stdoutText, stderr: () => stderrText };
};

describe("reporter selection and text progress", () => {
  test("uses stable ANSI-free stderr lines when capabilities are non-interactive", () => {
    const output = captureRuntime(false);
    const activity = createReporter(output.runtime).start("\u001b[31mDeploy\u001b[0m\nphase");
    activity.message("10%\r\nnext");
    activity.complete("done");

    expect(output.stderr()).toBe("[start] Deploy phase\n[progress] 10% next\n[done] done\n");
    expect(output.stdout()).toBe("");
    expect(output.stderr()).not.toMatch(/\u001b/);
  });

  test("writes failed terminal status to stderr", () => {
    const output = captureRuntime(false);
    createReporter(output.runtime).start("Plan").fail("request failed");

    expect(output.stderr()).toBe("[start] Plan\n[failed] request failed\n");
  });

  test("removes DCS and single-character ANSI controls from text progress", () => {
    const output = captureRuntime(false);
    createReporter(output.runtime).start("Plan").message("phase\u001bP1;2|private data\u001b\\ done\u001bD");

    expect(output.stderr()).toBe("[start] Plan\n[progress] phase done\n");
    expect(output.stderr()).not.toMatch(/\u001b/);
  });

  test("removes ANSI escapes with intermediate bytes and C0 controls", () => {
    const output = captureRuntime(false);
    createReporter(output.runtime).start("Plan").message("charset\u001b(B frame\u001b#8 backspace\u0008 done\u0007");

    expect(output.stderr()).toBe("[start] Plan\n[progress] charset frame backspace done\n");
    expect(output.stderr().replace(/\n/g, "")).not.toMatch(/[\u0000-\u001f\u007f-\u009f]/);
  });

  test("preserves visible text between OSC 8 hyperlinks", () => {
    const output = captureRuntime(false);
    createReporter(output.runtime).start("Plan").message(
      "7-bit:\u001b]8;;https://example.com\u001b\\visible\u001b]8;;\u001b\\ C1:\u009d8;;https://example.com\u009cvisible\u009d8;;\u009c",
    );

    expect(output.stderr()).toBe("[start] Plan\n[progress] 7-bit:visible C1:visible\n");
  });

  test("does not allow forced Clack output without interactive capabilities", () => {
    const output = captureRuntime(false);

    expect(() => createReporter(output.runtime, "interactive")).toThrow(/interactive capabilities/);
  });

  test("writes one ANSI-free JSON result to stdout while progress stays on stderr", () => {
    const output = captureRuntime(false);
    createReporter(output.runtime).start("\u001b[32mPlan\u001b[0m").complete("Ready");
    const result = { status: "ready", detail: "\u001b[31mgreen\u001b[0m\nnext" };

    writeJsonResult(result, output.runtime);

    expect(output.stdout()).toBe(`${JSON.stringify(result)}\n`);
    expect(output.stdout()).not.toMatch(/\u001b/);
    expect(output.stdout().split("\n")).toHaveLength(2);
    expect(output.stderr()).toBe("[start] Plan\n[done] Ready\n");
    expect(JSON.parse(output.stdout())).toEqual(result);
  });

  test("rejects values that cannot be represented as JSON", () => {
    const output = captureRuntime(false);

    expect(() => writeJsonResult(undefined, output.runtime)).toThrow(/JSON value/);
    expect(output.stdout()).toBe("");
  });
});
