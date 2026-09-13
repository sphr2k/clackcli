## Context

`charmcli` is the Go reference for explicit runtime capabilities, plan/apply
contracts, and non-interactive fallbacks. `clackcli` serves Bun/TypeScript
consumers. Clack is intentionally a prompt-oriented UI dependency, not a
Bubble Tea equivalent, so its surface cannot and need not be identical.

## Goals / Non-Goals

**Goals:**

- Reuse the architectural boundaries of `charmcli`: runtime, domain plan,
  confirmation, and presentation are separate.
- Make non-interactive output deterministic and useful in CI.
- Make Bun the sole required JavaScript runtime for the first release.

**Non-Goals:**

- Port CharmCLI's Cobra, Fang, Bubble Tea, Lip Gloss, or Kubernetes APIs.
- Build a workflow engine, deployment domain, or GitHub-only framework.
- Guarantee Node.js, Deno, browser, or package-manager compatibility.

## Decisions

### Explicit runtime and capabilities

Commands receive a runtime with input, stdout, stderr, and detected or
overridden capabilities. Interactive mode requires a usable input and stderr
terminal; CI is therefore a capability result rather than a scattered
`CI`-environment special case. This follows `charmcli.Runtime` while using Bun
stream/TTY APIs.

### Domain contracts emit data, renderers own presentation

Domains compute `Plan`, `Change`, `Risk`, and prepared state without importing
Clack. `apply` consumes prepared state only after a shared confirmation gate.
This adapts `charmcli/operation` and permits tests to assert data rather than
terminal sequences.

### Clack is one reporter, not the runtime

Interactive mode uses Clack for selection, confirmation, progress, and human
summaries. Text mode emits stable, line-oriented stderr progress. A structured
mode writes JSON result values to stdout. The first release does not promise a
generic GitHub renderer; callers can add one above text mode later.

### Streams and exit semantics are contracts

Requested results are written to stdout. Prompts, progress, warnings, and
diagnostics are written to stderr. Success is `0`; a rendered valid-negative
result is `1`; invalid invocation or execution failure is `2`; explicit user
cancellation is `130`, matching the reference project's intent.

## Risks / Trade-offs

- [Clack styling leaks into domain code] → Keep Clack imports inside the
  interactive reporter and confirmation adapter.
- [TTY detection differs across Bun hosts] → Allow capability injection in
  tests and explicit reporter selection by callers.
- [Framework scope grows before consumers exist] → Ship only the contracts and
  two reporters required by the first consumer.
