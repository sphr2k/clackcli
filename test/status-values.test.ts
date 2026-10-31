import { expect, test } from "bun:test";
import { formatLocalDateTime, formatStatusValue } from "../src";
import { renderStatusViewText } from "../src/status-view";
import { formatLocalTimeRange } from "../src/datetime";

const options = {
  locale: "en-GB",
  timeZone: "Europe/Berlin",
  now: new Date("2026-10-29T01:20:00Z"),
};

test("renders a compact range with one date and relative completion time", () => {
  const output = formatStatusValue(
    {
      kind: "time-range",
      start: "2026-10-29T01:10:00Z",
      end: "2026-10-29T01:17:00Z",
      relative: true,
    },
    options,
  );
  expect(output).toMatch(/^3m ago \(29 Oct 2026, 02:10.*02:17 CET\)$/);
  expect(output.match(/29 Oct 2026/g)).toHaveLength(1);
  const crossing = formatLocalTimeRange(
    "2026-10-29T22:55:00Z",
    "2026-10-29T23:05:00Z",
    options,
  );
  expect(crossing).toContain("29 Oct 2026");
  expect(crossing).toContain("30 Oct 2026");
  expect(formatLocalTimeRange("invalid", "invalid", options)).toBe("unknown");
  expect(formatLocalTimeRange("2026-10-30", "2026-10-29", options)).toBe(
    "unknown",
  );
});

test("formats timestamps in local time with explicit zone and a deterministic override", () => {
  expect(formatLocalDateTime("2026-10-29T01:17:01.998Z", options)).toMatch(
    /29 Oct 2026.*02:17:01 CET/,
  );
  expect(formatLocalDateTime("2026-07-29T01:17:01Z", options)).toMatch(
    /29 Jul 2026.*03:17:01 CEST/,
  );
  expect(formatLocalDateTime("invalid", options)).toBe("unknown");
});

test("renders semantic values without caller punctuation or units", () => {
  expect(
    formatLocalDateTime("2026-10-29T01:17:00Z", { timeZone: "Europe/Berlin" }),
  ).toMatch(/29 Oct 2026.*02:17:00 CET/);
  expect(
    formatStatusValue(
      { kind: "relative-time", value: "2026-10-29T01:17:00Z", absolute: true },
      options,
    ),
  ).toMatch(/^3m ago \(29 Oct 2026.*02:17:00 CET\)$/);
  expect(formatStatusValue({ kind: "duration", seconds: 3661 }, options)).toBe(
    "1h 1m",
  );
  expect(formatStatusValue({ kind: "bytes", value: 1280 }, options)).toBe(
    "1.3 KiB",
  );
  expect(
    formatStatusValue(
      { kind: "relative-time", value: "2026-10-29T01:17:00Z" },
      options,
    ),
  ).toBe("3m ago");
  expect(
    formatStatusValue(
      { kind: "relative-time", value: "2026-10-29T01:23:00Z" },
      options,
    ),
  ).toBe("in 3m");
  expect(formatStatusValue({ kind: "duration", seconds: NaN }, options)).toBe(
    "unknown",
  );
  expect(formatStatusValue({ kind: "bytes", value: -1 }, options)).toBe(
    "unknown",
  );
});

test("supports semantic values in fact rows and nested check, activity and issue facts", () => {
  const timestamp = {
    kind: "timestamp" as const,
    value: "2026-10-29T01:17:01Z",
  };
  const output = renderStatusViewText(
    {
      title: "Release",
      issues: [
        {
          kind: "issue",
          severity: "warning",
          title: "Late",
          facts: [{ label: "since", value: timestamp }],
        },
      ],
      sections: [
        {
          title: "prd",
          rows: [
            { kind: "fact", label: "Stable since", value: timestamp },
            {
              kind: "fact",
              label: "Commit",
              value: { kind: "link", url: "https://example.com/commit/123" },
            },
            {
              kind: "check",
              label: "Backup",
              assessment: "ok",
              state: "current",
              facts: [{ label: "last", value: timestamp }],
            },
            {
              kind: "activity",
              label: "Release",
              state: "observing",
              facts: [{ label: "started", value: timestamp }],
            },
          ],
        },
      ],
    },
    120,
    options,
  );
  expect(output.match(/02:17:01 CET/g)).toHaveLength(4);
  expect(output).toContain("https://example.com/commit/123");
  expect(output).not.toContain("[object Object]");
  expect(output).not.toContain("\u001b");
});

test("sanitizes and wraps semantic links using the normal renderer path", () => {
  const output = renderStatusViewText(
    {
      title: "Link",
      sections: [
        {
          title: "Context",
          rows: [
            {
              kind: "fact",
              label: "Commit",
              value: {
                kind: "link",
                url: "https://example.com/\u001b[31mcommit/123\u001b[0m",
              },
            },
          ],
        },
      ],
    },
    30,
  );
  expect(output).not.toContain("\u001b");
  expect(output.replaceAll("\n", "")).toContain(
    "https://example.com/commit/123",
  );
  expect(output.split("\n").every((line) => line.length <= 30)).toBe(true);
});
