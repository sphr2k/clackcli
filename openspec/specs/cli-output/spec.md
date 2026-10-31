## Purpose

Define deterministic progress reporting and structured command results.

## Requirements

### Requirement: Interactive and text progress modes
The library SHALL render interactive progress through Clack only when runtime
capabilities are interactive and SHALL render deterministic line-oriented
progress otherwise.

#### Scenario: CI progress
- **WHEN** an activity runs with non-interactive capabilities
- **THEN** it SHALL write a start and terminal result line to stderr without
  ANSI control sequences or box formatting.

#### Scenario: Automatic reporter in CI
- **WHEN** a command creates the automatic reporter with CI detected
- **THEN** it SHALL use deterministic text progress even if the terminal streams
  report a TTY.

### Requirement: Structured requested results
The library SHALL support a structured JSON result mode that is ANSI-free and
writes only the requested result to stdout.

#### Scenario: Piped result
- **WHEN** a command selects JSON output
- **THEN** progress and diagnostics SHALL remain on stderr and stdout SHALL
  contain one JSON result representation.

### Requirement: Semantic status values
The library SHALL accept raw timestamp, time-range, relative-time, duration, byte-count and
link values in status fact rows and nested facts. Presentation SHALL remain in
the library; domain assessment and thresholds SHALL remain in callers.

#### Scenario: Local release timestamp
- **WHEN** a CLI supplies a timestamp fact row
- **THEN** the renderer SHALL format it in UK English by default and the local time zone,
  including seconds and the time zone, on its own row.
- **AND** explicit locale and time-zone overrides SHALL support deterministic rendering.

#### Scenario: Shared value presentation
- **WHEN** a semantic quantity or link is supplied in checks, activities or issues
- **THEN** the same formatting, sanitization and width rules SHALL apply as in fact rows.
- **AND** invalid timestamps or quantities SHALL display `unknown`.
- **AND** each rendered view SHALL use one reference time for relative values.
