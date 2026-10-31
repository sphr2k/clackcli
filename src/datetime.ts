export interface DateTimeFormatOptions {
  locale?: string;
  timeZone?: string;
}

export function formatLocalTimeRange(
  start: string | Date,
  end: string | Date,
  options: DateTimeFormatOptions = {},
): string {
  const from = new Date(start);
  const to = new Date(end);
  if (
    !Number.isFinite(from.getTime()) ||
    !Number.isFinite(to.getTime()) ||
    from > to
  )
    return "unknown";
  return new Intl.DateTimeFormat(options.locale ?? "en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short",
    timeZone: options.timeZone,
  }).formatRange(from, to);
}

export function formatLocalDateTime(
  value: string | Date,
  options: DateTimeFormatOptions = {},
): string {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "unknown";
  return new Intl.DateTimeFormat(options.locale ?? "en-GB", {
    dateStyle: "medium",
    timeStyle: "long",
    timeZone: options.timeZone,
  }).format(date);
}
