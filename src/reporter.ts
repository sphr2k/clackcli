import { createInteractiveReporter, type Reporter } from "./interactive";
import { createTextReporter } from "./text";
import type { Runtime } from "./runtime";

export type ReporterMode = "auto" | "interactive" | "text";

export function createReporter(runtime: Runtime, mode: ReporterMode = "auto"): Reporter {
  const useInteractive = mode === "interactive" || (mode === "auto" && runtime.capabilities.interactive);
  return useInteractive ? createInteractiveReporter(runtime) : createTextReporter(runtime);
}
