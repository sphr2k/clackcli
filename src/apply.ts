import { EXIT_CODES, isUserCancelled } from "./exit";
import type { Runtime } from "./runtime";
import { isEmptyPlan, type Plan, type Prepared } from "./plan";

export class ConfirmationRequiredError extends Error {
  constructor() {
    super("Applying a non-empty plan requires interactive confirmation or an explicit non-interactive bypass");
    this.name = "ConfirmationRequiredError";
  }
}

export type ApplyOutcome<Value> =
  | { status: "noop"; exitCode: 0 }
  | { status: "declined"; exitCode: 1 }
  | { status: "applied"; exitCode: 0; value: Value }
  | { status: "cancelled"; exitCode: 130 }
  | { status: "failed"; exitCode: 2; error: unknown };

export interface RunPreparedApplyOptions<State, Value> {
  prepared: Prepared<State>;
  runtime: Runtime;
  apply: (state: State, plan: Plan) => Value | Promise<Value>;
  confirm?: (plan: Plan) => boolean | Promise<boolean>;
  bypassConfirmation?: boolean;
}

export async function runPreparedApply<State, Value>(
  options: RunPreparedApplyOptions<State, Value>,
): Promise<ApplyOutcome<Value>> {
  const { prepared, runtime } = options;
  let outcome: ApplyOutcome<Value>;

  try {
    if (isEmptyPlan(prepared.plan)) {
      outcome = { status: "noop", exitCode: EXIT_CODES.success };
    } else {
      let confirmed = false;
      if (runtime.capabilities.interactive) {
        if (!options.confirm) throw new ConfirmationRequiredError();
        confirmed = await options.confirm(prepared.plan);
      } else if (options.bypassConfirmation) {
        confirmed = true;
      } else {
        throw new ConfirmationRequiredError();
      }

      outcome = confirmed
        ? {
            status: "applied",
            exitCode: EXIT_CODES.success,
            value: await options.apply(prepared.state, prepared.plan),
          }
        : { status: "declined", exitCode: EXIT_CODES.negative };
    }
  } catch (error) {
    outcome = isUserCancelled(error)
      ? { status: "cancelled", exitCode: EXIT_CODES.cancelled }
      : { status: "failed", exitCode: EXIT_CODES.failure, error };
  }

  try {
    await prepared.cleanup();
  } catch (cleanupError) {
    const error = outcome.status === "failed"
      ? new AggregateError([outcome.error, cleanupError], "Apply and cleanup both failed")
      : cleanupError;
    outcome = { status: "failed", exitCode: EXIT_CODES.failure, error };
  }

  return outcome;
}
