export type RiskLevel = "low" | "medium" | "high";

export interface Change {
  description: string;
  before?: string;
  after?: string;
}

export interface Risk {
  description: string;
  level: RiskLevel;
}

export interface Plan {
  summary: string;
  changes: readonly Change[];
  risks: readonly Risk[];
}

export interface Prepared<State> {
  plan: Plan;
  state: State;
  cleanup: () => void | Promise<void>;
}

export function isEmptyPlan(plan: Plan): boolean {
  return plan.changes.length === 0;
}
