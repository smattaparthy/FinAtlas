# AI Financial Chat - Design Document

**Date:** 2025-01-10
**Status:** Ready for Implementation
**Author:** Design collaboration session

---

## 1. Overview

### Purpose
Add a conversational AI assistant to FinAtlas that enables users to explore financial what-if scenarios through natural language. Users can ask questions like "What happens if Alex's salary increases by 20k starting 2025?" and see projected impacts on their financial plan.

### Goals
- Enable intuitive exploration of financial scenarios without manual data entry
- Provide side-by-side comparison of baseline vs. modified projections
- Support cumulative modifications (building scenarios through conversation)
- Allow users to save valuable scenarios they discover through exploration

### Non-Goals (v1)
- Tax optimization recommendations
- Investment portfolio advice
- Integration with external financial accounts
- Multi-user collaborative scenarios

---

## 2. User Stories

### Primary User Stories

**US-1: Simple What-If Question**
> As a user, I want to ask "What if my salary increases by 20k?" and see how my net worth projection changes over 10 years.

**US-2: Complex Purchase Scenario**
> As a user, I want to ask "What if we buy a house for $1M with 20% down payment?" and see the impact including new mortgage payments, reduced savings, and long-term wealth building through equity.

**US-3: Cumulative Exploration**
> As a user, I want to ask follow-up questions that build on previous modifications, like "What if we also have a baby and add $2k/month in childcare expenses?"

**US-4: Save Discovered Scenario**
> As a user, when I find a what-if scenario I like, I want to save it as a named scenario (e.g., "Optimistic 2026 Plan") so I can compare it with my baseline later.

**US-5: Reset and Start Fresh**
> As a user, I want to reset the conversation and start fresh from the baseline at any time.

### Secondary User Stories

**US-6: Clarification Flow**
> As a user, if my question is ambiguous, I want the AI to show me what it understood and let me confirm or correct before applying changes.

**US-7: View Modification History**
> As a user, I want to see what modifications have been applied in the current conversation session.

**US-8: Undo Last Modification**
> As a user, I want to undo the last modification without resetting the entire conversation.

---

## 3. Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend (Next.js)                        │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────────────┐  │
│  │  Chat UI    │  │ Comparison   │  │  Modification          │  │
│  │  Component  │  │ Charts       │  │  History Panel         │  │
│  └─────────────┘  └──────────────┘  └────────────────────────┘  │
│                            │                                     │
│  ┌─────────────────────────┴─────────────────────────────────┐  │
│  │              Chat Context Provider (React Context)         │  │
│  │  - conversation history                                    │  │
│  │  - accumulated modifications                               │  │
│  │  - modified scenario data (in-memory)                      │  │
│  │  - projection results                                      │  │
│  └─────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                        Backend (API Routes)                      │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │ /api/ai/chat    │  │ /api/ai/save    │  │ /api/scenarios  │  │
│  │ Parse & respond │  │ Save scenario   │  │ CRUD operations │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  │
│            │                                                     │
│            ▼                                                     │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │                   Claude AI (Anthropic API)                 │  │
│  │  - Parse natural language into structured modifications     │  │
│  │  - Generate explanations of financial impacts               │  │
│  │  - Answer follow-up questions about projections             │  │
│  └─────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Calculation Engine                           │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │  @finatlas/engine                                           │  │
│  │  - Apply modifications to scenario data                     │  │
│  │  - Calculate 10-year projections                            │  │
│  │  - Return ProjectionSeries (netWorth, assets, liabilities)  │  │
│  └─────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### Key Design Decisions

1. **In-Memory Calculations**: Modified scenario data stays in React state until explicitly saved. No temporary database records.

2. **Stateful Conversations**: Each modification builds on previous ones within a session. The context provider tracks all accumulated changes.

3. **Structured Parsing**: Claude parses natural language into typed modification objects, which are then applied deterministically by the engine.

4. **Confirmation Flow**: Before applying any modification, the user sees what Claude understood and must confirm.

---

## 4. Data Models

