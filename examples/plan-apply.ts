import {
  createInteractiveConfirmation,
  createReporter,
  createRuntime,
  renderPlan,
  runPreparedApply,
  writeJsonResult,
  type Plan,
  type Prepared,
} from "../src/index";

const plan: Plan = {
  summary: "Update the example service",
  changes: [{ description: "Set the service version", before: "1.2.0", after: "1.3.0" }],
  risks: [{ description: "The service restarts during the update", level: "low" }],
};

const runtime = createRuntime();
const command = process.argv[2] ?? "plan";

if (command === "plan") {
  runtime.stdout.write(renderPlan(plan));
} else if (command === "apply" || command === "ci") {
  const activity = command === "ci"
    ? createReporter(runtime, "text").start("Preparing service update")
    : undefined;
  const prepared: Prepared<{ version: string }> = {
    plan,
    state: { version: "1.3.0" },
    cleanup: () => {},
  };
  const outcome = await runPreparedApply({
    prepared,
    runtime,
    confirm: runtime.capabilities.interactive ? createInteractiveConfirmation(runtime) : undefined,
    bypassConfirmation: command === "ci",
    apply: async (state) => ({ updatedVersion: state.version }),
  });

  if (outcome.status === "applied") {
    activity?.complete("Service update applied");
    writeJsonResult(outcome.value, runtime);
  } else if (outcome.status === "noop") {
    activity?.complete("No changes to apply");
  } else if (outcome.status === "declined") {
    activity?.complete("Service update declined");
  } else if (outcome.status === "cancelled") {
    activity?.complete("Service update cancelled");
  } else {
    const message = outcome.error instanceof Error ? outcome.error.message : String(outcome.error);
    if (activity) activity.fail(message);
    else runtime.stderr.write(`[failed] ${message}\n`);
  }

  process.exitCode = outcome.exitCode;
} else {
  runtime.stderr.write("Usage: bun run examples/plan-apply.ts [plan|apply|ci]\n");
  process.exitCode = 2;
}
