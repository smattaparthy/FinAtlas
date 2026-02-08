import { describe, it, expect } from "vitest";
import { whatIfTemplates } from "../../lib/templates/what-if";

describe("whatIfTemplates", () => {
  it("should have all expected templates", () => {
    expect(whatIfTemplates).toHaveLength(6);
    const ids = whatIfTemplates.map((t) => t.id);
    expect(ids).toContain("buy-house");
    expect(ids).toContain("have-baby");
    expect(ids).toContain("retire-early");
    expect(ids).toContain("max-401k");
    expect(ids).toContain("career-change");
    expect(ids).toContain("pay-off-debt");
  });

  it("buy-house should generate mortgage + expenses", () => {
    const template = whatIfTemplates.find((t) => t.id === "buy-house")!;
    const mods = template.generateModifications({
      price: 400000,
      downPayment: 80000,
      interestRate: 6.5,
      termYears: 30,
      annualPropertyTax: 5000,
      annualInsurance: 1800,
    });
    expect(mods).toHaveLength(3); // mortgage + property tax + insurance
    expect(mods[0].type).toBe("ADD_LOAN");
    expect(mods[0].data.principal).toBe(320000);
    expect(mods[1].type).toBe("ADD_EXPENSE");
    expect(mods[2].type).toBe("ADD_EXPENSE");
  });

  it("max-401k should generate expense modification", () => {
    const template = whatIfTemplates.find((t) => t.id === "max-401k")!;
    const mods = template.generateModifications({ annualContribution: 23500 });
    expect(mods).toHaveLength(1);
    expect(mods[0].type).toBe("ADD_EXPENSE");
    const monthly = Math.round((23500 / 12) * 100) / 100;
    expect(mods[0].data.amount).toBe(monthly);
  });
});