### Modification Types

```typescript
// Base modification interface
interface BaseModification {
  id: string;
  type: ModificationType;
  description: string;        // Human-readable summary
  appliedAt: string;          // ISO timestamp
}

type ModificationType =
  | 'INCOME_CHANGE'
  | 'INCOME_ADD'
  | 'INCOME_REMOVE'
  | 'EXPENSE_CHANGE'
  | 'EXPENSE_ADD'
  | 'EXPENSE_REMOVE'
  | 'INVESTMENT_CHANGE'
  | 'INVESTMENT_ADD'
  | 'INVESTMENT_REMOVE'
  | 'LOAN_ADD'
  | 'LOAN_PAYOFF'
  | 'ACCOUNT_CHANGE'
  | 'ASSET_PURCHASE';

// Specific modification types
interface IncomeModification extends BaseModification {
  type: 'INCOME_CHANGE' | 'INCOME_ADD' | 'INCOME_REMOVE';
  targetIncomeId?: string;    // For CHANGE/REMOVE
  targetIncomeName?: string;  // For matching by name
  changes: {
    amount?: number;          // New amount or delta
    amountDelta?: number;     // Change in amount (+/-)
    frequency?: Frequency;
    startDate?: string;       // ISO date
    endDate?: string;         // ISO date
  };
}

interface ExpenseModification extends BaseModification {
  type: 'EXPENSE_CHANGE' | 'EXPENSE_ADD' | 'EXPENSE_REMOVE';
  targetExpenseId?: string;
  targetExpenseName?: string;
  changes: {
    amount?: number;
    amountDelta?: number;
    frequency?: Frequency;
    category?: string;
    startDate?: string;
    endDate?: string;
  };
}

interface AssetPurchaseModification extends BaseModification {
  type: 'ASSET_PURCHASE';
  assetType: 'HOUSE' | 'CAR' | 'OTHER';
  purchasePrice: number;
  downPayment: number;
  downPaymentPercent?: number;
  loan?: {
    amount: number;
    interestRate: number;
    termYears: number;
    startDate: string;
  };
  relatedExpenses?: {
    name: string;
    amount: number;
    frequency: Frequency;
  }[];
}

interface LoanModification extends BaseModification {
  type: 'LOAN_ADD' | 'LOAN_PAYOFF';
  targetLoanId?: string;
  loan?: {
    name: string;
    principal: number;
    interestRate: number;
    termYears: number;
    startDate: string;
  };
}

interface InvestmentModification extends BaseModification {
  type: 'INVESTMENT_CHANGE' | 'INVESTMENT_ADD' | 'INVESTMENT_REMOVE';
  targetInvestmentId?: string;
  targetInvestmentName?: string;
  changes: {
    contributionAmount?: number;
    contributionDelta?: number;
    frequency?: Frequency;
    expectedReturn?: number;
  };
}

type Modification =
  | IncomeModification
  | ExpenseModification
  | AssetPurchaseModification
  | LoanModification
  | InvestmentModification;
```

### Chat State

```typescript
interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  modification?: Modification;           // If this message resulted in a modification
  pendingModification?: Modification;    // Awaiting user confirmation
  projectionComparison?: ProjectionComparison;
}

interface ProjectionComparison {
  baseline: ProjectionSeries;
  modified: ProjectionSeries;
  summary: {
    netWorthDelta: number;
    netWorthDeltaPercent: number;
    finalNetWorth: number;
    keyInsights: string[];
  };
}

interface ChatState {
  messages: ChatMessage[];
  modifications: Modification[];         // All confirmed modifications
  baselineData: ScenarioData;            // Original scenario data
  modifiedData: ScenarioData;            // Current modified state
  baselineProjection: ProjectionSeries;
  modifiedProjection: ProjectionSeries | null;
  isLoading: boolean;
  error: string | null;
}

interface ScenarioData {
  incomes: Income[];
  expenses: Expense[];
  accounts: Account[];
  investments: Investment[];
  loans: Loan[];
  goals: Goal[];
}
```

