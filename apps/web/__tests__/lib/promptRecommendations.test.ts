import { describe, it, expect } from "vitest";
import { generateRecommendations } from "../../lib/assistant/promptRecommendations";

describe("generateRecommendations", () => {
  it("should return general recommendations when no data", () => {
    const recs = generateRecommendations(null);
    expect(recs.length).toBeGreaterThanOrEqual(2);
    expect(recs[0].id).toBe("general-future");
  });

  it("should return max 6 recommendations", () => {
    const data = {
      incomes: [{ name: "Salary", amount: 100000, frequency: "ANNUAL" }],
      expenses: [{ name: "Rent", amount: 2000, frequency: "MONTHLY" }],
      loans: [{ name: "Car Loan", currentBalance: 20000 }],
      accounts: [{ name: "401k", balance: 50000 }],
    } as any;
    const recs = generateRecommendations(data);
    expect(recs.length).toBeLessThanOrEqual(6);
  });

  it("should include income recommendation for highest income", () => {
    const data = {
      incomes: [
        { name: "Salary", amount: 100000, frequency: "ANNUAL" },
        { name: "Side Gig", amount: 20000, frequency: "ANNUAL" },
      ],
      expenses: [],
      loans: [],
      accounts: [],
    } as any;
    const recs = generateRecommendations(data);
    const incomeRec = recs.find((r) => r.id === "income-increase");
    expect(incomeRec).toBeDefined();
    expect(incomeRec!.prompt).toContain("Salary");
  });
});
