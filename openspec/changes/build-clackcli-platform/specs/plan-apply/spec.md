## ADDED Requirements

### Requirement: Domain-neutral plan
The library SHALL model an intended mutation as a plan containing a summary,
changes, and risks without importing Clack or any infrastructure domain.

#### Scenario: Plan-only command
- **WHEN** a domain produces a plan
- **THEN** it SHALL be renderable without preparing or applying a mutation.

### Requirement: Prepared apply state
The library SHALL pair a plan with domain-owned prepared state and SHALL
support deterministic cleanup of that state.

#### Scenario: Apply is declined
- **WHEN** a non-empty plan is not confirmed
- **THEN** prepared state SHALL be cleaned up and the domain apply operation
  SHALL not run.

### Requirement: Shared confirmation gate
The library SHALL skip confirmation for empty plans and SHALL require an
explicit confirmation or non-interactive bypass for non-empty plans.

#### Scenario: CI apply
- **WHEN** a non-empty plan runs in non-interactive mode with an explicit
  bypass
- **THEN** the apply operation SHALL proceed without invoking Clack prompts.