---

## 5. API Design

### POST /api/ai/chat

Main endpoint for processing user messages.

**Request:**
```typescript
interface ChatRequest {
  message: string;                    // User's natural language input
  scenarioId: string;                 // Current baseline scenario
  conversationHistory: ChatMessage[]; // For context
  currentModifications: Modification[]; // Already applied modifications
  action?: 'confirm' | 'reject' | 'undo'; // For confirmation flow
  pendingModificationId?: string;     // When confirming/rejecting
}
```

**Response:**
```typescript
interface ChatResponse {
  message: string;                    // AI response text
  pendingModification?: Modification; // If AI parsed a modification, awaiting confirmation
  confirmedModification?: Modification; // If user confirmed
  projectionComparison?: ProjectionComparison; // Updated projections
  suggestedFollowUps?: string[];      // Suggested next questions
  error?: string;
}
```

### POST /api/ai/save-scenario

Save current modifications as a new scenario.

**Request:**
```typescript
interface SaveScenarioRequest {
  scenarioId: string;           // Source baseline scenario
  modifications: Modification[];
  name: string;                 // User-provided name
  description?: string;
}
```

**Response:**
```typescript
interface SaveScenarioResponse {
  newScenarioId: string;
  name: string;
  success: boolean;
}
```

### GET /api/scenarios/:id/data

Fetch complete scenario data for in-memory manipulation.

**Response:**
```typescript
interface ScenarioDataResponse {
  scenario: {
    id: string;
    name: string;
    isBaseline: boolean;
  };
  incomes: Income[];
  expenses: Expense[];
  accounts: Account[];
  investments: Investment[];
  loans: Loan[];
  goals: Goal[];
}
```

---

## 6. AI Prompt Engineering

### System Prompt for Claude

```
You are a financial planning assistant for FinAtlas. Your role is to help users explore what-if scenarios for their financial future.

CAPABILITIES:
- Parse natural language requests into structured financial modifications
- Explain how changes impact long-term financial projections
- Answer questions about the user's financial data and projections

AVAILABLE MODIFICATION TYPES:
1. INCOME_CHANGE: Modify existing income (amount, frequency, dates)
2. INCOME_ADD: Add new income source
3. INCOME_REMOVE: Remove income source
4. EXPENSE_CHANGE: Modify existing expense
5. EXPENSE_ADD: Add new expense
6. EXPENSE_REMOVE: Remove expense
7. ASSET_PURCHASE: Buy house, car, etc. (creates loan + potentially new expenses)
8. LOAN_ADD: Add new loan
9. LOAN_PAYOFF: Pay off existing loan early
10. INVESTMENT_CHANGE: Modify investment contributions
11. INVESTMENT_ADD: Add new investment account
12. INVESTMENT_REMOVE: Remove investment

CURRENT USER DATA:
{scenarioDataJson}

ACCUMULATED MODIFICATIONS IN THIS SESSION:
{modificationsJson}

RESPONSE FORMAT:
When the user asks a what-if question, respond with:
1. A JSON block containing the parsed modification (```json ... ```)
2. A human-readable summary of what you understood
3. Ask for confirmation before applying

When explaining results, be specific about:
- The dollar impact on net worth at year 10
- Key milestones affected (e.g., retirement readiness)
- Trade-offs to consider

CONSTRAINTS:
- Never invent data not provided in the scenario
- If a request is ambiguous, ask clarifying questions
- Always show what you understood before applying changes
- Be conservative in assumptions (use reasonable defaults)
```

### Example Interaction

**User:** "What if Alex's salary goes up by 20k starting next year?"

**Claude Response:**
```json
{
  "type": "INCOME_CHANGE",
  "targetIncomeName": "Alex Salary",
  "changes": {
    "amountDelta": 20000,
    "startDate": "2026-01-01"
  },
  "description": "Increase Alex Salary by $20,000/year starting January 2026"
}
```

