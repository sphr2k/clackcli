import type { Runtime } from "./runtime";

export function writeJsonResult(value: unknown, runtime: Runtime): void {
  const json = JSON.stringify(value);
  if (json === undefined) throw new TypeError("Result is not a JSON value");
  runtime.stdout.write(`${json}\n`);
}
