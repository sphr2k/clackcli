# `charmcli` correspondence

[`sphr2k/charmcli`](https://github.com/sphr2k/charmcli) is the architectural reference for `clackcli`. Both libraries keep process streams and terminal capabilities explicit, standardize exit outcomes, separate operation data from presentation, and preserve stdout for requested results while prompts and progress use stderr.

| `charmcli` area | `clackcli` counterpart | Shared boundary |
| --- | --- | --- |
| `Runtime`, `Streams`, `Capabilities` | `Runtime`, `RuntimeCapabilities` | Callers can pass streams and override detected capabilities. |
| Exit helpers and cancellation handling | `EXIT_CODES`, `exitCodeFor`, `UserCancelledError` | Success, valid-negative, failure, and cancellation have stable codes. |
| `operation` plan/prepared/apply lifecycle | `Plan`, `Prepared`, `runPreparedApply` | Domain code supplies changes and prepared state; a shared gate controls apply and cleanup. |
| `ui.Activity` and `ui.RunSteps` | `Reporter`, `createReporter` | Interactive activity uses Clack; non-interactive activity writes deterministic lines to stderr. |
| `render` domain-neutral detail vocabulary | `StatusView`, `writeStatusView` | Domain code supplies status data and order; the shared library owns presentation grammar. |
| `output` result encoders | `writeJsonResult` | Requested JSON is written as one ANSI-free representation on stdout. |

These are architectural correspondences, not API or visual compatibility. `clackcli` uses Bun and TypeScript, and its core contracts do not import application-domain types.

## Intentional differences

- `clackcli` does not provide Cobra's command tree or Fang's help, error, version, completion, and man-page lifecycle. Applications keep their own command parser and call these library contracts.
- Clack remains the visual language. Static status output uses Clack's intro, step, guide, and radio-symbol vocabulary; `clackcli` does not reproduce charmcli's Lip Gloss resource headers, section rules, tables, palette, or responsive detail grids.
- `StatusView` deliberately stays small: grouped rows, aligned labels, optional state markers, and trailing detail values. It is not a general terminal layout framework.
- Clack is a prompt and spinner layer. It is not a Bubble Tea replacement, and `clackcli` does not reproduce Bubble Tea's live terminal programs.
- The package supports interactive/text status views and JSON result writing; it does not include YAML encoders, a generic command output selector, or a generic GitHub Actions renderer.
- `clackcli` is Bun-first. It has no Node.js, Deno, browser, or package-manager compatibility promise.
- Kubernetes helpers and the Go module boundaries in `charmcli` are outside this package. `clackcli` has no Kubernetes dependency or infrastructure-specific contracts.

See the [reference README](https://github.com/sphr2k/charmcli#readme) for the source project's current boundaries and the package [README](../README.md) for Bun usage.

