/**
 * Retirement income strategy calculations:
 * - Social Security benefit estimation by claim age
 * - Tax-efficient withdrawal ordering
 * - Year-by-year retirement income projection with RMDs
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SSBenefitEstimate {
  claimAge: number;
  monthlyBenefit: number;
  annualBenefit: number;
  cumulativeBy80: number;
  cumulativeBy85: number;
  cumulativeBy90: number;
}

export interface WithdrawalRecommendation {
  order: number;
  accountType: string;
  rationale: string;
}

export interface RetirementYearProjection {
  age: number;
  year: number;
  ssIncome: number;
  pensionIncome: number;
  accountWithdrawals: number;
  totalIncome: number;
  estimatedTaxes: number;
  netIncome: number;
}

export interface RetirementIncomeResult {
  ssBenefits: SSBenefitEstimate[];
  withdrawalOrder: WithdrawalRecommendation[];
  projection: RetirementYearProjection[];
  totalLifetimeIncome: number;
}

// ---------------------------------------------------------------------------
// Social Security
// ---------------------------------------------------------------------------

/**
 * Compute estimated Social Security benefits for claim ages 62, 67, and 70.
 *
 * Rules (for birth year >= 1960, FRA = 67):
 *  - Claiming early (before 67):
 *      First 36 months early: reduce by 5/9 of 1% per month (= ~6.67%/yr)
 *      Months beyond 36 early: reduce by 5/12 of 1% per month (= 5%/yr)
 *  - Claiming late (after 67):
 *      Delayed retirement credits: 8% per year (2/3 of 1% per month)
 *
 * @param monthlyBenefitAtFRA - The PIA (Primary Insurance Amount) at full retirement age
 * @param _birthYear - Birth year (unused for now; FRA is 67 for >= 1960)
 */
function calculateSSBenefits(
  monthlyBenefitAtFRA: number,
  _birthYear: number
): SSBenefitEstimate[] {
  const fra = 67;
  const claimAges = [62, 67, 70];

  return claimAges.map((claimAge) => {
    let adjustedMonthly: number;

    if (claimAge < fra) {
      const monthsEarly = (fra - claimAge) * 12;
      // First 36 months: 5/9 of 1% per month
      const first36 = Math.min(monthsEarly, 36);
      // Remaining months: 5/12 of 1% per month
      const beyond36 = Math.max(monthsEarly - 36, 0);
      const reductionFraction =
        first36 * (5 / 9 / 100) + beyond36 * (5 / 12 / 100);
      adjustedMonthly = monthlyBenefitAtFRA * (1 - reductionFraction);
    } else if (claimAge > fra) {
      const monthsLate = (claimAge - fra) * 12;
      const increaseFraction = monthsLate * (2 / 3 / 100);
      adjustedMonthly = monthlyBenefitAtFRA * (1 + increaseFraction);
    } else {
      adjustedMonthly = monthlyBenefitAtFRA;
    }

    const annualBenefit = adjustedMonthly * 12;

    // Cumulative benefits from claim age to target age (inclusive of first year)
    const cumulativeBy = (targetAge: number): number => {
      const years = Math.max(targetAge - claimAge, 0);
      return annualBenefit * years;
    };

    return {
      claimAge,
      monthlyBenefit: Math.round(adjustedMonthly),
      annualBenefit: Math.round(annualBenefit),
      cumulativeBy80: Math.round(cumulativeBy(80)),
      cumulativeBy85: Math.round(cumulativeBy(85)),
      cumulativeBy90: Math.round(cumulativeBy(90)),
    };
  });
}

// ---------------------------------------------------------------------------
// Withdrawal Order
// ---------------------------------------------------------------------------

/**
 * Return a tax-efficient withdrawal ordering for the given account types.
 * Standard conventional wisdom:
 *   1. Taxable / Brokerage -- taxed at favorable capital-gains rates
 *   2. Traditional 401k / IRA -- ordinary income tax
 *   3. Roth -- tax-free; let it grow the longest
 */
