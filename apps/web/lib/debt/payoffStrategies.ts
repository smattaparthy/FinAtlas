export interface LoanForPayoff {
  id: string;
  name: string;
  type: string;
  currentBalance: number;
  interestRate: number;
  monthlyPayment: number;
}

export interface MonthlyPayoffState {
  month: number; // 0-indexed from start
  date: string; // YYYY-MM format
  totalBalance: number;
  loanBalances: Record<string, number>;
}

export interface PayoffResult {
  strategy: "avalanche" | "snowball";
  schedule: MonthlyPayoffState[];
  totalMonths: number;
  totalInterestPaid: number;
  totalPaid: number;
  payoffOrder: string[]; // loan IDs in payoff order
  perLoan: Record<string, { payoffMonth: number; totalInterest: number }>;
}

export interface PayoffComparison {
  avalanche: PayoffResult;
  snowball: PayoffResult;
  interestSavings: number; // how much avalanche saves vs snowball
  timeDifference: number; // months faster for avalanche
}

function computePayoff(
  loans: LoanForPayoff[],
  extraMonthly: number,
  strategy: "avalanche" | "snowball"
): PayoffResult {
  if (loans.length === 0) {
    return {
      strategy,
      schedule: [],
      totalMonths: 0,
      totalInterestPaid: 0,
      totalPaid: 0,
      payoffOrder: [],
      perLoan: {},
    };
  }

  // Sort loans based on strategy
  const sorted = [...loans].sort((a, b) => {
    if (strategy === "avalanche") {
      return b.interestRate - a.interestRate; // highest rate first
    }
    return a.currentBalance - b.currentBalance; // lowest balance first
  });

  // Initialize balances and tracking
  const balances: Record<string, number> = {};
  const interestPaid: Record<string, number> = {};
  const minimums: Record<string, number> = {};
  for (const loan of sorted) {
    balances[loan.id] = loan.currentBalance;
    interestPaid[loan.id] = 0;
    minimums[loan.id] = loan.monthlyPayment;
  }

  const schedule: MonthlyPayoffState[] = [];
  const payoffOrder: string[] = [];
  const perLoan: Record<string, { payoffMonth: number; totalInterest: number }> = {};
  let totalPaid = 0;
  let month = 0;
  const maxMonths = 600; // 50 year safety limit

  const now = new Date();
  const startYear = now.getFullYear();
  const startMonth = now.getMonth();

  // Record initial state
  schedule.push({
    month: 0,
    date: `${startYear}-${String(startMonth + 1).padStart(2, "0")}`,
    totalBalance: Object.values(balances).reduce((s, b) => s + b, 0),
    loanBalances: { ...balances },
  });

  while (month < maxMonths) {
    const activeLoans = sorted.filter((l) => balances[l.id] > 0.01);
    if (activeLoans.length === 0) break;

    month++;
    const date = new Date(startYear, startMonth + month);
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

    // 1. Charge interest on all active loans
    for (const loan of activeLoans) {
      const monthlyRate = loan.interestRate / 100 / 12;
      const interest = balances[loan.id] * monthlyRate;
      balances[loan.id] += interest;
      interestPaid[loan.id] += interest;
    }

    // 2. Apply minimum payments
    let extraAvailable = extraMonthly;
    for (const loan of activeLoans) {
      const payment = Math.min(minimums[loan.id], balances[loan.id]);
      balances[loan.id] -= payment;
      totalPaid += payment;

      // If loan was paid off with minimum, cascade its minimum to extra
      if (balances[loan.id] <= 0.01) {
        extraAvailable += minimums[loan.id] - payment; // remaining portion
        balances[loan.id] = 0;
      }
    }

    // 3. Apply extra payment to target loan (first in sorted order that's still active)
    for (const loan of sorted) {
      if (balances[loan.id] <= 0.01 || extraAvailable <= 0) continue;
      const payment = Math.min(extraAvailable, balances[loan.id]);
      balances[loan.id] -= payment;
      totalPaid += payment;
      extraAvailable -= payment;

      if (balances[loan.id] <= 0.01) {
        balances[loan.id] = 0;
        // Cascade: this loan's minimum becomes extra for the next
        extraAvailable += minimums[loan.id];
      }
    }

    // Record payoff events
    for (const loan of sorted) {
      if (balances[loan.id] <= 0.01 && !perLoan[loan.id]) {
        payoffOrder.push(loan.id);
        perLoan[loan.id] = {
          payoffMonth: month,
          totalInterest: Math.round(interestPaid[loan.id] * 100) / 100,
        };
      }
    }

    schedule.push({
      month,
      date: dateStr,
      totalBalance: Object.values(balances).reduce((s, b) => s + Math.max(b, 0), 0),
      loanBalances: { ...balances },
    });
  }

  // Handle loans not yet paid off
  for (const loan of sorted) {
    if (!perLoan[loan.id]) {
      perLoan[loan.id] = {
        payoffMonth: maxMonths,
        totalInterest: Math.round(interestPaid[loan.id] * 100) / 100,
      };
    }
  }

  const totalInterestPaid = Object.values(interestPaid).reduce((s, i) => s + i, 0);

  return {
    strategy,
    schedule,
    totalMonths: month,
    totalInterestPaid: Math.round(totalInterestPaid * 100) / 100,
    totalPaid: Math.round(totalPaid * 100) / 100,
    payoffOrder,
    perLoan,
  };
}

export function compareStrategies(
  loans: LoanForPayoff[],
  extraMonthly: number
): PayoffComparison {
  const avalanche = computePayoff(loans, extraMonthly, "avalanche");
  const snowball = computePayoff(loans, extraMonthly, "snowball");

  return {
    avalanche,
    snowball,
    interestSavings: Math.round((snowball.totalInterestPaid - avalanche.totalInterestPaid) * 100) / 100,
    timeDifference: snowball.totalMonths - avalanche.totalMonths,
  };
}
