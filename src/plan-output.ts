import type { Plan } from "./plan";

function renderChange(description: string, before?: string, after?: string): string {
  if (before !== undefined && after !== undefined) {
    return `- ${description} (${before} → ${after})`;
  }
  if (before !== undefined) return `- ${description} (before: ${before})`;
  if (after !== undefined) return `- ${description} (after: ${after})`;
  return `- ${description}`;
}

export function renderPlan(plan: Plan): string {
  const changes = plan.changes.length > 0
    ? plan.changes.map(({ description, before, after }) => renderChange(description, before, after))
    : ["- None"];
  const risks = plan.risks.length > 0
    ? plan.risks.map(({ description, level }) => `- [${level}] ${description}`)
    : ["- None"];

  return [
    `Summary: ${plan.summary}`,
    "",
    "Changes:",
    ...changes,
    "",
    "Risks:",
    ...risks,
    "",
  ].join("\n");
}
