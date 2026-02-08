<p align="center">
  <h1 align="center">FinAtlas</h1>
  <p align="center">Comprehensive Personal Finance Management & Planning Platform</p>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16-black?logo=next.js" alt="Next.js 16" />
  <img src="https://img.shields.io/badge/React-19-61DAFB?logo=react" alt="React 19" />
  <img src="https://img.shields.io/badge/TypeScript-5.9-blue?logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-3.4-06B6D4?logo=tailwindcss" alt="Tailwind CSS" />
  <img src="https://img.shields.io/badge/Prisma-6.2-2D3748?logo=prisma" alt="Prisma" />
  <img src="https://img.shields.io/badge/Turbopack-enabled-F7DF1E" alt="Turbopack" />
</p>

---

FinAtlas is a privacy-first, local-only household financial planning application that empowers individuals and families to take control of their financial future. With deterministic calculations, multi-scenario comparison, and an AI-powered assistant, FinAtlas provides institutional-grade financial planning tools in a clean, modern interface.

![FinAtlas Dashboard](screenshots/dashboard.png)

## Key Highlights

- **Privacy-First Architecture** — All data stored locally with SQLite. No financial data leaves your machine.
- **Deterministic Projections** — Every calculation is reproducible. No LLM approximations for your finances.
- **Multi-Scenario Planning** — Create baseline, optimistic, and pessimistic scenarios and compare them side-by-side.
- **AI-Powered Assistant** — Natural language interface with contextual prompt recommendations, powered by Anthropic Claude.
- **Financial Health Score** — Real-time composite health score with actionable improvement recommendations.
- **41 Feature Pages** — Comprehensive coverage from daily budgeting to long-term retirement planning.
- **57 API Routes** — Full REST API with scenario-scoped data, analytics, and AI integration.
- **Multi-Household Support** — Manage separate financial profiles for different households or family structures.
- **Dark / Light / System Theme** — Full theme toggle with automatic OS preference detection and zero-FOUC rendering.

---

## Screenshots

<table>
  <tr>
    <td align="center"><strong>Login</strong></td>
    <td align="center"><strong>Dashboard</strong></td>
  </tr>
  <tr>
    <td><img src="screenshots/login.png" alt="Login" width="400" /></td>
    <td><img src="screenshots/dashboard.png" alt="Dashboard" width="400" /></td>
  </tr>
  <tr>
    <td align="center"><strong>Income Management</strong></td>
    <td align="center"><strong>Investment Portfolio</strong></td>
  </tr>
  <tr>
    <td><img src="screenshots/incomes.png" alt="Income Management" width="400" /></td>
    <td><img src="screenshots/investments.png" alt="Investments" width="400" /></td>
  </tr>
  <tr>
    <td align="center"><strong>Financial Health Score</strong></td>
    <td align="center"><strong>Financial Charts</strong></td>
  </tr>
  <tr>
    <td><img src="screenshots/financial-health.png" alt="Financial Health" width="400" /></td>
    <td><img src="screenshots/charts.png" alt="Charts" width="400" /></td>
  </tr>
  <tr>
    <td align="center"><strong>Debt Payoff Strategies</strong></td>
    <td align="center"><strong>FIRE Calculator</strong></td>
  </tr>
  <tr>
    <td><img src="screenshots/debt-payoff.png" alt="Debt Payoff" width="400" /></td>
    <td><img src="screenshots/fire-calculator.png" alt="FIRE Calculator" width="400" /></td>
  </tr>
  <tr>
    <td align="center" colspan="2"><strong>AI Assistant</strong></td>
  </tr>
  <tr>
    <td colspan="2" align="center"><img src="screenshots/assistant.png" alt="AI Assistant" width="600" /></td>
  </tr>
</table>

---

## Feature Overview

### Money Flow
| Feature | Description |
|---------|-------------|
| **Income Tracking** | Track all income sources with flexible frequency options (monthly, biweekly, weekly, annual, one-time). Assign income to household members with growth projections. |
| **Expense Management** | Categorize and monitor expenses with customizable frequencies and inflation adjustments. Bulk operations for multi-select delete and category changes. |
| **Budget Tracking** | Set monthly budgets by category and monitor spending against defined targets with budget vs. actual comparisons. |
| **Spending Trends** | Analyze historical spending patterns over time with category-level breakdowns. |
| **Cash Flow Forecast** | Project monthly inflows, outflows, and running balance up to 24 months ahead. |
| **Recurring Transactions** | Manage recurring income and expense patterns with automatic scheduling. |

