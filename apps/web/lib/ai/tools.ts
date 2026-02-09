import type { Tool } from '@anthropic-ai/sdk/resources/messages';

/**
 * Financial assistant tools for Anthropic tool_use (function calling)
 */
export const financialTools: Tool[] = [
  {
    name: 'query_financial_summary',
    description: 'Get a summary of the user\'s current financial state including total income, expenses, assets, liabilities, and net worth. Use this before answering questions about overall financial health.',
    input_schema: {
      type: 'object' as const,
      properties: {},
      required: [],
    },
  },
  {
    name: 'query_accounts',
    description: 'Query investment and bank accounts with current balances, types, and growth rates. Optionally filter by account type.',
    input_schema: {
      type: 'object' as const,
      properties: {
        accountType: {
          type: 'string',
          description: 'Optional filter by account type: TRADITIONAL_401K, ROTH_401K, TRADITIONAL_IRA, ROTH_IRA, BROKERAGE, SAVINGS, HSA, 529',
        },
      },
      required: [],
    },
  },
  {
    name: 'query_incomes',
    description: 'Query all income sources with amounts, frequencies, and dates. Use this to answer questions about salary, bonuses, or other income.',
    input_schema: {
      type: 'object' as const,
      properties: {},
      required: [],
    },
  },
  {
    name: 'query_expenses',
    description: 'Query expenses with amounts, frequencies, and categories. Optionally filter by category.',
    input_schema: {
      type: 'object' as const,
      properties: {
        category: {
          type: 'string',
          description: 'Optional filter by expense category (e.g., Housing, Transportation, Food)',
        },
      },
      required: [],
    },
  },
  {
    name: 'query_loans',
    description: 'Query all loans with current balances, interest rates, monthly payments, and remaining terms. Use this to answer questions about mortgages, auto loans, student loans, etc.',
    input_schema: {
      type: 'object' as const,
      properties: {},
      required: [],
    },
  },
  {
    name: 'modify_scenario',
    description: 'Propose a modification to the financial scenario. The user will be asked to confirm before it is applied. Use this when the user asks "what if" questions or requests changes to their financial plan.',
    input_schema: {
      type: 'object' as const,
      properties: {
        type: {
          type: 'string',
          enum: [
            'INCOME_CHANGE',
            'INCOME_ADD',
            'INCOME_REMOVE',
            'EXPENSE_CHANGE',
            'EXPENSE_ADD',
            'EXPENSE_REMOVE',
            'ASSET_PURCHASE',
            'LOAN_ADD',
            'LOAN_PAYOFF',
            'INVESTMENT_CHANGE',
            'INVESTMENT_ADD',
            'INVESTMENT_REMOVE',
          ],
          description: 'Type of modification to apply',
        },
        description: {
          type: 'string',
          description: 'Human-readable description of the change (e.g., "Increase salary by $20,000/year starting January 2026")',
        },
        changes: {
          type: 'object',
          description: 'The specific changes to apply. Structure depends on modification type. For INCOME_CHANGE: {amountDelta: 20000, startDate: "2026-01-01"}. For EXPENSE_ADD: {name: "New expense", amount: 100, frequency: "MONTHLY"}.',
        },
        targetIncomeName: {
          type: 'string',
          description: 'For INCOME_CHANGE/INCOME_REMOVE: name of the income to target',
        },
        targetExpenseName: {
          type: 'string',
          description: 'For EXPENSE_CHANGE/EXPENSE_REMOVE: name of the expense to target',
        },
        targetLoanId: {
          type: 'string',
          description: 'For LOAN_PAYOFF: ID of the loan to pay off',
        },
      },
      required: ['type', 'description', 'changes'],
    },
  },
];
