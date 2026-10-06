## Why
Lifecycle indicators mix activity and severity, while unstructured details lose evidence semantics.

## What Changes
Add assessment, check/fact/activity rows, structured evidence, summary, issues and footer to StatusView with compatibility for legacy rows. Render facts responsively; leave all domain assessment to callers.

## Capabilities
### New Capabilities
None.
### Modified Capabilities
- `cli-output`: semantic status presentation.

## Impact
Public additive TypeScript API, status renderer, renderer tests and README. No new runtime dependency.
