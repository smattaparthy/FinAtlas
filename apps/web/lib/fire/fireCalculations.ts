export interface FireInputs {
  currentNetWorth: number;
  annualIncome: number;
  annualExpenses: number;
  annualSavings: number;
  retirementAnnualExpenses: number;
  expectedReturnRate: number; // decimal e.g. 0.07
  withdrawalRate: number; // decimal e.g. 0.04
  inflationRate: number; // decimal e.g. 0.025
}

export interface FireProjectionPoint {
  date: string; // YYYY-MM
  netWorth: number;
  fiNumber: number;
}

export interface FireResult {
  fiNumber: number;
  coastFireNumber: number;
  currentProgress: number; // 0-1
  savingsRate: number; // 0-1
  yearsToFI: number; // Infinity if not achievable
  fiDate: string; // ISO date or ""
  monthlyProjection: FireProjectionPoint[];
}

/**
 * Runs a month-by-month FIRE projection and returns key metrics.
 *
 * 1. fiNumber = retirementAnnualExpenses / withdrawalRate
 * 2. savingsRate = annualSavings / annualIncome (or 0)
 * 3. Simulate up to 720 months (60 years):
 *    - balance grows by monthly return + monthly savings
 *    - FI target grows with inflation each month
 *    - Record every 3rd month (quarterly) for chart data
 *    - Detect when balance >= inflation-adjusted FI target
 * 4. Derive yearsToFI, fiDate, coastFireNumber, currentProgress
 */
export function calculateFire(inputs: FireInputs): FireResult {
  const {
    currentNetWorth,
    annualIncome,
    annualExpenses,
    annualSavings,
    retirementAnnualExpenses,
    expectedReturnRate,
    withdrawalRate,
    inflationRate,
  } = inputs;

  // Core FI number (today's dollars)
  const fiNumber = withdrawalRate > 0 ? retirementAnnualExpenses / withdrawalRate : 0;

  // Savings rate
  const savingsRate = annualIncome > 0 ? annualSavings / annualIncome : 0;

  // Monthly rates
  const monthlyReturn = expectedReturnRate / 12;
  const monthlyInflation = inflationRate / 12;
  const monthlySavings = annualSavings / 12;

  // Simulation
  const maxMonths = 720; // 60 years
  let balance = currentNetWorth;
  let fiTarget = fiNumber;
  let fiReachedMonth = -1;

  const now = new Date();
  const projection: FireProjectionPoint[] = [];

  // Record starting point
  projection.push({
    date: formatYearMonth(now),
    netWorth: balance,
    fiNumber: fiTarget,
  });

  for (let month = 1; month <= maxMonths; month++) {
    // Grow balance by monthly investment return, then add savings
    balance = balance * (1 + monthlyReturn) + monthlySavings;

    // FI target grows with inflation
    fiTarget = fiTarget * (1 + monthlyInflation);

    // Record quarterly for chart smoothness
    if (month % 3 === 0) {
      const pointDate = new Date(now);
      pointDate.setMonth(pointDate.getMonth() + month);
      projection.push({
        date: formatYearMonth(pointDate),
        netWorth: balance,
        fiNumber: fiTarget,
      });
    }

    // Detect FI crossover
    if (fiReachedMonth < 0 && balance >= fiTarget) {
      fiReachedMonth = month;
    }

    // Once we've gone past FI and have enough chart data, we can stop
    // (continue at least 5 years past FI for visual context)
    if (fiReachedMonth > 0 && month >= fiReachedMonth + 60) {
      break;
    }
  }

  // Derive outputs
  const yearsToFI = fiReachedMonth > 0 ? fiReachedMonth / 12 : Infinity;

  let fiDate = "";
  if (fiReachedMonth > 0) {
    const fd = new Date(now);
    fd.setMonth(fd.getMonth() + fiReachedMonth);
    fiDate = fd.toISOString().slice(0, 10);
  }

  // Coast FIRE: the amount needed today such that, invested at the expected return,
  // it grows to the FI number in yearsToFI years without additional savings.
  let coastFireNumber = 0;
  if (yearsToFI !== Infinity && yearsToFI > 0) {
    coastFireNumber = fiNumber / Math.pow(1 + expectedReturnRate, yearsToFI);
  }

  const currentProgress = fiNumber > 0 ? Math.min(currentNetWorth / fiNumber, 1) : 0;

  return {
    fiNumber,
    coastFireNumber,
    currentProgress,
    savingsRate,
    yearsToFI,
    fiDate,
    monthlyProjection: projection,
  };
}

/** Format a Date as "YYYY-MM" */
function formatYearMonth(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}
