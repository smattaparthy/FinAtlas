import { prisma } from '@/lib/db/prisma';

/**
 * Execute a tool call from Anthropic tool_use
 */
export async function handleToolCall(
  toolName: string,
  toolInput: Record<string, unknown>,
  scenarioId: string,
  userId: string
): Promise<string> {
  try {
    switch (toolName) {
      case 'query_financial_summary':
        return await queryFinancialSummary(scenarioId);

      case 'query_accounts':
        return await queryAccounts(scenarioId, toolInput.accountType as string | undefined);

      case 'query_incomes':
        return await queryIncomes(scenarioId);

      case 'query_expenses':
        return await queryExpenses(scenarioId, toolInput.category as string | undefined);

      case 'query_loans':
        return await queryLoans(scenarioId);

      case 'modify_scenario':
        return JSON.stringify({
          modification: toolInput,
          message: 'Modification ready for user confirmation',
        });

      default:
        return JSON.stringify({ error: `Unknown tool: ${toolName}` });
    }
  } catch (error) {
    console.error(`Tool handler error (${toolName}):`, error);
    return JSON.stringify({
      error: error instanceof Error ? error.message : 'Tool execution failed',
    });
  }
}

/**
 * Query financial summary: total income, expenses, assets, liabilities, net worth
 */
async function queryFinancialSummary(scenarioId: string): Promise<string> {
  const [incomes, expenses, accounts, loans] = await Promise.all([
    prisma.income.findMany({
      where: { scenarioId },
      select: { amount: true, frequency: true },
    }),
    prisma.expense.findMany({
      where: { scenarioId },
      select: { amount: true, frequency: true },
    }),
    prisma.account.findMany({
      where: { scenarioId },
      select: { balance: true },
    }),
    prisma.loan.findMany({
      where: { scenarioId },
      select: { currentBalance: true },
    }),
  ]);

  // Convert all income and expenses to annual amounts
  const annualizeAmount = (amount: number, frequency: string): number => {
    switch (frequency) {
      case 'ANNUAL': return amount;
      case 'MONTHLY': return amount * 12;
      case 'BIWEEKLY': return amount * 26;
      case 'WEEKLY': return amount * 52;
      case 'ONE_TIME': return 0; // Exclude one-time from annual calculation
      default: return amount;
    }
  };

  const totalAnnualIncome = incomes.reduce(
    (sum, inc) => sum + annualizeAmount(inc.amount, inc.frequency),
    0
  );

  const totalAnnualExpenses = expenses.reduce(
    (sum, exp) => sum + annualizeAmount(exp.amount, exp.frequency),
    0
  );

  const totalAssets = accounts.reduce((sum, acc) => sum + acc.balance, 0);
  const totalLiabilities = loans.reduce((sum, loan) => sum + loan.currentBalance, 0);
  const netWorth = totalAssets - totalLiabilities;

  const annualSavings = totalAnnualIncome - totalAnnualExpenses;
  const savingsRate = totalAnnualIncome > 0 ? (annualSavings / totalAnnualIncome) * 100 : 0;

  return JSON.stringify({
    totalAnnualIncome,
    totalAnnualExpenses,
    annualSavings,
    savingsRate: parseFloat(savingsRate.toFixed(1)),
    totalAssets,
    totalLiabilities,
    netWorth,
    incomeCount: incomes.length,
    expenseCount: expenses.length,
    accountCount: accounts.length,
    loanCount: loans.length,
  }, null, 2);
}

/**
 * Query accounts with optional type filter
 */
async function queryAccounts(scenarioId: string, accountType?: string): Promise<string> {
  const accounts = await prisma.account.findMany({
    where: {
      scenarioId,
      ...(accountType ? { type: accountType } : {}),
    },
    select: {
      id: true,
      name: true,
      type: true,
      balance: true,
      growthRule: true,
      growthRate: true,
      member: {
        select: {
          name: true,
        },
      },
      contributions: {
        select: {
          amount: true,
          frequency: true,
          startDate: true,
          endDate: true,
          employerMatch: true,
        },
      },
    },
    orderBy: { balance: 'desc' },
  });

  return JSON.stringify(
    accounts.map((acc) => ({
      id: acc.id,
      name: acc.name,
      type: acc.type,
      balance: acc.balance,
      growthRule: acc.growthRule,
      growthRate: acc.growthRate,
      owner: acc.member?.name,
      contributions: acc.contributions,
    })),
    null,
    2
  );
}

/**
 * Query all incomes
 */
async function queryIncomes(scenarioId: string): Promise<string> {
  const incomes = await prisma.income.findMany({
    where: { scenarioId },
    select: {
      id: true,
      name: true,
      amount: true,
      frequency: true,
      startDate: true,
      endDate: true,
      growthRule: true,
      growthRate: true,
      isTaxable: true,
      member: {
        select: {
          name: true,
        },
      },
    },
    orderBy: { amount: 'desc' },
  });

  return JSON.stringify(
    incomes.map((inc) => ({
      id: inc.id,
      name: inc.name,
      amount: inc.amount,
      frequency: inc.frequency,
      startDate: inc.startDate,
      endDate: inc.endDate,
      growthRule: inc.growthRule,
      growthRate: inc.growthRate,
      isTaxable: inc.isTaxable,
      owner: inc.member?.name,
    })),
    null,
    2
  );
}

/**
 * Query expenses with optional category filter
 */
async function queryExpenses(scenarioId: string, category?: string): Promise<string> {
  const expenses = await prisma.expense.findMany({
    where: {
      scenarioId,
      ...(category ? { category } : {}),
    },
    select: {
      id: true,
      name: true,
      amount: true,
      frequency: true,
      startDate: true,
      endDate: true,
      category: true,
      isDiscretionary: true,
      growthRule: true,
      growthRate: true,
    },
    orderBy: { amount: 'desc' },
  });

  return JSON.stringify(expenses, null, 2);
}

/**
 * Query all loans
 */
async function queryLoans(scenarioId: string): Promise<string> {
  const loans = await prisma.loan.findMany({
    where: { scenarioId },
    select: {
      id: true,
      name: true,
      type: true,
      principal: true,
      currentBalance: true,
      interestRate: true,
      monthlyPayment: true,
      startDate: true,
      termMonths: true,
      member: {
        select: {
          name: true,
        },
      },
    },
    orderBy: { currentBalance: 'desc' },
  });

  return JSON.stringify(
    loans.map((loan) => {
      const monthsElapsed = Math.floor(
        (Date.now() - new Date(loan.startDate).getTime()) / (1000 * 60 * 60 * 24 * 30)
      );
      const monthsRemaining = Math.max(0, loan.termMonths - monthsElapsed);

      return {
        id: loan.id,
        name: loan.name,
        type: loan.type,
        principal: loan.principal,
        currentBalance: loan.currentBalance,
        interestRate: loan.interestRate,
        monthlyPayment: loan.monthlyPayment,
        startDate: loan.startDate,
        termMonths: loan.termMonths,
        monthsRemaining,
        owner: loan.member?.name,
      };
    }),
    null,
    2
  );
}