function planWithdrawalOrder(
  accountTypes: string[]
): WithdrawalRecommendation[] {
  const typeConfig: Record<string, { priority: number; rationale: string }> = {
    BROKERAGE: {
      priority: 1,
      rationale:
        "Taxable brokerage accounts are withdrawn first because long-term gains are taxed at favorable capital-gains rates, preserving tax-advantaged growth in other accounts.",
    },
    TAXABLE: {
      priority: 1,
      rationale:
        "Taxable accounts are withdrawn first to take advantage of lower capital-gains tax rates while tax-advantaged accounts continue to grow.",
    },
    "401K": {
      priority: 2,
      rationale:
        "Traditional 401(k) withdrawals are taxed as ordinary income. Drawn second to manage taxable income while Roth accounts grow tax-free.",
    },
    TRADITIONAL_IRA: {
      priority: 2,
      rationale:
        "Traditional IRA withdrawals are taxed as ordinary income. Drawn after taxable accounts to control your tax bracket each year.",
    },
    IRA: {
      priority: 2,
      rationale:
        "Traditional IRA withdrawals are taxed as ordinary income. Drawn after taxable accounts to control your tax bracket each year.",
    },
    ROTH_401K: {
      priority: 3,
      rationale:
        "Roth 401(k) withdrawals are tax-free. Drawn last to maximize years of tax-free compounding.",
    },
    ROTH_IRA: {
      priority: 3,
      rationale:
        "Roth IRA withdrawals are tax-free. Drawn last to maximize years of tax-free compounding and provide a tax-free legacy.",
    },
    ROTH: {
      priority: 3,
      rationale:
        "Roth accounts are withdrawn last because qualified distributions are completely tax-free, maximizing tax-free compounding.",
    },
  };

  // Deduplicate and sort
  const unique = [...new Set(accountTypes)];

  const recommendations: WithdrawalRecommendation[] = unique
    .map((type) => {
      const cfg = typeConfig[type.toUpperCase()] ?? {
        priority: 2,
        rationale:
          "Withdrawn in the standard order. Consult a tax advisor for account-specific guidance.",
      };
      return {
        order: cfg.priority,
        accountType: type,
        rationale: cfg.rationale,
      };
    })
    .sort((a, b) => a.order - b.order);

  // Re-number orders sequentially
  let orderNum = 1;
  let lastPriority = -1;
  for (const rec of recommendations) {
    if (rec.order !== lastPriority) {
      lastPriority = rec.order;
      rec.order = orderNum++;
    } else {
      rec.order = orderNum - 1; // same priority keeps the same order number
    }
  }

  return recommendations;
}

// ---------------------------------------------------------------------------
// Retirement Income Projection
// ---------------------------------------------------------------------------

interface AccountBalance {
  type: string;
  balance: number;
  returnRate: number; // decimal, e.g. 0.07
}

interface ProjectionInputs {
  currentAge: number;
  retirementAge: number;
  ssMonthlyBenefit: number;
  ssClaimAge: number;
  pensionAnnual: number;
  accountBalances: AccountBalance[];
  annualSpending: number;
}

/**
 * RMD life expectancy factors (simplified).
 * At age 73 the IRS Uniform Lifetime Table starts at ~26.5
 * and decreases roughly by 1 each year.
 */
function rmdFactor(age: number): number {
  if (age < 73) return Infinity; // no RMD required
  const base = 26.5 - (age - 73);
  return Math.max(base, 1);
}

function isTraditional(type: string): boolean {
  const upper = type.toUpperCase();
  return (
    upper === "401K" ||
    upper === "TRADITIONAL_IRA" ||
    upper === "IRA" ||
    upper.includes("TRADITIONAL")
  );
}

function isRoth(type: string): boolean {
  const upper = type.toUpperCase();
  return upper === "ROTH" || upper === "ROTH_IRA" || upper === "ROTH_401K";
}

/**
 * Year-by-year retirement income projection from retirement age through 95.
 */
