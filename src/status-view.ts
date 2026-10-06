import { styleText } from "node:util";
import stringWidth from "fast-string-width";
import {
  intro as clackIntro,
  log as clackLog,
  S_BAR,
  S_BAR_END,
  S_RADIO_ACTIVE,
  S_RADIO_INACTIVE,
} from "@clack/prompts";
import type { OutputStream, Runtime } from "./runtime";

export type Assessment = "ok" | "warning" | "critical" | "unknown";
export interface StatusFact {
  label?: string;
  value: string;
}
export interface StatusCheck {
  kind: "check";
  label: string;
  assessment: Assessment;
  state?: string;
  facts?: StatusFact[];
}
export interface StatusIssue {
  kind: "issue";
  severity: Exclude<Assessment, "ok">;
  title: string;
  detail?: string;
  action?: string;
  facts?: StatusFact[];
}
export interface StatusFactRow {
  kind: "fact";
  label: string;
  value: string;
}
export interface StatusActivity {
  kind: "activity";
  label: string;
  state: string;
  facts?: StatusFact[];
}
export type StatusIndicator = "active" | "inactive" | "warning" | "error";
export interface LegacyStatusViewRow {
  label: string;
  value?: string;
  status?: { indicator: StatusIndicator; text: string };
  details?: string[];
}
export interface StatusViewRow extends LegacyStatusViewRow {
  kind?: "check" | "fact" | "activity";
  assessment?: Assessment;
  state?: string;
  facts?: StatusFact[];
}
export interface StatusViewSection {
  title: string;
  rows: StatusViewRow[];
}
export interface StatusView {
  title: string;
  summary?: { assessment: Assessment; label: string; detail?: string };
  issues?: StatusIssue[];
  sections: StatusViewSection[];
  footer?: StatusCheck | StatusFactRow;
}
export type StatusViewMode = "auto" | "interactive" | "text";
type ClackMessageOptions = {
  output: OutputStream;
  withGuide: boolean;
  spacing: number;
  symbol?: string;
  secondarySymbol?: string;
};
export interface StatusViewUi {
  intro(
    title: string,
    options: { output: OutputStream; withGuide: boolean },
  ): void;
  step(message: string, options: ClackMessageOptions): void;
  message(message: string, options: ClackMessageOptions): void;
}
const clackUi: StatusViewUi = {
  intro: (title, options) => clackIntro(title, options),
  step: (message, options) => clackLog.step(message, options),
  message: (message, options) => clackLog.message(message, options),
};
const CONTROL =
  /\u001b\[[0-?]*[ -/]*[@-~]|\u001b\](?:(?!\u0007|\u001b\\|\u009c)[\s\S])*(?:\u0007|\u001b\\|\u009c)|\u001b[PX^_][\s\S]*?\u001b\\|\u001b[ -/]*[0-~]|\u009b[0-?]*[ -/]*[@-~]|[\u0090\u0098\u009e\u009f][\s\S]*?(?:\u009c|\u001b\\)|\u009d(?:(?!\u0007|\u001b\\|\u009c)[\s\S])*(?:\u0007|\u001b\\|\u009c)|[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f]/g;
