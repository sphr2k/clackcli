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


## Semantic status

Status checks separate assessment (`ok`, `warning`, `critical`, `unknown`) from
caller-defined lifecycle state. Facts are structured evidence; issues precede
normal sections, and activity describes ongoing work without assigning health.
The renderer formats these meanings and never evaluates domain thresholds.

```ts
writeStatusView(runtime, {
  title: "Example",
  summary: { assessment: "ok", label: "Healthy", detail: "No action required" },
  sections: [{ title: "Recovery", rows: [{
    kind: "check", label: "Compute", assessment: "ok", state: "stopped",
    facts: [{ label: "stage", value: "development" }],
  }] }],
  footer: { kind: "check", label: "Platform", assessment: "ok", state: "healthy" },
});
```

Optional `issues` use `kind: "issue"`, `severity`, `title`, `detail`, `action` and
`facts`. Sections accept `check`, `fact` and `activity` rows. Facts adapt to the
output stream's terminal width; text output defaults to 100 columns and remains
ANSI-free. Legacy `status.indicator` and `details` rows continue to work.

### Semantic values

CLIs supply domain meaning and raw values; the renderer owns units, dates,
symbols, alignment and wrapping. `StatusFact.value` and fact-row `value` accept
strings or tagged values:

```ts
const view: StatusView = {
  title: "Releases",
  sections: [{ title: "Production", rows: [
    { kind: "check", label: "Release", assessment: "ok", state: "stable" },
    { kind: "fact", label: "Stable since", value: {
      kind: "timestamp", value: "2026-10-29T01:17:01Z",
    } },
    { kind: "fact", label: "Commit", value: {
      kind: "link", url: "https://github.com/example/app/commit/abc",
    } },
  ] }],
};
```

Supported value kinds are `timestamp` (`value`: ISO string or Date),
`time-range` (`start`, `end`: ISO strings or Dates; optional `relative: true`
adds relative completion time with the absolute range in parentheses),
`relative-time` (`value`: ISO string or Date), `duration` (`seconds`: number),
`bytes` (`value`: number, binary units), and `link` (`url`: string). Timestamp
rows remain separate rows; nested facts retain responsive inline/wrapped
rendering. Links render as complete URLs in both text and interactive output.

Timestamps default to UK English (`en-GB`) and the process's local time zone.
They include seconds and the zone, and respect daylight saving time. Time ranges use minute precision and
collapse repeated date fields; ranges crossing midnight retain both dates.
Invalid dates and invalid or negative quantities display `unknown`. Relative times support both past and
future instants. Set `absolute: true` on a `relative-time` value to include the
absolute local timestamp in parentheses. The renderer captures one current
time per view.
`renderStatusViewText(view, columns, { locale, timeZone, now })` supports explicit
overrides for deterministic output. `writeStatusView` accepts the same options
after its optional UI adapter. Low-level helpers `formatLocalDateTime`,
`formatLocalTimeRange`, `formatDuration`, `formatBytes` and `formatStatusValue` are also exported.

Keep health thresholds, phase-to-assessment mappings, stage ordering and
repository-specific links in the caller. Authentication, GitHub package lookup
and domain aggregation do not belong in this presentation library. JSON output
continues to use `writeJsonResult` with caller-owned data; rendering never
replaces raw timestamps or numeric values in that data.
