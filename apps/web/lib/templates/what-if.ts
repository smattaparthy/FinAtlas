type FieldType = "number" | "date" | "percentage";

export interface TemplateField {
  key: string;
  label: string;
  type: FieldType;
  defaultValue?: number | string;
  placeholder?: string;
  help?: string;
  min?: number;
  max?: number;
  step?: number;
}

export interface Modification {
  type:
    | "ADD_EXPENSE"
    | "ADD_LOAN"
    | "ADD_INCOME"
    | "ADD_CONTRIBUTION"
    | "MODIFY_INCOME"
    | "MODIFY_LOAN";
  data: Record<string, unknown>;
}

export interface WhatIfTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  color: string;
  fields: TemplateField[];
  generateModifications: (inputs: Record<string, number | string>) => Modification[];
}

function calculateMortgagePayment(
  principal: number,
  annualRate: number,
  termYears: number
): number {
  const monthlyRate = annualRate / 12;
  const n = termYears * 12;
  if (monthlyRate === 0) return principal / n;
  return (principal * monthlyRate * Math.pow(1 + monthlyRate, n)) /
    (Math.pow(1 + monthlyRate, n) - 1);
}

export const whatIfTemplates: WhatIfTemplate[] = [
  {
    id: "buy-house",
    name: "Buy a House",
    description: "Model the financial impact of purchasing a home with a mortgage",
    category: "Housing",
    icon: "\u{1F3E0}",
    color: "#3b82f6",
    fields: [
      { key: "price", label: "Home Price", type: "number", defaultValue: 400000, placeholder: "400000", min: 50000 },
      { key: "downPayment", label: "Down Payment", type: "number", defaultValue: 80000, placeholder: "80000", min: 0 },
      { key: "interestRate", label: "Mortgage Rate", type: "percentage", defaultValue: 6.5, placeholder: "6.5", min: 0, max: 20, step: 0.125 },
      { key: "termYears", label: "Loan Term (years)", type: "number", defaultValue: 30, min: 10, max: 30 },
      { key: "annualPropertyTax", label: "Annual Property Tax", type: "number", defaultValue: 5000, placeholder: "5000", min: 0 },
      { key: "annualInsurance", label: "Annual Home Insurance", type: "number", defaultValue: 1800, placeholder: "1800", min: 0 },
    ],
    generateModifications(inputs) {
      const price = inputs.price as number;
      const downPayment = inputs.downPayment as number;
      const rate = (inputs.interestRate as number) / 100;
      const termYears = inputs.termYears as number;
      const loanAmount = price - downPayment;
      const monthlyPayment = calculateMortgagePayment(loanAmount, rate, termYears);
      const annualPropertyTax = inputs.annualPropertyTax as number;
      const annualInsurance = inputs.annualInsurance as number;

      const mods: Modification[] = [
        {
          type: "ADD_LOAN",
          data: {
            name: "Mortgage",
            type: "MORTGAGE",
            principal: loanAmount,
            currentBalance: loanAmount,
            interestRate: rate,
            monthlyPayment: Math.round(monthlyPayment * 100) / 100,
            termMonths: termYears * 12,
            propertyValue: price,
            annualPropertyTax,
            annualHomeInsurance: annualInsurance,
          },
        },
        {
          type: "ADD_EXPENSE",
          data: {
            name: "Property Tax",
            amount: Math.round((annualPropertyTax / 12) * 100) / 100,
            frequency: "MONTHLY",
            category: "Housing",
            growthRule: "INFLATION",
          },
        },
        {
          type: "ADD_EXPENSE",
          data: {
            name: "Home Insurance",
            amount: Math.round((annualInsurance / 12) * 100) / 100,
            frequency: "MONTHLY",
            category: "Housing",
            growthRule: "INFLATION",
          },
        },
      ];
      return mods;
    },
  },
  {
    id: "have-baby",
    name: "Have a Baby",
    description: "Estimate the costs of childcare and baby supplies",
    category: "Family",
    icon: "\u{1F476}",
    color: "#ec4899",
    fields: [
      { key: "monthlyChildcare", label: "Monthly Childcare", type: "number", defaultValue: 1500, placeholder: "1500", min: 0 },
      { key: "monthlySupplies", label: "Monthly Supplies", type: "number", defaultValue: 300, placeholder: "300", min: 0 },
    ],
    generateModifications(inputs) {
      return [
        {
          type: "ADD_EXPENSE",
          data: {
            name: "Childcare",
            amount: inputs.monthlyChildcare as number,
            frequency: "MONTHLY",
            category: "Family",
            growthRule: "INFLATION",
          },
        },
        {
          type: "ADD_EXPENSE",
          data: {
            name: "Baby Supplies",
            amount: inputs.monthlySupplies as number,
            frequency: "MONTHLY",
            category: "Family",
            growthRule: "INFLATION",
          },
        },
      ];
    },
  },
  {
    id: "retire-early",
    name: "Retire Early",
    description: "Model early retirement by ending income and adding Social Security later",
    category: "Retirement",
    icon: "\u{1F3D6}",
    color: "#f59e0b",
    fields: [
      { key: "retirementYear", label: "Retirement Year", type: "number", defaultValue: new Date().getFullYear() + 10, min: new Date().getFullYear() + 1 },
      { key: "socialSecurityAge", label: "SS Start Age", type: "number", defaultValue: 67, min: 62, max: 70 },
      { key: "monthlySS", label: "Monthly SS Benefit", type: "number", defaultValue: 2500, placeholder: "2500", min: 0 },
    ],
    generateModifications(inputs) {
      const retirementYear = inputs.retirementYear as number;
      const ssAge = inputs.socialSecurityAge as number;
      const monthlySS = inputs.monthlySS as number;

      // Estimate SS start date (assume current age ~35)
      const ssStartYear = retirementYear + (ssAge - 55); // rough estimate

      return [
        {
          type: "ADD_INCOME",
          data: {
            name: "Social Security",
            amount: monthlySS,
            frequency: "MONTHLY",
            startDate: new Date(ssStartYear, 0, 1).toISOString(),
            growthRule: "INFLATION",
            isTaxable: true,
          },
        },
      ];
    },
  },
  {
    id: "max-401k",
    name: "Max 401(k)",
    description: "Maximize your 401(k) contributions to the annual limit",
    category: "Retirement",
    icon: "\u{1F4B0}",
    color: "#10b981",
    fields: [
      { key: "annualContribution", label: "Annual Contribution", type: "number", defaultValue: 23500, placeholder: "23500", min: 0 },
    ],
    generateModifications(inputs) {
      const annual = inputs.annualContribution as number;
      return [
        {
          type: "ADD_EXPENSE",
          data: {
            name: "401(k) Contribution",
            amount: Math.round((annual / 12) * 100) / 100,
            frequency: "MONTHLY",
            category: "Retirement",
            growthRule: "NONE",
          },
        },
      ];
    },
  },
  {
    id: "career-change",
    name: "Career Change",
    description: "Model a new salary and optional education costs",
    category: "Career",
    icon: "\u{1F504}",
    color: "#8b5cf6",
    fields: [
      { key: "newSalary", label: "New Annual Salary", type: "number", defaultValue: 120000, placeholder: "120000", min: 0 },
      { key: "educationCost", label: "Education Cost (one-time)", type: "number", defaultValue: 0, placeholder: "0", min: 0 },
    ],
    generateModifications(inputs) {
      const mods: Modification[] = [
        {
          type: "ADD_INCOME",
          data: {
            name: "New Career Income",
            amount: inputs.newSalary as number,
            frequency: "ANNUAL",
            growthRule: "INFLATION_PLUS",
            growthRate: 0.02,
            isTaxable: true,
          },
        },
      ];

      const eduCost = inputs.educationCost as number;
      if (eduCost > 0) {
        mods.push({
          type: "ADD_EXPENSE",
          data: {
            name: "Education / Training",
            amount: eduCost,
            frequency: "ONE_TIME",
            category: "Education",
            growthRule: "NONE",
          },
        });
      }

      return mods;
    },
  },
  {
    id: "pay-off-debt",
    name: "Pay Off Debt Faster",
    description: "Add extra monthly payments toward debt payoff",
    category: "Debt",
    icon: "\u{1F4C9}",
    color: "#ef4444",
    fields: [
      { key: "extraMonthlyPayment", label: "Extra Monthly Payment", type: "number", defaultValue: 500, placeholder: "500", min: 0 },
    ],
    generateModifications(inputs) {
      return [
        {
          type: "ADD_EXPENSE",
          data: {
            name: "Extra Debt Payment",
            amount: inputs.extraMonthlyPayment as number,
            frequency: "MONTHLY",
            category: "Debt Payoff",
            growthRule: "NONE",
          },
        },
      ];
    },
  },
];
