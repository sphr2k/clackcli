## Why

TypeScript CLIs repeatedly need the same runtime, plan/apply, confirmation, and
CI-output rules. `sphr2k/charmcli` already establishes these contracts for Go;
`clackcli` provides their Bun-native counterpart without pretending Clack is a
terminal UI framework equivalent to Charm.

## What Changes

- Establish Bun as the primary runtime, package manager, test runner, and
  execution target.
- Add an explicit runtime context for streams and terminal capabilities.
- Treat CI as non-interactive by default, even when terminal streams report a TTY.
- Define domain-neutral plan, prepared-state, apply-confirmation, and exit
  contracts.
- Add a plain-text plan renderer that shows summaries, changes, and risks before
  any mutation is prepared or applied.
- Guarantee prepared-state cleanup after every apply outcome.
- Define interactive Clack, deterministic text/CI, and structured-result
  output modes.
- Preserve stdout for requested results and use stderr for prompts, progress,
  and diagnostics.

## Capabilities

### New Capabilities

- `cli-runtime`: Bun-native runtime, stream ownership, capabilities, and exit semantics.
- `plan-apply`: Domain-neutral plan/prepared/apply lifecycle and confirmation.
- `cli-output`: Interactive Clack, text/CI, and structured result rendering.

### Modified Capabilities

- None.

## Impact

- New TypeScript/Bun package with Clack as the interactive presentation layer.
- References `sphr2k/charmcli` as an architectural analogue; it does not import
  Go code or Kubernetes dependencies.