function projectRetirementIncome(
  inputs: ProjectionInputs
): RetirementYearProjection[] {
  const {
    currentAge,
    retirementAge,
    ssMonthlyBenefit,
    ssClaimAge,
    pensionAnnual,
    accountBalances: initialBalances,
    annualSpending,
  } = inputs;

  const currentYear = new Date().getFullYear();
  const retirementYear = currentYear + (retirementAge - currentAge);
  const endAge = 95;

  // Pre-compute SS benefit at claim age using the same formula
  const ssBenefits = calculateSSBenefits(ssMonthlyBenefit, 1960);
  const ssBenefit = ssBenefits.find((b) => b.claimAge === ssClaimAge);
  const ssAnnual = ssBenefit ? ssBenefit.annualBenefit : ssMonthlyBenefit * 12;

  // Build mutable balances grouped by withdrawal priority
  // Priority: 1=taxable, 2=traditional, 3=roth
  const accounts = initialBalances.map((a) => ({
    ...a,
    currentBalance: a.balance,
    priority: isRoth(a.type) ? 3 : isTraditional(a.type) ? 2 : 1,
  }));

  // Grow accounts from current age to retirement
  const yearsToRetirement = retirementAge - currentAge;
  for (const acct of accounts) {
    acct.currentBalance *= Math.pow(1 + acct.returnRate, yearsToRetirement);
  }

  // Sort by withdrawal priority
  accounts.sort((a, b) => a.priority - b.priority);

  const projection: RetirementYearProjection[] = [];

  for (let age = retirementAge; age <= endAge; age++) {
    const year = retirementYear + (age - retirementAge);

    // Social Security income
    const ssIncome = age >= ssClaimAge ? ssAnnual : 0;

    // Pension income
    const pensionIncome = pensionAnnual;

    // RMDs from traditional accounts (age >= 73)
    let rmdTotal = 0;
    if (age >= 73) {
      const factor = rmdFactor(age);
      for (const acct of accounts) {
        if (isTraditional(acct.type) && acct.currentBalance > 0) {
          const rmd = acct.currentBalance / factor;
          rmdTotal += rmd;
        }
      }
    }

    // Determine gap between spending need and guaranteed income
    const guaranteedIncome = ssIncome + pensionIncome;
    const gap = Math.max(annualSpending - guaranteedIncome, 0);

    // Total withdrawal needed = max(gap, rmdTotal) -- RMDs are mandatory
    const totalWithdrawalNeeded = Math.max(gap, rmdTotal);

    // Withdraw from accounts in priority order
    let remainingWithdrawal = totalWithdrawalNeeded;
    let actualWithdrawals = 0;

    for (const acct of accounts) {
      if (remainingWithdrawal <= 0) break;
      if (acct.currentBalance <= 0) continue;

      const withdrawal = Math.min(remainingWithdrawal, acct.currentBalance);
      acct.currentBalance -= withdrawal;
      actualWithdrawals += withdrawal;
      remainingWithdrawal -= withdrawal;
    }

    const totalIncome = ssIncome + pensionIncome + actualWithdrawals;

    // Simplified tax estimation
    let estimatedTaxes = 0;
    // ~15% on traditional withdrawals
    const traditionalWithdrawals = Math.min(
      actualWithdrawals,
      accounts
        .filter((a) => isTraditional(a.type))
        .reduce((sum, a) => sum + Math.max(0, a.balance - a.currentBalance), 0)
    );
    // Simpler approach: estimate based on account composition
    const taxableFromTraditional =
      actualWithdrawals *
      (accounts.filter((a) => isTraditional(a.type)).reduce((s, a) => s + a.balance, 0) /
        Math.max(
          accounts.reduce((s, a) => s + a.balance, 0),
          1
        ));
    estimatedTaxes += taxableFromTraditional * 0.15;
    // ~15% on 50-85% of SS (simplified to 15% of SS)
    estimatedTaxes += ssIncome * 0.15;

    estimatedTaxes = Math.round(estimatedTaxes);

    const netIncome = totalIncome - estimatedTaxes;

    projection.push({
      age,
      year,
      ssIncome: Math.round(ssIncome),
      pensionIncome: Math.round(pensionIncome),
      accountWithdrawals: Math.round(actualWithdrawals),
      totalIncome: Math.round(totalIncome),
      estimatedTaxes,
      netIncome: Math.round(netIncome),
    });

    // Grow remaining balances for next year
    for (const acct of accounts) {
      if (acct.currentBalance > 0) {
        acct.currentBalance *= 1 + acct.returnRate;
      }
    }
  }

  return projection;
}

// ---------------------------------------------------------------------------
// Full calculation orchestrator
// ---------------------------------------------------------------------------

export function calculateRetirementIncome(inputs: {
  currentAge: number;
  retirementAge: number;
  ssMonthlyBenefit: number;
  ssClaimAge: number;
  birthYear: number;
  pensionAnnual: number;
  accountBalances: AccountBalance[];
  annualSpending: number;
}): RetirementIncomeResult {
  const ssBenefits = calculateSSBenefits(
    inputs.ssMonthlyBenefit,
    inputs.birthYear
  );

  const accountTypes = inputs.accountBalances.map((a) => a.type);
  const withdrawalOrder = planWithdrawalOrder(
    accountTypes.length > 0
      ? accountTypes
      : ["BROKERAGE", "401K", "ROTH_IRA"]
  );

  const projection = projectRetirementIncome({
    currentAge: inputs.currentAge,
    retirementAge: inputs.retirementAge,
    ssMonthlyBenefit: inputs.ssMonthlyBenefit,
    ssClaimAge: inputs.ssClaimAge,
    pensionAnnual: inputs.pensionAnnual,
    accountBalances: inputs.accountBalances,
    annualSpending: inputs.annualSpending,
  });

  const totalLifetimeIncome = projection.reduce(
    (sum, yr) => sum + yr.netIncome,
    0
  );

  return {
    ssBenefits,
    withdrawalOrder,
    projection,
    totalLifetimeIncome,
  };
}
