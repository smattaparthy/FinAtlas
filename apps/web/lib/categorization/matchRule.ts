import type { CategorizationRule } from "./defaultRules";

export function matchExpense(name: string, rule: CategorizationRule): boolean {
  const lowerName = name.toLowerCase();
  const lowerPattern = rule.pattern.toLowerCase();

  switch (rule.matchType) {
    case "contains":
      return lowerName.includes(lowerPattern);
    case "startsWith":
      return lowerName.startsWith(lowerPattern);
    case "exact":
      return lowerName === lowerPattern;
    default:
      return false;
  }
}

export function categorizeExpense(
  name: string,
  rules: CategorizationRule[]
): string | null {
  for (const rule of rules) {
    if (matchExpense(name, rule)) {
      return rule.category;
    }
  }
  return null;
}
