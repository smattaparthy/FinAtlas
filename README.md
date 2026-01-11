[![FinAtlas](https://img.shields.io/badge/FinAtlas-financial%20planning-blue)](https://github.com/yourusername/finatlas)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-14-black)](https://nextjs.org/)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)

# FinAtlas

A local-only, privacy-first household financial planning application with deterministic calculations, scenario comparison, and an AI-powered assistant for exploring what-if scenarios.

## Features

- **Privacy-First** - All data stored locally with SQLite, no external API calls for your financial data
- **Deterministic Projections** - No LLM computing finances — all calculations are deterministic
- **Multi-Year Planning** - Project your financial future with customizable time horizons
- **Scenario Comparison** - Create multiple scenarios (baseline, optimistic, pessimistic) and compare side-by-side
- **AI-Powered Assistant** - Natural language interface for exploring what-if scenarios
- **Comprehensive Tax Engine** - 2024 federal tax brackets with FICA and state tax calculations
- **Investment Tracking** - Multiple account types (401k, IRA, Brokerage) with holdings and contributions
- **Loan Management** - Calculate amortization schedules with support for mortgages, auto loans, and more
- **Goal Tracking** - Set and monitor progress toward retirement, education, and major purchase goals
- **Docker Deployment** - Easy containerization for local hosting

## Tech Stack

| Component | Technology |
|-----------|------------|
| Frontend | Next.js 14 (App Router), React 18, Tailwind CSS |
| Language | TypeScript 5.6 (strict mode) |
| Database | SQLite via Prisma ORM |
| Authentication | JWT with httpOnly cookies, Argon2 password hashing |
| AI Integration | Anthropic Claude API (optional, for assistant features) |
| Build System | Turborepo (monorepo) |
| Package Manager | pnpm |
| Charts | Ant Design Charts |

## Project Structure

```
finatlas/
├── apps/
│   └── web/                 # Next.js web application
│       ├── app/            # App Router pages
│       ├── components/     # React components
│       ├── contexts/       # React contexts for state
│       ├── lib/            # Utilities and helpers
│       └── prisma/         # Database schema and client
├── packages/
│   ├── engine/            # Financial calculation engine
│   │   └── src/
│   │       ├── internal/  # Core calculation modules
│   │       ├── types.ts   # TypeScript definitions
│   │       └── contract.ts # Main engine API
│   └── schemas/           # Zod validation schemas
├── docs/                  # Design documents
└── docker-compose.yml     # Docker deployment
```

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm 9.0+

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/finatlas.git
cd finatlas
```

2. Install dependencies:
```bash
pnpm install
```

3. Set up environment variables:
```bash
cp .env.example apps/web/.env
```

Edit `apps/web/.env`:
```env
# Auth
AUTH_JWT_SECRET=your-secret-key-min-32-chars-here
AUTH_COOKIE_NAME=finatlas_session

# Database
DATABASE_URL="file:./prisma/dev.db"

# Optional: Anthropic API (for AI assistant)
ANTHROPIC_API_KEY=your-anthropic-api-key
```

4. Initialize the database:
```bash
pnpm db:migrate
pnpm db:seed
```

5. Run the development server:
```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser.

## Usage

### Authentication

The default demo credentials are:
- Email: `demo@local`
- Password: `Demo1234!`

### Creating a Financial Plan

1. **Set up your household** - Add household members (you, spouse, etc.)
2. **Track your income** - Add salary, bonuses, and other income sources with growth projections
3. **Record expenses** - Track essential and discretionary spending with inflation adjustments
4. **Manage investments** - Add accounts, holdings, and contribution schedules
5. **List your loans** - Include mortgages, auto loans, student loans, etc.
6. **Set financial goals** - Define targets for retirement, education, or major purchases

### AI Assistant

Use natural language to explore scenarios:
- "What if my salary increases by $20,000 next year?"
- "Can we afford a $500,000 house?"
- "What if we have a baby and add $2,000/month in childcare?"

The AI parses your request, shows you what it understood, and lets you confirm before applying changes.

## Architecture

### Financial Engine

The core engine (`@finatlas/engine`) is deterministic and independent of the frontend:

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

console.log(result.series.netWorth);
console.log(result.warnings);
```

Key modules:
- **projection.ts** - Main month-by-month simulation loop
- **taxes.ts** - Federal + state tax calculations with 2024 brackets
- **accounts.ts** - Investment account balance tracking
- **loans.ts** - Loan amortization schedules
- **schedules.ts** - Income/expense frequency normalization
- **growth.ts** - Inflation and growth adjustments

### API Routes

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/login` | POST | User authentication |
| `/api/scenarios` | GET | List scenarios |
| `/api/scenarios/[id]/data` | GET | Get scenario data |
| `/api/incomes` | GET/POST | Income CRUD |
| `/api/expenses` | GET/POST | Expense CRUD |
| `/api/accounts` | GET/POST | Investment accounts |
| `/api/loans` | GET/POST | Loans |
| `/api/goals` | GET/POST | Financial goals |
| `/api/projections` | POST | Run projection engine |
| `/api/ai/chat` | POST | AI assistant |

## Docker Deployment

### Using Docker Compose

```bash
docker-compose up --build
```

This will:
- Build the application
- Start the web server on port 3000
- Persist data to a named volume

### Manual Docker Build

```bash
# Build the image
docker build -t finatlas .

# Run the container
docker run -d -p 3000:3000 \
  -e AUTH_JWT_SECRET=your-secret \
  -e DATABASE_URL=file:/app/data/finatlas.db \
  -v finatlas-data:/app/data \
  finatlas
```

## Development

### Available Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start development server |
| `pnpm build` | Build all packages |
| `pnpm typecheck` | Run TypeScript type checking |
| `pnpm lint` | Run ESLint |
| `pnpm test` | Run tests (when available) |
| `pnpm db:migrate` | Run database migrations |
| `pnpm db:seed` | Seed database with demo data |
| `pnpm db:studio` | Open Prisma Studio |

### Engine Testing

```bash
# Test engine locally
cd packages/engine
pnpm test
```

### API Testing

Create a household and scenario via API:
```bash
# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@local","password":"Demo1234!"}'
```

## Contributing

Contributions are welcome! Please follow these guidelines:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Code Style

- Use TypeScript strict mode
- Follow existing code structure
- Write tests for new features
- Update documentation as needed

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Built with [Next.js](https://nextjs.org/)
- Styled with [Tailwind CSS](https://tailwindcss.com/)
- Database by [Prisma](https://www.prisma.io/)
- AI powered by [Anthropic Claude](https://www.anthropic.com/)
