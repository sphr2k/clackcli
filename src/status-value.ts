import {
  formatLocalDateTime,
  formatLocalTimeRange,
  type DateTimeFormatOptions,
} from "./datetime";

export type StatusValue =
  | string
  | { kind: "timestamp"; value: string | Date }
  | {
      kind: "time-range";
      start: string | Date;
      end: string | Date;
      relative?: boolean;
    }
  | { kind: "relative-time"; value: string | Date; absolute?: boolean }
  | { kind: "duration"; seconds: number }
  | { kind: "bytes"; value: number }
  | { kind: "link"; url: string };

export interface StatusValueFormatOptions extends DateTimeFormatOptions {
  now?: Date;
}

export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "unknown";
  const total = Math.round(seconds);
  if (total < 60) return `${total}s`;
  if (total < 3600)
    return `${Math.floor(total / 60)}m${total % 60 ? ` ${total % 60}s` : ""}`;
  if (total < 86400)
    return `${Math.floor(total / 3600)}h${Math.floor((total % 3600) / 60) ? ` ${Math.floor((total % 3600) / 60)}m` : ""}`;
  return `${Math.floor(total / 86400)}d`;
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "unknown";
  if (bytes < 1024) return `${Math.round(bytes)} B`;
  const units = ["KiB", "MiB", "GiB", "TiB", "PiB"];
  let scaled = bytes / 1024;
  let unit = 0;
  while (scaled >= 1024 && unit < units.length - 1) {
    scaled /= 1024;
    unit++;
  }
  return `${scaled.toFixed(1)} ${units[unit]}`;
}

export function formatStatusValue(
  value: StatusValue,
  options: StatusValueFormatOptions = {},
): string {
  if (typeof value === "string") return value;
  switch (value.kind) {
    case "timestamp":
      return formatLocalDateTime(value.value, options);
    case "time-range": {
      const range = formatLocalTimeRange(value.start, value.end, options);
      if (range === "unknown" || !value.relative) return range;
      return `${formatStatusValue({ kind: "relative-time", value: value.end }, options)} (${range})`;
    }
    case "relative-time": {
      const seconds =
        ((options.now ?? new Date()).getTime() -
          new Date(value.value).getTime()) /
        1000;
      if (!Number.isFinite(seconds)) return "unknown";
      const relative =
        seconds < 0
          ? `in ${formatDuration(-seconds)}`
          : `${formatDuration(seconds)} ago`;
      return value.absolute
        ? `${relative} (${formatLocalDateTime(value.value, options)})`
        : relative;
    }
    case "duration":
      return formatDuration(value.seconds);
    case "bytes":
      return formatBytes(value.value);
    case "link":
      return value.url;
  }
}