### Taxes & Investing
| Feature | Description |
|---------|-------------|
| **Tax Estimation** | Estimate federal and state tax liability with support for 2024 brackets, FICA, deductions, and filing status. |
| **Investment Accounts** | Manage 401(k), IRA, Roth IRA, Brokerage, and HSA accounts with individual holdings and contributions. |
| **Rebalancing** | Analyze portfolio allocation drift against targets and generate rebalancing recommendations. |
| **Investment Performance** | Track cost basis, gain/loss, and return percentages across all accounts with expandable holding detail views. |

### Debt Management
| Feature | Description |
|---------|-------------|
| **Loan Tracking** | Manage mortgages, auto loans, student loans, and personal debt with detailed terms and payment schedules. |
| **Amortization Schedules** | View month-by-month payment breakdowns showing principal vs. interest over the full loan term. |
| **Debt Payoff Strategies** | Compare snowball and avalanche payoff methods with projected timelines and total interest savings. |
| **Refinance Analysis** | Model refinancing scenarios to evaluate potential monthly savings and break-even points. |

### Planning
| Feature | Description |
|---------|-------------|
| **Financial Goals** | Set savings and investment goals with target amounts, dates, and priority levels. Track progress visually. |
| **Goal Funding Planner** | Plan and optimize funding strategies across multiple goals with priority-based allocation. |
| **Milestones** | Define life milestones (home purchase, retirement, education) with target dates and financial requirements. |
| **Financial Calendar** | View upcoming financial events, payment due dates, and goal deadlines in a calendar view. |
| **Household Members** | Manage household member profiles with role assignments and income allocation. |
| **College Savings** | Model 529 plan growth with contribution optimization, cost inflation projections, and state tax benefits. |
| **Insurance Calculator** | Analyze life and disability insurance coverage needs with gap analysis and recommendations. |

### Analysis & Insights
| Feature | Description |
|---------|-------------|
| **Financial Health Score** | Composite health score (0-100) with category breakdowns, trend tracking, and actionable improvement tips. |
| **Multi-Year Charts** | Visualize net worth growth, income vs. expenses, asset allocation, and projections with interactive charts. |
| **Advanced Visualizations** | Cash flow Sankey diagrams, spending heatmaps, and asset allocation treemaps. |
| **Net Worth History** | Track net worth changes over time across all accounts and liabilities. |
| **Financial Ratios** | Monitor five key health indicators: debt-to-income, savings rate, liquidity ratio, housing ratio, and net-worth-to-income. |
| **Monte Carlo Simulations** | Run probability-based retirement projections accounting for market volatility and sequence-of-returns risk. |
| **Scenario Comparison** | Compare multiple financial scenarios side-by-side with detailed breakdowns. |
| **What-If Analysis** | Model hypothetical changes to income, expenses, or investments and see their projected impact. |

### Retirement & FIRE
| Feature | Description |
|---------|-------------|
| **FIRE Calculator** | Calculate your Financial Independence, Retire Early target with adjustable withdrawal rates, expected returns, and inflation assumptions. |
| **Retirement Income** | Social Security optimization (claim at 62/67/70), withdrawal order planning, and year-by-year income projections. |
| **Emergency Fund Tracker** | Monitor emergency fund adequacy relative to monthly expenses with target month coverage. |

### Tools & Export
| Feature | Description |
|---------|-------------|
| **Reports** | Generate comprehensive PDF financial reports across all data categories. |
| **Data Export** | Download income, expenses, loans, accounts, and goals as CSV files for external analysis. |
| **CSV Import** | Bulk import financial data from spreadsheets with guided column mapping and downloadable templates. |
| **Transaction Categorization** | Auto-categorize expenses with customizable rules, pattern matching, and bulk apply. |
| **AI Assistant** | Ask natural language questions about your finances and explore what-if scenarios with AI-powered analysis. Contextual prompt recommendations adapt to your data. |
| **Smart Notifications** | Computed financial alerts for budget overspend, upcoming bills, goal milestones, and risk indicators. |
| **Global Search** | Search across all entities (incomes, expenses, accounts, loans, goals) with Cmd+K. |

