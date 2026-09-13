## ADDED Requirements

### Requirement: Interactive and text progress modes
The library SHALL render interactive progress through Clack only when runtime
capabilities are interactive and SHALL render deterministic line-oriented
progress otherwise.

#### Scenario: CI progress
- **WHEN** an activity runs with non-interactive capabilities
- **THEN** it SHALL write a start and terminal result line to stderr without
  ANSI control sequences or box formatting.

### Requirement: Structured requested results
The library SHALL support a structured JSON result mode that is ANSI-free and
writes only the requested result to stdout.

#### Scenario: Piped result
- **WHEN** a command selects JSON output
- **THEN** progress and diagnostics SHALL remain on stderr and stdout SHALL
  contain one JSON result representation.
