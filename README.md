# clackcli

Bun-native building blocks for TypeScript command-line applications. `clackcli` keeps runtime streams, operation data, confirmation, and output presentation in separate contracts.

## Requirements

- Bun 1.0 or newer
- Clack prompts are used for interactive confirmation, activity spinners, and interactive status presentation

Install dependencies and run the contract tests:

```sh
bun install
bun test
bun run typecheck
```

## Core contracts

- `createRuntime()` owns stdin, stdout, stderr, and the detected `interactive` and `ci` capabilities. Tests and non-standard hosts can inject streams and capabilities.
- `Plan` contains a summary, domain-neutral changes, and risks. `Prepared<State>` pairs it with caller-owned state and cleanup.
- `runPreparedApply()` skips empty plans, requires interactive confirmation or an explicit non-interactive bypass, and always cleans prepared state.
- `createReporter()` chooses Clack activity for interactive runtimes and deterministic line-oriented stderr output otherwise. Pass `"text"` to force plain text output.
- `StatusView` is a domain-neutral grouped status model. `writeStatusView()` renders it with Clack's intro/step/guide language on an interactive terminal and deterministic ANSI-free text otherwise. Domain CLIs own section names, row values, ordering, and status meaning.
- `writeJsonResult()` writes exactly one JSON value to stdout. Keep progress and diagnostics on stderr.
- Exit codes are `0` for success, `1` for a valid negative result, `2` for invocation or execution failure, and `130` for user cancellation.

## Example

`examples/plan-apply.ts` shows a plan-only command, interactive apply, and text-mode apply with an explicit non-interactive bypass:

```sh
bun run examples/plan-apply.ts plan
bun run examples/plan-apply.ts apply
bun run examples/plan-apply.ts ci </dev/null
```

Plan and applied result JSON go to stdout. The last command simulates a non-interactive CI invocation by redirecting stdin; progress remains on stderr.

See [the `charmcli` correspondence](docs/charmcli-correspondence.md) for the reference mapping and intentional differences.

## Private package

The package is published to GitHub Packages as `@sphr2k/clackcli`. To install it, configure the scope in the consumer's `.npmrc`:

```ini
@sphr2k:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${NODE_AUTH_TOKEN}
always-auth=true
```

Local installs need a classic GitHub token with `read:packages` and access to the package. Commits pushed to `main` are checked with `bun run typecheck` and `bun test`. Conventional Commits with `fix:`, `perf:`, or a revert publish patch releases; `feat:` publishes a minor release; breaking changes publish a major release. Ordinary `docs:` and `chore:` commits do not publish.