I understood you want to:
- **Increase "Alex Salary"** by **$20,000/year**
- **Starting:** January 2026
- **Duration:** Ongoing (no end date)

This would add approximately $15,000/year to savings after taxes.

**Is this correct?** Reply "yes" to apply, or clarify if I misunderstood.

---

## 7. UI Components

### New Route: /app/(app)/assistant/page.tsx

```
┌────────────────────────────────────────────────────────────────────┐
│  FinAtlas        [Dashboard] [Income] [Expenses] ... [Assistant]   │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  ┌─────────────────────────────────┬──────────────────────────────┐│
│  │         Chat Panel              │     Projection Comparison    ││
│  │                                 │                              ││
│  │  ┌───────────────────────────┐  │   Net Worth Projection       ││
│  │  │ AI: How can I help you    │  │   ┌──────────────────────┐   ││
│  │  │ explore your finances?    │  │   │  📈 Chart showing    │   ││
│  │  └───────────────────────────┘  │   │  baseline (gray) vs  │   ││
│  │                                 │   │  modified (green)    │   ││
│  │  ┌───────────────────────────┐  │   └──────────────────────┘   ││
│  │  │ You: What if my salary    │  │                              ││
│  │  │ increases by 20k?         │  │   Summary                    ││
│  │  └───────────────────────────┘  │   ├─ Baseline: $2.1M         ││
│  │                                 │   ├─ Modified: $2.6M         ││
│  │  ┌───────────────────────────┐  │   └─ Delta: +$500K (+24%)    ││
│  │  │ AI: I understood...       │  │                              ││
│  │  │ [Confirm] [Edit] [Cancel] │  │   ────────────────────────   ││
│  │  └───────────────────────────┘  │                              ││
│  │                                 │   Modifications Applied (2)  ││
│  │  ┌───────────────────────────┐  │   ├─ Alex salary +$20K       ││
│  │  │ Type your question...     │  │   └─ House purchase $1M      ││
│  │  │                    [Send] │  │                              ││
│  │  └───────────────────────────┘  │   [Save as Scenario] [Reset] ││
│  │                                 │                              ││
│  └─────────────────────────────────┴──────────────────────────────┘│
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

### Component Hierarchy

```
/app/(app)/assistant/page.tsx
├── AssistantLayout
│   ├── ChatPanel
│   │   ├── MessageList
│   │   │   ├── UserMessage
│   │   │   ├── AssistantMessage
│   │   │   └── ConfirmationMessage (with buttons)
│   │   ├── SuggestedQuestions
│   │   └── ChatInput
│   │
│   └── ProjectionPanel
│       ├── ComparisonChart
│       │   └── DualLineChart (baseline vs modified)
│       ├── ProjectionSummary
│       │   ├── BaselineValue
│       │   ├── ModifiedValue
│       │   └── DeltaDisplay
│       ├── ModificationHistory
│       │   └── ModificationItem (with undo button)
│       └── ActionButtons
│           ├── SaveAsScenarioButton
│           └── ResetButton
│
└── ChatContextProvider (wraps everything)
```

---

## 8. State Management

### React Context: ChatContext

```typescript
// contexts/ChatContext.tsx

interface ChatContextValue {
  // State
  state: ChatState;

  // Actions
  sendMessage: (message: string) => Promise<void>;
  confirmModification: (modificationId: string) => Promise<void>;
  rejectModification: (modificationId: string) => void;
  undoLastModification: () => void;
  resetConversation: () => void;
  saveAsScenario: (name: string, description?: string) => Promise<string>;
}

const ChatContext = createContext<ChatContextValue | null>(null);

