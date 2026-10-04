import { describe, expect, test } from "bun:test";
import {
  renderStatusViewText,
  writeStatusView,
  type StatusView,
  type StatusViewUi,
} from "../src/status-view";
import { createRuntime } from "../src/runtime";
import { inputStream, outputStream } from "./streams";

const view: StatusView = {
  title: "Example",
  sections: [
    {
      title: "Platform",
      rows: [
        { label: "Operator", status: { indicator: "active", text: "healthy" } },
        { label: "Last backup", value: "18 min ago" },
      ],
    },
    {
      title: "Recovery",
      rows: [
        { label: "prd", status: { indicator: "inactive", text: "stopped" } },
      ],
    },
  ],
};

describe("status view", () => {
  test("renders deterministic ANSI-free text with aligned labels", () => {
    const output = renderStatusViewText(view);

    expect(output).toBe(
      [
        "Example",
        "",
        "Platform",
        "Operator      ● healthy",
        "Last backup   18 min ago",
        "",
        "Recovery",
        "prd   ○ stopped",
        "",
      ].join("\n"),
    );
    expect(output).not.toContain("\u001b");
  });

  test("uses Clack-native intro, steps, guides and status symbols interactively", () => {
    const calls: string[] = [];
    const ui: StatusViewUi = {
      intro(title, options) {
        calls.push(`intro:${title}:${options.withGuide}`);
      },
      step(message, options) {
        calls.push(`step:${message}:${options.spacing}`);
      },
      message(message, options) {
        calls.push(
          `message:${message.replace(/\u001b\[[0-9;]*m/g, "")}:${options.symbol?.replace(/\u001b\[[0-9;]*m/g, "")}`,
        );
      },
    };
    const runtime = createRuntime({
      input: inputStream(true),
      stdout: outputStream(true),
      stderr: outputStream(true),
      env: {},
    });

    writeStatusView(runtime, view, "interactive", ui);

    expect(calls).toEqual([
      "intro:Example:true",
      "step:Platform:0",
      "message:Operator      ● healthy:│",
      "message:Last backup   18 min ago:│",
      "step:Recovery:1",
      "message:prd   ○ stopped:└",
    ]);
  });

  test("falls back to text in non-interactive auto mode", () => {
    let stdout = "";
    const runtime = createRuntime({
      input: inputStream(false),
      stdout: outputStream(false, (chunk) => {
        stdout += chunk;
      }),
      stderr: outputStream(false),
      env: {},
    });

    writeStatusView(runtime, view);

    expect(stdout).toContain("Platform\n");
    expect(stdout).toContain("prd   ○ stopped");
  });

  test("rejects forced interactive output without interactive capabilities", () => {
    const runtime = createRuntime({
      input: inputStream(false),
      stdout: outputStream(false),
      stderr: outputStream(false),
      env: {},
    });

    expect(() => writeStatusView(runtime, view, "interactive")).toThrow(/requires a TTY/);
  });

  test("sanitizes multiline domain values before presentation", () => {
    const output = renderStatusViewText({
      title: "Example",
      sections: [
        {
          title: "State",
          rows: [{ label: "bad\nlabel", value: "one\ttwo\nthree" }],
        },
      ],
    });

    expect(output).toContain("bad label   one two three");
  });
});

