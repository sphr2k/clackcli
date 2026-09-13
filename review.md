# OpenSpec vs. Implementierung

Change: `openspec/changes/build-clackcli-platform/`
Stand: 2026-09-13

Die Implementierung deckt die OpenSpec-Change weitgehend ab. Die Lücken sitzen in der ungenutzten CI-Capability, dem fehlenden Plan-Renderer und dem noch nicht archivierten Change.

## Urteil

Die drei Specs (`cli-runtime`, `plan-apply`, `cli-output`) sind im Kern umgesetzt. Tasks sind alle `[x]`, Clack bleibt in `src/interactive.ts`, Domäne (`plan.ts` / `apply.ts`) importiert kein Clack. `openspec/specs/` ist leer — der Change ist fertig, aber nicht archiviert.

## Spec vs. Code

| Requirement | Impl | Status |
|---|---|---|
| Runtime mit input/stdout/stderr + Capabilities | `createRuntime()` | ok |
| Non-interactive wenn Input oder stderr kein TTY | `input.isTTY && stderr.isTTY` | ok |
| Exit 0 / 1 / 2 / 130 | `EXIT_CODES` + `runPreparedApply` | ok |
| Cancel → 130, kein Failure-Diagnostic | `UserCancelledError` → `{ status: "cancelled" }` | ok |
| Domain-neutraler Plan ohne Clack | `Plan` / `Change` / `Risk` | ok |
| Plan ohne Prepare/Apply renderbar | nur als JSON-Daten | schwach |
| Cleanup bei Decline, Apply läuft nicht | `apply.test.ts` | ok |
| Empty plan skippt Confirm | `isEmptyPlan` | ok |
| Non-empty braucht Confirm oder Bypass | `ConfirmationRequiredError` | ok |
| CI-Bypass ohne Clack-Prompt | `bypassConfirmation` | ok |
| Clack nur bei interactive | `createReporter` + Guard | ok |
| Text: Start + Terminal-Zeile auf stderr, kein ANSI/Box | `[start]` / `[done]` / `[failed]` | ok |
| JSON nur auf stdout, Progress auf stderr | `writeJsonResult` | ok |

## Drift

### 1. `capabilities.ci` ist tot

Design: CI ist ein Capability-Ergebnis, kein verstreuter Env-Sonderfall. Die Impl liest `CI` aus der Env, niemand nutzt das Flag. Reporter und Apply schauen nur auf `interactive`.

Folge: `CI=true` plus TTY bleibt Clack (`runtime.test.ts` erlaubt genau das). Das Spec-Szenario „CI progress“ hängt an *non-interactive*, nicht an `ci`. Entweder Flag entfernen oder Auto-Mode daran koppeln.

### 2. Kein Plan-Renderer

Spec: Plan „SHALL be renderable without preparing or applying“. Design erwähnt Human Summaries. Es gibt nur `writeJsonResult(plan)`. Activity-Reporter zeigen Fortschritt, nicht Changes/Risks. Für v0.1 tragbar, Spec-Wortlaut nicht voll erfüllt.

### 3. Cleanup-Semantik ist strenger als die Spec

Spec verlangt Cleanup nur bei Decline. Impl räumt immer auf (noop, cancel, fail inklusive). Gut, aber in der Spec nicht festgehalten. Cleanup-Fehler überschreibt jedes Outcome auf `failed` / Exit 2.

### 4. OpenSpec-Prozess

Change liegt noch unter `openspec/changes/build-clackcli-platform/`, Main-Specs sind leer. Nach OpenSpec müsste der Change archiviert und die ADDED-Requirements nach `openspec/specs/` übernommen werden.

## Kein Blocker

- JSON ist ANSI-frei auf dem Wire (`JSON.stringify` escaped Controls); String-Werte dürfen Escapes enthalten.
- `createReporter(..., "text")` geht auch interaktiv — Spec verbietet das nicht.
- Example `ci` forciert Text + Bypass unabhängig von Capabilities; das ist Caller-Code, nicht Library.

## Kurz

Contracts und Tests passen. Einziger inhaltlicher Spec/Design-Bruch ist die ungenutzte `ci`-Capability (plus fehlender Plan-View). Rest ist Archivierung.