export function ChatProvider({
  children,
  scenarioId
}: {
  children: React.ReactNode;
  scenarioId: string;
}) {
  const [state, dispatch] = useReducer(chatReducer, initialState);

  // Load baseline data on mount
  useEffect(() => {
    loadBaselineData(scenarioId);
  }, [scenarioId]);

  // ... action implementations

  return (
    <ChatContext.Provider value={{ state, ...actions }}>
      {children}
    </ChatContext.Provider>
  );
}
```

### State Reducer Actions

```typescript
type ChatAction =
  | { type: 'SET_LOADING'; loading: boolean }
  | { type: 'SET_ERROR'; error: string | null }
  | { type: 'LOAD_BASELINE'; data: ScenarioData; projection: ProjectionSeries }
  | { type: 'ADD_USER_MESSAGE'; message: string }
  | { type: 'ADD_ASSISTANT_MESSAGE'; message: string; pendingModification?: Modification }
  | { type: 'CONFIRM_MODIFICATION'; modificationId: string; projection: ProjectionSeries }
  | { type: 'REJECT_MODIFICATION'; modificationId: string }
  | { type: 'UNDO_MODIFICATION' }
  | { type: 'RESET_CONVERSATION' }
  | { type: 'SET_PROJECTION_COMPARISON'; comparison: ProjectionComparison };
```

---

## 9. Modification Application Logic

### In-Memory Data Transformation

```typescript
// lib/modifications/apply.ts

export function applyModifications(
  baselineData: ScenarioData,
  modifications: Modification[]
): ScenarioData {
  let data = structuredClone(baselineData);

  for (const mod of modifications) {
    data = applySingleModification(data, mod);
  }

  return data;
}

function applySingleModification(
  data: ScenarioData,
  mod: Modification
): ScenarioData {
  switch (mod.type) {
    case 'INCOME_CHANGE':
      return applyIncomeChange(data, mod);
    case 'INCOME_ADD':
      return applyIncomeAdd(data, mod);
    case 'EXPENSE_ADD':
      return applyExpenseAdd(data, mod);
    case 'ASSET_PURCHASE':
      return applyAssetPurchase(data, mod);
    // ... other cases
    default:
      return data;
  }
}

function applyIncomeChange(
  data: ScenarioData,
  mod: IncomeModification
): ScenarioData {
  const incomes = data.incomes.map(income => {
    const matches = mod.targetIncomeId
      ? income.id === mod.targetIncomeId
      : income.name.toLowerCase().includes(mod.targetIncomeName?.toLowerCase() ?? '');

    if (!matches) return income;

    return {
      ...income,
      amount: mod.changes.amountDelta
        ? income.amount + mod.changes.amountDelta
        : mod.changes.amount ?? income.amount,
      frequency: mod.changes.frequency ?? income.frequency,
      startDate: mod.changes.startDate ?? income.startDate,
      endDate: mod.changes.endDate ?? income.endDate,
    };
  });

  return { ...data, incomes };
}

function applyAssetPurchase(
  data: ScenarioData,
  mod: AssetPurchaseModification
): ScenarioData {
  // 1. Reduce account balance by down payment
  const accounts = data.accounts.map(account => {
    if (account.type === 'CHECKING' || account.type === 'SAVINGS') {
      // Deduct from first available liquid account
      return { ...account, balance: account.balance - mod.downPayment };
    }
    return account;
  });

  // 2. Add new loan if financed
  const loans = mod.loan
    ? [...data.loans, {
        id: `temp-loan-${Date.now()}`,
        name: `${mod.assetType} Loan`,
        ...mod.loan,
      }]
    : data.loans;

  // 3. Add related expenses (property tax, insurance, etc.)
  const expenses = mod.relatedExpenses
    ? [...data.expenses, ...mod.relatedExpenses.map((exp, i) => ({
        id: `temp-expense-${Date.now()}-${i}`,
        ...exp,
      }))]
    : data.expenses;

  return { ...data, accounts, loans, expenses };
}
```

---

## 10. Error Handling

### Error Types

```typescript
enum ChatErrorType {
  PARSE_FAILED = 'PARSE_FAILED',           // AI couldn't understand the request
  AMBIGUOUS_REQUEST = 'AMBIGUOUS_REQUEST', // Need clarification
  INVALID_MODIFICATION = 'INVALID_MODIFICATION', // Modification doesn't make sense
  CALCULATION_ERROR = 'CALCULATION_ERROR', // Engine failed
  NETWORK_ERROR = 'NETWORK_ERROR',
  SAVE_FAILED = 'SAVE_FAILED',
}

