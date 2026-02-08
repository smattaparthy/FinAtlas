interface HoldingPerformance {
  symbol: string;
  name: string;
  shares: number;
  costBasis: number;
  estimatedValue: number;
  gainLoss: number;
  returnPct: number;
  hasCostBasis: boolean;
}

export interface AccountPerformance {
  id: string;
  name: string;
  type: string;
  balance: number;
  totalCostBasis: number;
  gainLoss: number;
  returnPct: number;
  holdings: HoldingPerformance[];
}

export interface PortfolioPerformance {
  accounts: AccountPerformance[];
  totalValue: number;
  totalCostBasis: number;
  totalGainLoss: number;
  totalReturnPct: number;
  bestPerformer: { name: string; returnPct: number } | null;
  worstPerformer: { name: string; returnPct: number } | null;
}

export function calculatePerformance(
  accounts: Array<{
    id: string;
    name: string;
    type: string;
    balance: number;
    holdings: Array<{
      symbol: string;
      name: string | null;
      shares: number;
      costBasis: number | null;
    }>;
  }>
): PortfolioPerformance {
  const accountPerformances: AccountPerformance[] = [];
  let portfolioTotalValue = 0;
  let portfolioTotalCostBasis = 0;

  for (const account of accounts) {
    const holdingPerformances: HoldingPerformance[] = [];
    let accountTotalCostBasis = 0;

    // Calculate total cost basis for holdings that have it
    for (const holding of account.holdings) {
      if (holding.costBasis !== null && holding.costBasis > 0) {
        accountTotalCostBasis += holding.costBasis * holding.shares;
      }
    }

    // Calculate performance for each holding
    for (const holding of account.holdings) {
      if (holding.costBasis !== null && holding.costBasis > 0 && accountTotalCostBasis > 0) {
        // Proportional allocation of account balance to this holding
        const holdingCostBasis = holding.costBasis * holding.shares;
        const estimatedValue = (holdingCostBasis / accountTotalCostBasis) * account.balance;
        const gainLoss = estimatedValue - holdingCostBasis;
        const returnPct = holdingCostBasis > 0 ? (gainLoss / holdingCostBasis) * 100 : 0;

        holdingPerformances.push({
          symbol: holding.symbol,
          name: holding.name || holding.symbol,
          shares: holding.shares,
          costBasis: holding.costBasis,
          estimatedValue,
          gainLoss,
          returnPct,
          hasCostBasis: true,
        });
      } else {
        // No cost basis data
        holdingPerformances.push({
          symbol: holding.symbol,
          name: holding.name || holding.symbol,
          shares: holding.shares,
          costBasis: 0,
          estimatedValue: 0,
          gainLoss: 0,
          returnPct: 0,
          hasCostBasis: false,
        });
      }
    }

    // Calculate account-level performance
    const accountGainLoss = accountTotalCostBasis > 0 ? account.balance - accountTotalCostBasis : 0;
    const accountReturnPct = accountTotalCostBasis > 0 ? (accountGainLoss / accountTotalCostBasis) * 100 : 0;

    accountPerformances.push({
      id: account.id,
      name: account.name,
      type: account.type,
      balance: account.balance,
      totalCostBasis: accountTotalCostBasis,
      gainLoss: accountGainLoss,
      returnPct: accountReturnPct,
      holdings: holdingPerformances,
    });

    // Add to portfolio totals (only accounts with cost basis)
    if (accountTotalCostBasis > 0) {
      portfolioTotalValue += account.balance;
      portfolioTotalCostBasis += accountTotalCostBasis;
    }
  }

  // Calculate portfolio totals
  const portfolioTotalGainLoss = portfolioTotalCostBasis > 0 ? portfolioTotalValue - portfolioTotalCostBasis : 0;
  const portfolioTotalReturnPct =
    portfolioTotalCostBasis > 0 ? (portfolioTotalGainLoss / portfolioTotalCostBasis) * 100 : 0;

  // Find best and worst performers (only among accounts with returnPct != 0)
  const accountsWithReturns = accountPerformances.filter((acc) => acc.returnPct !== 0);
  let bestPerformer: { name: string; returnPct: number } | null = null;
  let worstPerformer: { name: string; returnPct: number } | null = null;

  if (accountsWithReturns.length > 0) {
    const sorted = [...accountsWithReturns].sort((a, b) => b.returnPct - a.returnPct);
    bestPerformer = { name: sorted[0].name, returnPct: sorted[0].returnPct };
    worstPerformer = { name: sorted[sorted.length - 1].name, returnPct: sorted[sorted.length - 1].returnPct };
  }

  return {
    accounts: accountPerformances,
    totalValue: portfolioTotalValue,
    totalCostBasis: portfolioTotalCostBasis,
    totalGainLoss: portfolioTotalGainLoss,
    totalReturnPct: portfolioTotalReturnPct,
    bestPerformer,
    worstPerformer,
  };
}