function cell(value: string): string {
  return value
    .replace(CONTROL, "")
    .replace(/[\r\n\t]+/g, " ")
    .trim();
}
function assessmentGlyph(assessment: Assessment): string {
  return { ok: "●", warning: "▲", critical: "■", unknown: "?" }[assessment];
}
function assessed(assessment: Assessment, interactive: boolean): string {
  const glyph = assessmentGlyph(assessment);
  return interactive
    ? styleText(
        { ok: "green", warning: "yellow", critical: "red", unknown: "gray" }[
          assessment
        ] as "green" | "yellow" | "red" | "gray",
        glyph,
      )
    : glyph;
}
function legacyIndicator(
  indicator: StatusIndicator,
  interactive: boolean,
): string {
  const glyph = indicator === "inactive" ? S_RADIO_INACTIVE : S_RADIO_ACTIVE;
  return interactive
    ? styleText(
        { active: "green", inactive: "gray", warning: "yellow", error: "red" }[
          indicator
        ] as "green" | "gray" | "yellow" | "red",
        glyph,
      )
    : glyph;
}
function factsText(facts: StatusFact[] = []): string[] {
  return facts
    .map((fact) =>
      [cell(fact.label ?? ""), cell(fact.value)].filter(Boolean).join(" "),
    )
    .filter(Boolean);
}
function wrap(value: string, columns: number): string[] {
  const width = Math.max(1, columns);
  const lines: string[] = [];
  let line = "";
  for (const word of cell(value).split(" ")) {
    if (line && stringWidth(`${line} ${word}`) > width) {
      lines.push(line);
      line = "";
    }
    // Keep long IDs/URLs intact in meaning while wrapping by display width.
    for (const char of word) {
      if (stringWidth(line + char) > width && line) {
        lines.push(line);
        line = "";
      }
      line += char;
    }
    line += " ";
  }
  if (line.trim()) lines.push(line.trimEnd());
  return lines.length ? lines.map((line) => line.trimEnd()) : [""];
}
function rowLines(
  row: StatusViewRow,
  width: number,
  columns: number,
  interactive: boolean,
): string[] {
  const rawLabel = cell(row.label);
  const label =
    rawLabel + " ".repeat(Math.max(0, width - stringWidth(rawLabel)));
  if (!row.kind) {
    const primary = row.status
      ? `${legacyIndicator(row.status.indicator, interactive)} ${cell(row.status.text)}`
      : cell(row.value ?? "");
    return [
      [label, primary, ...(row.details ?? []).map(cell).filter(Boolean)]
        .filter(Boolean)
        .join("   "),
    ];
  }
  const primary =
    row.kind === "check"
      ? `${assessmentGlyph(row.assessment ?? "unknown")} ${cell(row.state ?? "")}`
      : row.kind === "activity"
        ? `↻ ${cell(row.state ?? "")}`
        : cell(row.value ?? "");
  const facts = factsText("facts" in row ? row.facts : []);
  const base = [label, primary].filter(Boolean).join("   ");
  const inline = [base, facts.join(" · ")].filter(Boolean).join("   ");
  let lines =
    stringWidth(inline) <= columns
      ? [inline]
      : [
          ...wrap(base, columns),
          ...facts.flatMap((fact) =>
            wrap(fact, columns - 2).map((line) => `  ${line}`),
          ),
        ];
  if (interactive && row.kind === "check") {
    lines = lines.map((line) =>
      line.replace(
        assessmentGlyph(row.assessment ?? "unknown"),
        assessed(row.assessment ?? "unknown", true),
      ),
    );
  }
  return lines;
}
type Block = { kind: "step" | "message"; text: string; spacing: number };
function blocks(
  view: StatusView,
  columns: number,
  interactive: boolean,
): Block[] {
  const output: Block[] = [];
  const message = (value: string, spacing = 0) => {
    for (const line of wrap(value, columns))
      output.push({ kind: "message", text: line, spacing });
  };
  if (view.summary) {
    const s = view.summary;
    const lines = wrap(
      `${assessmentGlyph(s.assessment)} ${cell(s.label)}`,
      columns,
    );
    for (const line of lines)
      output.push({
        kind: "message",
        text: interactive
          ? line.replace(
              assessmentGlyph(s.assessment),
              assessed(s.assessment, true),
            )
          : line,
        spacing: 0,
      });
    if (s.detail) message(s.detail);
  }
  for (const issue of view.issues ?? []) {
    const title = `${assessmentGlyph(issue.severity)} ${cell(issue.title)}`;
    for (const line of wrap(title, columns))
      output.push({
        kind: "message",
        text: interactive
          ? line.replace(
              assessmentGlyph(issue.severity),
              assessed(issue.severity, true),
            )
          : line,
        spacing: 1,
      });
    if (issue.detail) message(issue.detail);
    const facts = factsText(issue.facts);
    if (stringWidth(facts.join(" · ")) <= columns) {
      if (facts.length) message(facts.join(" · "));
    } else for (const fact of facts) message(fact);
    if (issue.action) message(`Action: ${issue.action}`);
  }
  view.sections.forEach((section, i) => {
    const [heading, ...continuations] = wrap(section.title, columns);
    output.push({
      kind: "step",
      text: heading,
      spacing: i === 0 && !view.summary && !view.issues?.length ? 0 : 1,
    });
    for (const text of continuations)
      output.push({ kind: "message", text, spacing: 0 });
    const width = section.rows.reduce(
      (max, row) => Math.max(max, stringWidth(cell(row.label))),
      0,
    );
    for (const row of section.rows)
      for (const line of rowLines(row, width, columns, interactive))
        output.push({ kind: "message", text: line, spacing: 0 });
  });
  if (view.footer)
    for (const line of rowLines(view.footer, 0, columns, interactive))
      output.push({ kind: "message", text: line, spacing: 1 });
  return output;
}
export function renderStatusViewText(view: StatusView, columns = 100): string {
  const lines = wrap(view.title, columns);
  for (const block of blocks(view, columns, false)) {
    if (block.kind === "step" || block.spacing) lines.push("");
    lines.push(block.text);
  }
  return `${lines.join("\n")}\n`;
}
export function writeStatusView(
  runtime: Runtime,
  view: StatusView,
  mode: StatusViewMode = "auto",
  ui: StatusViewUi = clackUi,
): void {
  const stdoutIsTTY = runtime.stdout.isTTY === true;
  const interactive =
    mode === "interactive" ||
    (mode === "auto" && runtime.capabilities.interactive && stdoutIsTTY);
  if (
    mode === "interactive" &&
    (!runtime.capabilities.interactive || !stdoutIsTTY)
  )
    throw new Error("Interactive status output requires a TTY stdout");
  const columns =
    (runtime.stdout as OutputStream & { columns?: number }).columns ?? 100;
  if (!interactive) {
    runtime.stdout.write(renderStatusViewText(view, columns));
    return;
  }
  ui.intro(wrap(view.title, Math.max(1, columns - 4)).join("\n"), {
    output: runtime.stdout,
    withGuide: true,
  });
  const content = blocks(view, Math.max(1, columns - 4), true);
  if (!content.length || content.at(-1)?.kind === "step")
    content.push({ kind: "message", text: "", spacing: 0 });
  content.forEach((block, i) => {
    const options = {
      output: runtime.stdout,
      withGuide: true,
      spacing: block.spacing,
    };
    if (block.kind === "step") ui.step(block.text, options);
    else
      ui.message(block.text, {
        ...options,
        symbol: styleText("gray", i === content.length - 1 ? S_BAR_END : S_BAR),
        secondarySymbol: styleText("gray", S_BAR),
      });
  });
}