interface ChatError {
  type: ChatErrorType;
  message: string;
  suggestion?: string;
}
```

### Error Handling Strategy

| Error Type | User Experience |
|------------|-----------------|
| PARSE_FAILED | "I didn't understand that. Could you rephrase? For example: 'What if my salary increases by $20,000?'" |
| AMBIGUOUS_REQUEST | "I found multiple matches. Did you mean: [options]" |
| INVALID_MODIFICATION | "That change doesn't seem valid. [specific reason]. Try: [suggestion]" |
| CALCULATION_ERROR | "Something went wrong calculating projections. Please try again." |
| NETWORK_ERROR | "Connection issue. Please check your internet and try again." |
| SAVE_FAILED | "Couldn't save the scenario. Please try again." |

---

## 11. Testing Strategy

### Unit Tests

```typescript
// __tests__/modifications/apply.test.ts
describe('applyModifications', () => {
  it('should apply income change correctly', () => {
    const baseline = { incomes: [{ id: '1', name: 'Salary', amount: 100000 }] };
    const mod = { type: 'INCOME_CHANGE', targetIncomeId: '1', changes: { amountDelta: 20000 } };
    const result = applyModifications(baseline, [mod]);
    expect(result.incomes[0].amount).toBe(120000);
  });

  it('should handle cumulative modifications', () => {
    // ... test that modifications stack correctly
  });

  it('should handle asset purchase with loan', () => {
    // ... test house purchase creates loan and reduces account
  });
});
```

### Integration Tests

```typescript
// __tests__/api/ai-chat.test.ts
describe('POST /api/ai/chat', () => {
  it('should parse salary increase request', async () => {
    const response = await request(app)
      .post('/api/ai/chat')
      .send({
        message: "What if my salary increases by 20k?",
        scenarioId: 'test-scenario',
        conversationHistory: [],
        currentModifications: [],
      });

    expect(response.body.pendingModification).toBeDefined();
    expect(response.body.pendingModification.type).toBe('INCOME_CHANGE');
  });
});
```

### E2E Tests (Playwright)

```typescript
// e2e/assistant.spec.ts
test('complete what-if flow', async ({ page }) => {
  await page.goto('/assistant');

  // Ask a question
  await page.fill('[data-testid="chat-input"]', 'What if my salary increases by 20k?');
  await page.click('[data-testid="send-button"]');

  // Wait for AI response
  await page.waitForSelector('[data-testid="confirmation-message"]');

  // Confirm modification
  await page.click('[data-testid="confirm-button"]');

  // Verify chart updated
  await page.waitForSelector('[data-testid="comparison-chart"]');
  const delta = await page.textContent('[data-testid="delta-display"]');
  expect(delta).toContain('+');
});
```

---

## 12. Implementation Phases

### Phase 1: Foundation (Core Infrastructure)
1. Create `/app/(app)/assistant/page.tsx` route
2. Implement `ChatContext` and state management
3. Build basic chat UI (messages, input)
4. Create `/api/ai/chat` endpoint stub
5. Integrate with existing scenario data fetching

### Phase 2: AI Integration
1. Implement Claude API integration in `/api/ai/chat`
2. Design and test system prompt
3. Build modification parsing logic
4. Implement confirmation flow UI

### Phase 3: Calculations
1. Implement `applyModifications()` for all modification types
2. Integrate with `@finatlas/engine` for projections
3. Build comparison chart component
4. Add projection summary display

### Phase 4: Polish
1. Add modification history panel
2. Implement undo functionality
3. Build "Save as Scenario" feature
4. Add suggested follow-up questions
5. Error handling and edge cases

### Phase 5: Testing & Refinement
1. Write unit tests for modification logic
2. Write integration tests for API
3. E2E tests for complete flows
4. Performance optimization
5. UX refinements based on testing

---

## 13. File Structure

```
apps/web/
├── app/(app)/assistant/
│   └── page.tsx                    # Main assistant page
├── components/assistant/
│   ├── AssistantLayout.tsx         # Two-panel layout
│   ├── ChatPanel.tsx               # Left panel with chat
│   ├── MessageList.tsx             # Chat message display
│   ├── ChatMessage.tsx             # Individual message
│   ├── ConfirmationMessage.tsx     # Message with confirm/reject
│   ├── ChatInput.tsx               # Input field
│   ├── ProjectionPanel.tsx         # Right panel
│   ├── ComparisonChart.tsx         # Dual-line chart
│   ├── ProjectionSummary.tsx       # Stats display
│   ├── ModificationHistory.tsx     # List of changes
│   └── SuggestedQuestions.tsx      # Quick action chips
├── contexts/
│   └── ChatContext.tsx             # State management
├── lib/
│   ├── ai/
│   │   ├── prompts.ts              # System prompts
│   │   ├── parse-modification.ts   # AI response parsing
│   │   └── claude-client.ts        # Anthropic SDK wrapper
│   └── modifications/
│       ├── types.ts                # Modification type definitions
│       ├── apply.ts                # Apply modifications to data
│       └── validate.ts             # Validate modifications
└── app/api/ai/
    ├── chat/route.ts               # Main chat endpoint
    └── save-scenario/route.ts      # Save scenario endpoint
