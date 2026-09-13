import {
  confirm as clackConfirm,
  isCancel as clackIsCancel,
  spinner as clackSpinner,
} from "@clack/prompts";
import { UserCancelledError } from "./exit";
import type { Plan } from "./plan";
import type { InputStream, OutputStream, Runtime } from "./runtime";

export interface SpinnerHandle {
  start(message: string): void;
  message(message: string): void;
  stop(message: string): void;
  error(message: string): void;
}

export interface InteractiveUi {
  confirm(options: { message: string; input: InputStream; output: OutputStream }): Promise<boolean | symbol>;
  isCancel(value: unknown): boolean;
  spinner(options: { output: OutputStream }): SpinnerHandle;
}

export interface Activity {
  message(message: string): void;
  complete(message: string): void;
  fail(message: string): void;
}

export interface Reporter {
  start(message: string): Activity;
}

const clackUi: InteractiveUi = {
  confirm: (options) => clackConfirm(options),
  isCancel: (value) => clackIsCancel(value),
  spinner: (options) => clackSpinner(options),
};

function requireInteractive(runtime: Runtime): void {
  if (!runtime.capabilities.interactive) {
    throw new Error("Clack adapters require interactive capabilities");
  }
}

export function createInteractiveReporter(runtime: Runtime, ui: InteractiveUi = clackUi): Reporter {
  requireInteractive(runtime);
  return {
    start(message) {
      const spinner = ui.spinner({ output: runtime.stderr });
      spinner.start(message);
      return {
        message: (next) => spinner.message(next),
        complete: (result) => spinner.stop(result),
        fail: (error) => spinner.error(error),
      };
    },
  };
}

export function createInteractiveConfirmation(
  runtime: Runtime,
  ui: InteractiveUi = clackUi,
): (plan: Plan) => Promise<boolean> {
  requireInteractive(runtime);
  return async (plan) => {
    const answer = await ui.confirm({
      message: `Apply ${plan.changes.length} change${plan.changes.length === 1 ? "" : "s"}? ${plan.summary}`,
      input: runtime.input,
      output: runtime.stderr,
    });
    if (ui.isCancel(answer)) throw new UserCancelledError();
    if (typeof answer !== "boolean") throw new Error("Clack confirmation returned an unexpected value");
    return answer;
  };
}
