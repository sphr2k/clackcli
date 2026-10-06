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

  test("aligns labels by terminal display width", () => {
    const output = renderStatusViewText({
      title: "Example",
      sections: [
        {
          title: "State",
          rows: [
            { label: "環境", value: "ready" },
            { label: "Name", value: "ready" },
          ],
        },
      ],
    });

    expect(output).toContain("環境   ready");
    expect(output).toContain("Name   ready");
  });

  test("closes the interactive guide for an empty final section", () => {
    const calls: string[] = [];
    const ui: StatusViewUi = {
      intro() {},
      step(message) {
        calls.push(`step:${message}`);
      },
      message(message, options) {
        calls.push(
          `message:${message}:${options.symbol?.replace(/\u001b\[[0-9;]*m/g, "")}`,
        );
      },
    };
    const runtime = createRuntime({
      input: inputStream(true),
      stdout: outputStream(true),
      stderr: outputStream(true),
      env: {},
    });

    writeStatusView(
      runtime,
      { title: "Example", sections: [{ title: "Empty", rows: [] }] },
      "interactive",
      ui,
    );

    expect(calls).toEqual(["step:Empty", "message::└"]);
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

    expect(() => writeStatusView(runtime, view, "interactive")).toThrow(
      /requires a TTY/,
    );
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

const semantic: StatusView = {
  title: "Example",
  summary: {
    assessment: "warning",
    label: "Degraded",
    detail: "1 issue requires attention",
  },
  issues: [
    {
      kind: "issue",
      severity: "warning",
      title: "Storage behind",
      detail: "Still serving",
      facts: [{ label: "backlog", value: "91 MiB" }],
      action: "example inspect",
    },
  ],
  sections: [
    {
      title: "Recovery",
      rows: [
        {
          kind: "check",
          label: "Compute",
          assessment: "ok",
          state: "stopped",
          facts: [
            { label: "tenant", value: "12345678901234567890123456789012" },
            { label: "stage", value: "development" },
          ],
        },
        { kind: "activity", label: "Backup", state: "running" },
        {
          kind: "check",
          label: "Telemetry",
          assessment: "unknown",
          state: "missing",
        },
        {
          kind: "check",
          label: "Database",
          assessment: "critical",
          state: "down",
        },
      ],
    },
  ],
  footer: {
    kind: "check",
    label: "Platform",
    assessment: "ok",
    state: "healthy",
  },
};

test("separates assessment from lifecycle and puts issues before context", () => {
  const output = renderStatusViewText(semantic);
  expect(output).toContain("● stopped");
  expect(output).toContain("▲ Degraded");
  expect(output).toContain("? missing");
  expect(output).toContain("■ down");
  expect(output).toContain("↻ running");
  expect(output.indexOf("Storage behind")).toBeLessThan(
    output.indexOf("Recovery"),
  );
  expect(output).toContain("Action: example inspect");
});

test("wraps semantic evidence by display width without losing long values", () => {
  const wide = renderStatusViewText(semantic, 160);
  const narrow = renderStatusViewText(semantic, 32);
  expect(wide).toContain(
    "tenant 12345678901234567890123456789012 · stage development",
  );
  expect(narrow.split("\n").every((line) => line.length <= 32)).toBe(true);
  expect(narrow.replaceAll(/\s/g, "")).toContain(
    "tenant12345678901234567890123456789012",
  );
  expect(narrow).not.toContain("\u001b");
});

test("sanitizes terminal control sequences in semantic issue facts and actions", () => {
  const output = renderStatusViewText({
    title: "Safe",
    sections: [],
    issues: [
      {
        kind: "issue",
        severity: "unknown",
        title: "bad\u001b[31mtitle",
        facts: [{ value: "\u001b]0;danger\u0007value" }],
        action: "one\ntwo",
      },
    ],
  });
  expect(output).toContain("badtitle");
  expect(output).toContain("value");
  expect(output).toContain("one two");
  expect(output).not.toContain("danger");
  expect(output).not.toContain("\u001b");
});

test("closes summary-only and footer views once on the injected stdout", () => {
  for (const view of [
    { title: "Summary", summary: semantic.summary, sections: [] },
    semantic,
  ]) {
    const output = outputStream(true);
    const runtime = createRuntime({
      input: inputStream(true),
      stdout: output,
      stderr: outputStream(true),
      env: {},
    });
    const symbols: string[] = [];
    const ui: StatusViewUi = {
      intro(_title, options) {
        expect(options.output).toBe(output);
      },
      step(_message, options) {
        expect(options.output).toBe(output);
      },
      message(_message, options) {
        expect(options.output).toBe(output);
        symbols.push(options.symbol?.replace(/\u001b\[[0-9;]*m/g, "") ?? "");
      },
    };
    writeStatusView(runtime, view, "interactive", ui);
    expect(symbols.filter((symbol) => symbol === "└")).toHaveLength(1);
    expect(symbols.at(-1)).toBe("└");
  }
});