```

---

## 14. Dependencies

### New Dependencies Required

```json
{
  "@anthropic-ai/sdk": "^0.24.0"
}
```

### Existing Dependencies Used
- `@finatlas/engine` - Projection calculations
- `@finatlas/schemas` - Type definitions
- `react` / `next` - UI framework
- `prisma` - Database (for saving scenarios)

---

## 15. Security Considerations

1. **API Key Protection**: Anthropic API key stored in environment variables, never exposed to client

2. **Input Sanitization**: All user inputs sanitized before sending to Claude

3. **Rate Limiting**: Implement rate limiting on `/api/ai/chat` to prevent abuse

4. **Data Isolation**: Users can only access their own scenario data

5. **Modification Validation**: All modifications validated server-side before applying

---

## 16. Future Enhancements (Post-v1)

- **Voice input**: Speak questions instead of typing
- **Export to PDF**: Generate reports of scenario comparisons
- **Goal-based suggestions**: AI suggests modifications to reach specific goals
- **Historical comparison**: Compare against past actual performance
- **Collaboration**: Share scenarios with family members
- **Tax optimization**: Suggest tax-advantaged strategies

---

## Appendix A: Example Conversations

### Example 1: Salary Increase
```
User: What if Alex gets a 20k raise starting next year?

AI: I understood you want to:
- Increase "Alex Salary" by $20,000/year
- Starting: January 2026
- Duration: Ongoing

Is this correct? [Confirm] [Edit] [Cancel]

User: [Confirms]

AI: Applied! Here's the impact:
- Net worth in 10 years: $2.6M (was $2.1M)
- Additional savings: ~$500K (+24%)
- You'd reach your retirement goal 2 years earlier

Would you like to explore additional changes?
```

### Example 2: House Purchase
```
User: What if we buy a house for 1 million with 20% down?

AI: I understood you want to purchase a home:
- Purchase price: $1,000,000
- Down payment: $200,000 (20%)
- Loan amount: $800,000
- Estimated rate: 6.5% (30-year fixed)
- Monthly payment: ~$5,050

I'll also add estimated expenses:
- Property tax: $1,000/month
- Insurance: $200/month
- Maintenance: $500/month

Is this correct? [Confirm] [Edit] [Cancel]

User: [Confirms]

AI: Applied! Here's the impact:
- Net worth in 10 years: $2.4M (was $2.1M)
- You'll build ~$400K in home equity
- Monthly expenses increase by $6,750
- Savings rate drops from 40% to 25%

The house purchase slightly improves long-term net worth due to equity building, but significantly reduces monthly cash flow.
```

---

**End of Design Document**
