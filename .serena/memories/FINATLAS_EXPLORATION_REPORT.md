# FinAtlas Codebase Exploration Report

## Executive Summary
FinAtlas is a comprehensive local-only financial planning application built with Next.js 14 and React. It features a sophisticated financial modeling engine, AI-powered assistant for what-if scenarios, and an extensive set of financial analysis tools.

---

## 1. THEME SYSTEM

### Current Implementation
- **Color Scheme**: Dark theme only (hardcoded)
  - Background: `#09090b` (zinc-950)
  - Text: `#fafafa` (zinc-50)
  - Accent: Emerald/Green `#34d399` (rgb(52, 211, 153))
  - Secondary: Blue `#2563eb` (for interactive elements)
  - Borders: `zinc-800` and `zinc-700`

### Configuration Files
- **tailwind.config.ts**: Minimal config, extends zinc-950 color
  ```typescript
  colors: {
    zinc: {
      950: "#09090b",
    },
  },
  ```
- **globals.css**: Base styles for dark theme
  - Print mode overrides (white background for printing)
  - Selection colors (emerald with transparency)
  - Smooth scroll behavior
  - Animation keyframes (slideIn)

### Theme Management Status
- **PreferencesContext.tsx**: Currently only manages currency and date format preferences
- **PreferencesSection.tsx**: Theme selector is disabled with comment "Light theme coming soon"
- **No Theme Provider**: App has no theme context or provider
- **Hardcoded Colors**: All components use hardcoded Tailwind classes (bg-zinc-900, text-zinc-100, etc.)

### Key Color Usage Patterns
- **Cards/Panels**: `bg-zinc-900/50` with `border-zinc-800`
- **Text**: `text-zinc-100` (primary), `text-zinc-400` (secondary), `text-zinc-600` (muted)
- **Interactive**: `blue-600` (primary buttons), `emerald-400` (success/positive)
- **Destructive**: `red-600` (delete/cancel), `red-400` (errors)
- **Disabled**: `zinc-800` background with `zinc-600` text

---

## 2. AI ASSISTANT FEATURE

### Architecture
```
/app/(app)/assistant/page.tsx
  ↓ (loads baseline scenario)
  → AssistantClient.tsx (wraps with ChatProvider)
      ↓
      ├─ ChatPanel.tsx (chat interface)
      └─ ProjectionPanel.tsx (net worth projections & modifications)
```

### Chat System Flow
1. **ChatContext.tsx**: Core state management using useReducer
   - Manages messages (user/assistant/system)
   - Tracks modifications to financial data
   - Handles baseline data loading from API

2. **API Integration**: `/api/ai/chat` route
   - Uses Anthropic SDK (Claude Sonnet 4.5, 20250929)
   - Sends scenario data + conversation history
   - Returns: `{ message, modification: {...} }`

3. **Message Structure**:
   ```typescript
   interface ChatMessage {
     id: string;
     role: "user" | "assistant" | "system";
     content: string;
     timestamp: string;
     modification?: Modification;
     pendingModification?: Modification;
   }
   ```

4. **Modification Workflow**:
   - AI parses natural language → JSON block in response
   - JSON contains modification type + changes
   - User confirms/rejects before applying
   - Confirmed modifications stored and applied to data

### Supported Modification Types
1. INCOME_CHANGE, INCOME_ADD, INCOME_REMOVE
2. EXPENSE_CHANGE, EXPENSE_ADD, EXPENSE_REMOVE
3. ASSET_PURCHASE (house, car, etc.)
4. LOAN_ADD, LOAN_PAYOFF
5. INVESTMENT_CHANGE, INVESTMENT_ADD, INVESTMENT_REMOVE

### AI Prompt System (lib/ai/prompts.ts)
- System prompt built with current scenario data
- Includes: incomes, expenses, accounts, loans, goals
- Shows accumulated modifications in session
- Defines JSON response format with examples
- Constraints: no invented data, conservative assumptions

