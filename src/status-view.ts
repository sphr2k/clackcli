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

export type StatusIndicator = "active" | "inactive" | "warning" | "error";

export interface StatusViewRow {
  label: string;
  value?: string;
  status?: {
    indicator: StatusIndicator;
    text: string;
  };
  details?: string[];
}

export interface StatusViewSection {
  title: string;
  rows: StatusViewRow[];
}

export interface StatusView {
  title: string;
  sections: StatusViewSection[];
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
  intro(title: string, options: { output: OutputStream; withGuide: boolean }): void;
  step(message: string, options: ClackMessageOptions): void;
  message(message: string, options: ClackMessageOptions): void;
}

const clackUi: StatusViewUi = {
  intro: (title, options) => clackIntro(title, options),
  step: (message, options) => clackLog.step(message, options),
  message: (message, options) => clackLog.message(message, options),
};

const CONTROL = /\u001b\[[0-?]*[ -/]*[@-~]|[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f]/g;

function cell(value: string): string {
  return value.replace(CONTROL, "").replace(/[\r\n\t]+/g, " ").trim();
}

function indicatorGlyph(indicator: StatusIndicator): string {
  return indicator === "inactive" ? S_RADIO_INACTIVE : S_RADIO_ACTIVE;
}

function styledIndicator(indicator: StatusIndicator): string {
  const glyph = indicatorGlyph(indicator);
  switch (indicator) {
    case "active":
      return styleText("green", glyph);
    case "inactive":
      return styleText("gray", glyph);
    case "warning":
      return styleText("yellow", glyph);
    case "error":
      return styleText("red", glyph);
  }
}

function labelWidth(rows: StatusViewRow[]): number {
  return rows.reduce(
    (width, row) => Math.max(width, stringWidth(cell(row.label))),
    0,
  );
}

function rowText(row: StatusViewRow, width: number, interactive: boolean): string {
  const rawLabel = cell(row.label);
  const label = rawLabel + " ".repeat(Math.max(0, width - stringWidth(rawLabel)));
  const primary = row.status
    ? `${interactive ? styledIndicator(row.status.indicator) : indicatorGlyph(row.status.indicator)} ${cell(row.status.text)}`
    : cell(row.value ?? "");
  const details = (row.details ?? []).map(cell).filter(Boolean);
  return [label, primary, ...details].filter(Boolean).join("   ");
}

export function renderStatusViewText(view: StatusView): string {
  const lines = [cell(view.title)];

  for (const section of view.sections) {
    lines.push("", cell(section.title));
    const width = labelWidth(section.rows);
    for (const row of section.rows) lines.push(rowText(row, width, false));
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
  ) {
    throw new Error("Interactive status output requires a TTY stdout");
  }

  if (!interactive) {
    runtime.stdout.write(renderStatusViewText(view));
    return;
  }

  ui.intro(cell(view.title), { output: runtime.stdout, withGuide: true });

  if (view.sections.length === 0) {
    ui.message("", {
      output: runtime.stdout,
      withGuide: true,
      spacing: 0,
      symbol: styleText("gray", S_BAR_END),
      secondarySymbol: styleText("gray", S_BAR),
    });
    return;
  }

  const lastSectionIndex = view.sections.length - 1;
  view.sections.forEach((section, sectionIndex) => {
    ui.step(cell(section.title), {
      output: runtime.stdout,
      withGuide: true,
      spacing: sectionIndex === 0 ? 0 : 1,
    });

    const width = labelWidth(section.rows);
    const lastRowIndex = section.rows.length - 1;
    if (section.rows.length === 0 && sectionIndex === lastSectionIndex) {
      ui.message("", {
        output: runtime.stdout,
        withGuide: true,
        spacing: 0,
        symbol: styleText("gray", S_BAR_END),
        secondarySymbol: styleText("gray", S_BAR),
      });
      return;
    }
    section.rows.forEach((row, rowIndex) => {
      const finalRow = sectionIndex === lastSectionIndex && rowIndex === lastRowIndex;
      ui.message(rowText(row, width, true), {
        output: runtime.stdout,
        withGuide: true,
        spacing: 0,
        symbol: finalRow ? styleText("gray", S_BAR_END) : styleText("gray", S_BAR),
        secondarySymbol: styleText("gray", S_BAR),
      });
    });
  });
}