### Personalization
| Feature | Description |
|---------|-------------|
| **Dashboard Customization** | Toggle dashboard widgets on/off and reorder them to your preference. |
| **Theme Toggle** | Switch between Dark, Light, and System themes. CSS variable-based zinc palette inversion adapts the entire UI. |
| **Currency & Date Format** | Choose preferred currency (USD, EUR, GBP, JPY) and date display format. |
| **Preferences Persistence** | All user preferences stored in localStorage with instant application across sessions. |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | [Next.js 16](https://nextjs.org/) (App Router, Turbopack) |
| **Language** | [TypeScript](https://www.typescriptlang.org/) 5.9 (strict mode) |
| **UI** | [React](https://react.dev/) 19 |
| **Styling** | [Tailwind CSS](https://tailwindcss.com/) 3.4 with CSS variable theming |
| **Database** | SQLite via [Prisma](https://www.prisma.io/) 6.2 ORM |
| **Authentication** | JWT with httpOnly cookies, [Argon2](https://github.com/ranisalt/node-argon2) password hashing |
| **AI Integration** | [Anthropic Claude](https://www.anthropic.com/) API (optional) |
| **Validation** | [Zod](https://zod.dev/) schemas |
| **Charts** | Custom SVG charts + [Ant Design Charts](https://charts.ant.design/) |
| **PDF Reports** | [@react-pdf/renderer](https://react-pdf.org/) |
| **Build System** | [Turborepo](https://turbo.build/) + pnpm workspaces |
| **Engine** | Custom deterministic financial projection engine (`@finatlas/engine`) |

---

## Project Structure

```
finatlas/
├── apps/
│   └── web/                     # Next.js 16 web application
│       ├── app/
│       │   ├── (app)/           # Authenticated routes (41 pages)
│       │   └── api/             # REST API endpoints (57 routes)
│       ├── components/
│       │   ├── bulk/            # Bulk action components
│       │   ├── charts/          # SVG chart components (Sankey, Heatmap, Treemap)
│       │   ├── college/         # College savings charts
│       │   ├── dashboard/       # Dashboard client & configuration
│       │   ├── import/          # CSV import wizard
│       │   ├── insurance/       # Insurance coverage charts
│       │   ├── layout/          # Sidebar, AppShell, navigation
│       │   ├── notifications/   # Smart notification bell & panel
│       │   ├── retirement/      # Retirement income charts & tables
│       │   ├── settings/        # Settings page components
│       │   └── ui/              # Reusable UI primitives
│       ├── contexts/            # React context providers
│       ├── lib/
│       │   ├── amortization/    # Loan amortization calculations
│       │   ├── assistant/       # AI prompt recommendation engine
│       │   ├── auth/            # Session management
│       │   ├── categorization/  # Expense categorization rules
│       │   ├── college/         # College savings calculations
│       │   ├── dashboard/       # Dashboard widget configuration
│       │   ├── db/              # Prisma client
│       │   ├── debt/            # Debt payoff strategies
│       │   ├── health/          # Financial health score calculations
│       │   ├── insurance/       # Insurance needs calculations
│       │   ├── performance/     # Investment performance calculations
│       │   ├── ratios/          # Financial ratio calculations
│       │   ├── refinance/       # Refinance analysis calculations
│       │   ├── retirement/      # Retirement income calculations
│       │   ├── visualizations/  # Chart layout algorithms
│       │   └── format.ts        # Currency, date, percent formatters
│       └── prisma/              # Database schema and migrations
├── packages/
│   ├── engine/                  # Deterministic financial projection engine
│   │   └── src/
│   │       ├── internal/        # Core calculation modules
│   │       ├── types.ts         # TypeScript definitions
│   │       └── contract.ts      # Engine API contract
│   └── schemas/                 # Shared Zod validation schemas
└── docker-compose.yml           # Docker deployment configuration
```

---

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm 9.0+

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd finatlas

# Install dependencies
pnpm install

# Set up environment variables
cp .env.example apps/web/.env
```

Configure `apps/web/.env`:

```env
# Authentication
AUTH_JWT_SECRET=your-secret-key-min-32-chars
AUTH_COOKIE_NAME=finatlas_session

# Database
DATABASE_URL="file:./prisma/dev.db"

# AI Assistant (optional)
ANTHROPIC_API_KEY=your-anthropic-api-key
```

```bash
# Initialize the database
pnpm db:migrate
pnpm db:seed

# Start the development server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Default Credentials

- **Email:** `demo@local`
- **Password:** `Demo1234!`

---

## Architecture

### Financial Engine

The core projection engine (`@finatlas/engine`) is fully deterministic and decoupled from the frontend:

```typescript
import { runEngine } from "@finatlas/engine";

const result = runEngine({
  scenarioId: "baseline",
  household: { ... },
  assumptions: { ... },
  incomes: [...],
  expenses: [...],
  accounts: [...],
  loans: [...],
  goals: [...],
});

// Access projection results
result.series.netWorth;    // Monthly net worth series
result.series.income;      // Monthly income series
result.warnings;           // Validation warnings
```

**Engine Modules:**
- `projection.ts` — Month-by-month simulation loop
- `taxes.ts` — Federal + state tax calculations (2024 brackets)
- `accounts.ts` — Investment account balance tracking with contributions
- `loans.ts` — Loan amortization and payoff scheduling
- `schedules.ts` — Income/expense frequency normalization
- `growth.ts` — Inflation and growth rate adjustments

### Navigation

The sidebar organizes 41 pages into 9 collapsible sections:

- **Money Flow** — Income, Expenses, Budget, Trends, Cash Flow, Recurring
- **Taxes & Investing** — Tax Estimation, Investments, Rebalancing, Performance
- **Debt** — Loans, Amortization, Debt Payoff, Refinance
- **Planning** — Goals, Goal Planner, Milestones, Calendar, Members, College Savings, Insurance Calc
- **Analysis** — Financial Health, Charts, Visualizations, Net Worth History, Ratios, Monte Carlo, Compare, What-If
- **Retirement** — FIRE Calculator, Income Strategies, Emergency Fund
- **Tools** — Reports, Export, Import Data, Categorize, Assistant
- **Settings** — Preferences (Theme, Currency, Date Format)

### API

57 REST API endpoints following consistent patterns:

| Category | Endpoints | Description |
|----------|-----------|-------------|
| Auth | `/api/auth/*` | Login, logout, session management |
| Data CRUD | `/api/incomes`, `/api/expenses`, `/api/loans`, `/api/accounts`, `/api/goals` | Full CRUD with scenario scoping |
| Bulk Operations | `/api/*/bulk-delete`, `/api/expenses/bulk-update` | Multi-record operations |
| Projections | `/api/projections` | Run financial engine |
| Analysis | `/api/dashboard`, `/api/cash-flow`, `/api/net-worth-history`, `/api/health-score` | Aggregated analytics |
| Visualizations | `/api/visualizations` | Sankey, heatmap, treemap data |
| Notifications | `/api/notifications` | Computed financial alerts |
| Search | `/api/search` | Cross-entity global search |
| AI | `/api/ai/chat`, `/api/ai/recommendations` | Natural language assistant |
| Export/Import | `/api/export`, `/api/import/*` | CSV data exchange |

---

## Docker Deployment

```bash
# Using Docker Compose
docker-compose up --build

# Manual build
docker build -t finatlas .
docker run -d -p 3000:3000 \
  -e AUTH_JWT_SECRET=your-secret \
  -e DATABASE_URL=file:/app/data/finatlas.db \
  -v finatlas-data:/app/data \
  finatlas
```

---

## Development

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start development server (Turbopack) |
| `pnpm build` | Production build (all packages) |
| `pnpm typecheck` | TypeScript type checking |
| `pnpm lint` | ESLint |
| `pnpm test` | Run test suite |
| `pnpm db:migrate` | Run Prisma migrations |
| `pnpm db:seed` | Seed database with demo data |
| `pnpm db:studio` | Open Prisma Studio GUI |

---

## Contributing

Contributed by **Sharanya Mattaparthy**.

---

## License

Copyright &copy; 2025 **Spaarna LLC**. All rights reserved.

This software is proprietary and confidential. Unauthorized copying, distribution, or modification of this project, via any medium, is strictly prohibited without prior written permission from Spaarna LLC.
