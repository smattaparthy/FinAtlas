# GitHub Actions CI/CD Workflows

## Overview
Two workflows have been configured for the FinAtlas monorepo:

### 1. CI Workflow (`ci.yml`)
**Triggers:**
- Push to `main` branch
- Pull requests to `main` branch

**Steps:**
1. Checkout code
2. Setup Node.js 22 and pnpm 9
3. Cache pnpm store and Next.js build cache
4. Install dependencies with frozen lockfile
5. Generate Prisma client
6. Typecheck engine package
7. Typecheck web app
8. Run engine tests (Vitest)
9. Run web tests (Vitest)
10. Build web app for production

**Environment Variables:**
- `DATABASE_URL`: SQLite in-memory database for CI
- `AUTH_JWT_SECRET`: Dummy secret for CI testing
- `AUTH_COOKIE_NAME`: Session cookie name

**Optimizations:**
- Concurrency groups cancel in-progress runs on same branch
- pnpm store caching for faster dependency installation
- Next.js build cache for faster rebuilds
- 15-minute timeout to prevent runaway jobs

### 2. PR Check Workflow (`pr-check.yml`)
**Triggers:**
- Pull requests to `main` branch only

**Purpose:**
Lightweight check that runs faster than full CI by:
- Running typechecks on all packages
- Running all tests
- Skipping the production build (saves ~2-3 minutes)

**Steps:**
1. Checkout code
2. Setup Node.js 22 and pnpm 9
3. Cache pnpm store
4. Install dependencies
5. Generate Prisma client
6. Typecheck all packages using turbo
7. Run all tests using turbo

**Optimizations:**
- 10-minute timeout (faster than full CI)
- No build step to save CI minutes
- Uses turbo for parallel execution

## Usage

### Viewing Results
- Check the "Actions" tab in GitHub to see workflow runs
- Failed checks will block PR merges (if branch protection is enabled)
- Each step shows detailed logs for debugging

### Local Testing
Run the same checks locally before pushing:
```bash
# Generate Prisma client
cd apps/web && npx prisma generate

# Typecheck
pnpm typecheck

# Run tests
pnpm test

# Build (full CI only)
pnpm build
```

### Troubleshooting
If CI fails:
1. Check the failed step logs in GitHub Actions
2. Run the same command locally to reproduce
3. Common issues:
   - Type errors: Run `pnpm typecheck` locally
   - Test failures: Run `pnpm test` locally
   - Build errors: Run `pnpm build` locally
   - Dependency issues: Delete `node_modules` and run `pnpm install --frozen-lockfile`

## Future Enhancements
Consider adding:
- Deployment workflow for staging/production
- Dependency security scanning (Snyk, Dependabot)
- Code coverage reports
- Performance benchmarking
- E2E tests with Playwright
- Docker image building and publishing
