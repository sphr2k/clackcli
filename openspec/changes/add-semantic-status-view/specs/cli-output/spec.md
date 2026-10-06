## ADDED Requirements

### Requirement: Semantic status presentation
StatusView SHALL support caller-assigned assessment, independent domain state, structured facts, issues, activity, summary and footer. It SHALL preserve legacy status rows. The renderer SHALL NOT infer assessment from lifecycle values or thresholds.

#### Scenario: Expected stopped state
- **WHEN** a check has assessment ok and state stopped
- **THEN** it renders as ok, independently from legacy inactive presentation

### Requirement: Responsive evidence and deterministic output
Facts SHALL render inline where width permits and wrap without content loss at narrow widths. Noninteractive output SHALL be ANSI-free and deterministic. All presentation SHALL use injected streams and sanitize terminal controls. Interactive output SHALL close its guide after final content.

#### Scenario: Narrow terminal with issues
- **WHEN** summary, issues, facts and footer exceed the available width
- **THEN** their content wraps and issues precede sections, with exactly one closing guide
