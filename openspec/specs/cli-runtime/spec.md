## Purpose

Define the runtime capabilities and exit classifications exposed to CLI users.

## Requirements

### Requirement: Bun-native runtime
The library SHALL require Bun as its primary runtime and SHALL expose a runtime
object containing input, stdout, stderr, and terminal capabilities.

#### Scenario: Non-interactive invocation
- **WHEN** the provided input or stderr stream is not a terminal
- **THEN** the runtime SHALL report non-interactive capabilities.

#### Scenario: CI disables automatic interaction
- **WHEN** the CI environment is detected and no interactive capability
  override is provided
- **THEN** the runtime SHALL report `ci: true` and `interactive: false`, even
  when input and stderr are terminals.

### Requirement: Explicit exit classification
The library SHALL classify success as `0`, valid-negative rendered results as
`1`, invalid invocation or execution failures as `2`, and user cancellation as
`130`.

#### Scenario: User cancels a confirmation
- **WHEN** an interactive confirmation is cancelled
- **THEN** the caller SHALL receive exit classification `130` without an
  additional failure diagnostic.
