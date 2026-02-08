type ImportType = "income" | "expense" | "account" | "loan";

const TEMPLATES: Record<ImportType, { headers: string[]; rows: string[][] }> = {
  income: {
    headers: ["name", "amount", "frequency", "startDate", "endDate", "taxable"],
    rows: [
      ["Salary", "5000", "MONTHLY", "2024-01-01", "", "true"],
      ["Freelance Work", "2000", "MONTHLY", "2024-03-01", "2025-12-31", "true"],
      ["Rental Income", "1500", "MONTHLY", "2024-01-01", "", "false"],
    ],
  },
  expense: {
    headers: ["name", "amount", "frequency", "category", "isDiscretionary", "startDate"],
    rows: [
      ["Rent", "2200", "MONTHLY", "Housing", "false", "2024-01-01"],
      ["Groceries", "600", "MONTHLY", "Food", "false", "2024-01-01"],
      ["Streaming Services", "45", "MONTHLY", "Entertainment", "true", "2024-01-01"],
    ],
  },
  account: {
    headers: ["name", "type", "balance"],
    rows: [
      ["401k", "TRADITIONAL_401K", "50000"],
      ["Roth IRA", "ROTH_IRA", "15000"],
      ["Brokerage", "BROKERAGE", "25000"],
    ],
  },
  loan: {
    headers: [
      "name",
      "currentBalance",
      "interestRate",
      "monthlyPayment",
      "termMonths",
      "startDate",
    ],
    rows: [
      ["Mortgage", "350000", "6.5", "2213", "360", "2023-06-01"],
      ["Auto Loan", "22000", "5.9", "420", "60", "2024-01-15"],
      ["Student Loan", "35000", "4.5", "350", "120", "2020-09-01"],
    ],
  },
};

export function generateTemplate(type: ImportType): string {
  const template = TEMPLATES[type];
  const lines = [
    template.headers.join(","),
    ...template.rows.map((row) => row.join(",")),
  ];
  return lines.join("\n");
}