### Projection Calculation
- **Simple 10-year projection** in ProjectionPanel.tsx
- Growth rate: 6% annually
- Tax rate: 25% estimated
- Supports year-by-year modifications (different start dates)
- Calculates: baseline vs modified net worth trajectories
- Shows delta and percentage change

### UI Components
- **ChatPanel**: 
  - Fixed height (600px) with scrollable messages
  - Blue bubbles for user, dark for assistant
  - Green/red confirm/cancel buttons for pending modifications
  - Text input with Send button
  - Shows "Thinking..." while loading

- **ProjectionPanel**:
  - Net worth projection chart comparison
  - Summary grid: Baseline, Modified, Difference
  - Modification history list
  - Undo Last / Reset All buttons

---

## 3. CURRENT FEATURE PAGES

All pages located in `/app/(app)/`:

### Financial Core
- **dashboard** - Overview/main page
- **incomes** - Income management
- **expenses** - Expense tracking
- **investments** - Investment accounts
- **loans** - Debt management
- **accounts** - Bank accounts & assets

### Analysis & Projections
- **charts** - Charting/visualization tools
- **cash-flow** - Cash flow analysis
- **net-worth-history** - Net worth tracking over time
- **investment-performance** - Investment returns analysis
- **spending-trends** - Spending pattern analysis
- **financial-ratios** - Ratio calculations

### Planning Tools
- **what-if** - What-if scenario explorer
- **assistant** - AI financial assistant (what-if with AI)
- **compare** - Compare scenarios
- **budget** - Budget planning
- **goals** - Financial goals
- **milestones** - Milestone tracking

### Specific Calculators
- **debt-payoff** - Debt payoff strategies
- **emergency-fund** - Emergency fund calculator
- **fire-calculator** - FIRE/retirement calculator
- **monte-carlo** - Monte Carlo projections
- **rebalancing** - Portfolio rebalancing
- **refinance** - Loan refinancing analysis
- **amortization** - Loan amortization schedules
- **tax-estimation** - Tax estimation

### Administrative
- **settings** - Settings & preferences
- **members** - Household members
- **calendar** - Calendar/events
- **export** - Data export
- **reports** - Financial reports

---

## 4. PROJECT STRUCTURE

### Tech Stack
- **Framework**: Next.js 14.2.21
- **UI**: React 18.3.1 + Tailwind CSS 3.4.17
- **Database**: Prisma 6.2.1
- **AI**: Anthropic SDK (Claude Sonnet 4.5)
- **Charts**: Ant Design Charts
- **Auth**: JWT + password hashing (argon2)
- **Monorepo**: Turbo workspace

### Directory Organization
```
apps/web/
├── app/
│   ├── (app)/ - Protected app routes
│   ├── (auth)/ - Auth routes (login)
│   ├── api/ - API routes
│   └── layout.tsx
├── components/
│   ├── assistant/ - Chat & projection panels
│   ├── ui/ - Common UI components
│   ├── layout/ - AppShell, Sidebar, Selectors
│   ├── forms/ - Form components
│   ├── charts/ - Chart components
│   ├── settings/ - Settings UI
│   └── ...
├── contexts/
│   ├── ChatContext.tsx - Chat state
│   ├── ScenarioContext.tsx - Scenario selection
│   ├── HouseholdContext.tsx - Multi-household support
│   └── PreferencesContext.tsx - User preferences
├── lib/
│   ├── ai/ - Claude integration
│   ├── auth/ - Authentication
│   ├── db/ - Prisma client
│   ├── format.ts - Number/currency formatting
│   ├── modifications/ - Scenario modifications
│   └── [other calculators and utilities]
└── styles/
    └── globals.css
```

### Database Models (via Prisma)
- User, Household, Scenario
- Accounts, Incomes, Expenses, Loans
- Goals, Milestones, Investments
- Various projection/calculation tables

### API Routes
Organized by feature:
- `/api/ai/chat` - AI assistant
- `/api/scenarios/` - Scenario management
- `/api/accounts`, `/api/incomes`, `/api/expenses`, etc.
- `/api/export` - Data export
- `/api/projections` - Projection calculations
- `/api/health-score`, `/api/dashboard`, `/api/spending-trends`, etc.

