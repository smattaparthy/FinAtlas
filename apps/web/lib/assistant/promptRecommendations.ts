import type { ScenarioData } from "@/lib/modifications/apply";

interface PromptRecommendation {
  id: string;
  category: "general" | "income" | "expense" | "loan" | "investment" | "life-event";
  icon: string;
  prompt: string;
}

export function generateRecommendations(
  data: ScenarioData | null
): PromptRecommendation[] {
  const recommendations: PromptRecommendation[] = [];

  // Always include a general suggestion
  recommendations.push({
    id: "general-future",
    category: "general",
    icon: "\uD83C\uDFAF",
    prompt: "What does my financial future look like?",
  });

  if (data) {
    // Income recommendation: find the highest-amount income by name
    if (Array.isArray(data.incomes) && data.incomes.length > 0) {
      const validIncomes = data.incomes.filter(
        (i) =>
          i &&
          typeof i.name === "string" &&
          i.name.trim() !== "" &&
          typeof i.amount === "number" &&
          i.amount > 0
      );
      if (validIncomes.length > 0) {
        const highest = validIncomes.reduce((max, curr) =>
          curr.amount > max.amount ? curr : max
        );
        recommendations.push({
          id: "income-increase",
          category: "income",
          icon: "\uD83D\uDCB0",
          prompt: `What if my ${highest.name} increases by 15%?`,
        });
      }
    }

    // Expense recommendation
    if (Array.isArray(data.expenses) && data.expenses.length > 0) {
      recommendations.push({
        id: "expense-cut",
        category: "expense",
        icon: "\u2702\uFE0F",
        prompt: "What if I cut my expenses by $500/month?",
      });
    }

    // Loan recommendation: find first loan with a name
    if (Array.isArray(data.loans) && data.loans.length > 0) {
      const namedLoan = data.loans.find(
        (l) => l && typeof l.name === "string" && l.name.trim() !== ""
      );
      if (namedLoan) {
        recommendations.push({
          id: "loan-payoff",
          category: "loan",
          icon: "\uD83C\uDFE6",
          prompt: `What if I pay off my ${namedLoan.name} early?`,
        });
      }
    }

    // Investment recommendation
    if (Array.isArray(data.accounts) && data.accounts.length > 0) {
      recommendations.push({
        id: "investment-increase",
        category: "investment",
        icon: "\uD83D\uDCC8",
        prompt: "What if I increase my investment contributions by $200/month?",
      });
    }
  }

  // Always include a life-event suggestion
  recommendations.push({
    id: "life-event-house",
    category: "life-event",
    icon: "\uD83C\uDFE0",
    prompt: "What if I buy a $400,000 house?",
  });

  // Return max 6 recommendations
  return recommendations.slice(0, 6);
}
