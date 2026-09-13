## ADDED Requirements

### Requirement: Domain-neutral plan
The library SHALL model an intended mutation as a plan containing a summary,
changes, and risks without importing Clack or any infrastructure domain.

#### Scenario: Plan-only command
- **WHEN** a domain produces a plan
- **THEN** it SHALL be renderable as human-readable text without preparing or
  applying a mutation, including the summary, changes, and risks.

### Requirement: Prepared apply state cleanup
The library SHALL pair a plan with domain-owned prepared state and SHALL invoke
its cleanup callback exactly once after every apply outcome, including empty
plans, declined or cancelled confirmation, successful or failed apply, and
confirmation errors. A cleanup error SHALL produce a failed outcome; when apply
also fails, the outcome SHALL retain both errors.

#### Scenario: Apply is declined
- **WHEN** a non-empty plan is not confirmed
- **THEN** prepared state SHALL be cleaned up exactly once and the domain apply
  operation SHALL not run.

### Requirement: Shared confirmation gate
The library SHALL skip confirmation for empty plans and SHALL require an
explicit confirmation or non-interactive bypass for non-empty plans.

#### Scenario: CI apply
- **WHEN** a non-empty plan runs in non-interactive mode with an explicit
  bypass
- **THEN** the apply operation SHALL proceed without invoking Clack prompts.