---

## 5. KEY IMPLEMENTATION INSIGHTS

### Multi-Household Support
- Users can have multiple households
- Each household has baseline + comparison scenarios
- HouseholdContext manages current household selection
- All data queries filtered by household + scenario ID

### Preferences System
- Stores in localStorage via PreferencesContext
- Currently supports: Currency (USD, EUR, GBP, JPY), DateFormat (3 options)
- Theme setting disabled with "coming soon" message
- Easy to extend for additional preferences

### Chat State Management
- Uses useReducer pattern with clear action types
- Modifications immutably tracked
- BaselineData never mutated; createModifications creates new state
- Messages stored with pending/confirmed status

### Formatting
- Centralized formatting in `lib/format.ts`
- Functions: formatCurrency, formatCompactCurrency, formatAxisDate, formatPercent
- Respects user's currency preference from PreferencesContext
- DateFormat preference used in displays

### Authorization
- Cookie-based sessions
- `getCurrentUser()` from lib/auth/session
- Protected routes redirect to /login if no user
- API routes verify user authorization

---

## 6. CURRENT LIMITATIONS & NOTES

### Theme System
- Hard-coded dark theme only
- All colors are Tailwind classes with hardcoded color values
- No theme switching mechanism
- Light theme explicitly marked "coming soon"

### Assistant Feature
- Simplified 10-year projection (not full Monte Carlo or projection engine)
- Uses fixed 6% growth rate and 25% tax rate
- Modifications validated on confirmation, not parsed in real-time
- No streaming response support (full response returned at once)

### Missing Features (Marked as Coming Soon)
- Light theme toggle
- Notification preferences/system
- Some advanced financial calculators

### Performance Notes
- Uses Ant Design Charts (heavy library)
- All components hardcoded colors (not dynamically themed)
- Scenario data loaded fully into client state
- No pagination on large datasets

---

## 7. COLOR REFERENCE

### Primary Colors
| Use | Hex | Tailwind |
|-----|-----|----------|
| Background | #09090b | bg-zinc-950 |
| Card Background | #18181b | bg-zinc-900 |
| Text Primary | #fafafa | text-zinc-50 |
| Text Secondary | #a1a1aa | text-zinc-400 |
| Border | #27272a | border-zinc-800 |

### Accent Colors
| Use | Hex | Tailwind |
|-----|-----|----------|
| Success/Green | #34d399 | emerald-400 |
| Primary/Blue | #2563eb | blue-600 |
| Destructive/Red | #dc2626 | red-600 |
| Warning/Yellow | #eab308 | yellow-400 |

### Button States
- **Active**: blue-600 → blue-700 on hover
- **Disabled**: bg-zinc-800, text-zinc-600
- **Secondary**: border-zinc-700, hover:bg-zinc-800
- **Success**: bg-green-600 → green-700
- **Danger**: bg-red-600 → red-700

---

## 8. RECOMMENDATIONS FOR THEME IMPLEMENTATION

If implementing light theme:
1. Create theme context with 'light' | 'dark' state
2. Define color schemes for both themes in constants
3. Add `data-theme="dark|light"` to `<html>` element
4. Use CSS variables or Tailwind's dark: prefix
5. Update PreferencesContext to track theme preference
6. Store theme preference in localStorage
7. Apply theme class in root layout
8. Update all hardcoded color classes to use theme variables

---

## 9. FILES TO WATCH FOR CHANGES

**Core Theme Files:**
- `styles/globals.css`
- `tailwind.config.ts`
- `contexts/PreferencesContext.tsx`
- `components/settings/PreferencesSection.tsx`

**Assistant Feature Files:**
- `app/(app)/assistant/page.tsx`
- `contexts/ChatContext.tsx`
- `components/assistant/*.tsx`
- `lib/ai/claude-client.ts`
- `lib/ai/prompts.ts`
- `app/api/ai/chat/route.ts`

**Layout Files:**
- `app/layout.tsx`
- `app/(app)/layout.tsx`
- `components/layout/AppShell.tsx`

