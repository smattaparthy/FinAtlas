import {
  PrismaClient,
  UserRole,
  FilingStatus,
  Frequency,
  GrowthRule,
  AccountType,
  LoanType,
  GoalType,
} from "@prisma/client";
import { hashPassword } from "../lib/auth/password";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Clean existing data
  await prisma.user.deleteMany();

  // Create demo user
  const passwordHash = await hashPassword("Demo1234!");
  const user = await prisma.user.create({
    data: {
      email: "demo@local",
      passwordHash,
      role: UserRole.USER,
    },
  });
  console.log("✅ Created demo user:", user.email);

  // Create household with required date fields
  const startDate = new Date("2024-01-01");
  const endDate = new Date("2060-12-31");

  const household = await prisma.household.create({
    data: {
      name: "Demo Family",
      ownerUserId: user.id,
      startDate,
      endDate,
    },
  });
  console.log("✅ Created household:", household.name);

  // Create household members
  const member1 = await prisma.householdMember.create({
    data: {
      householdId: household.id,
      name: "Alex Demo",
      roleTag: "Primary Earner",
    },
  });

  const member2 = await prisma.householdMember.create({
    data: {
      householdId: household.id,
      name: "Jordan Demo",
      roleTag: "Secondary Earner",
    },
  });
  console.log("✅ Created household members");

  // Create scenario
  const scenario = await prisma.scenario.create({
    data: {
      householdId: household.id,
      name: "Base Case",
      isBaseline: true,
    },
  });
  console.log("✅ Created scenario:", scenario.name);

  // Create scenario assumptions
  await prisma.scenarioAssumption.create({
    data: {
      scenarioId: scenario.id,
      inflationRatePct: 3.0,
      taxableInterestYieldPct: 1.5,
      taxableDividendYieldPct: 1.8,
      realizedStGainPct: 2.0,
      realizedLtGainPct: 4.0,
    },
  });
  console.log("✅ Created scenario assumptions");

  // Create tax profile
  await prisma.taxProfile.create({
    data: {
      scenarioId: scenario.id,
      stateCode: "CA",
      filingStatus: FilingStatus.MFJ,
      taxYear: 2024,
      includePayrollTaxes: true,
      advancedOverridesEnabled: false,
    },
  });
  console.log("✅ Created tax profile");

  // Create incomes
  await prisma.income.createMany({
    data: [
      {
        scenarioId: scenario.id,
        memberId: member1.id,
        name: "Software Engineer Salary",
        amount: 150000,
        frequency: Frequency.ANNUAL,
        growthRule: GrowthRule.TRACK_INFLATION,
        growthPct: 2.0,
        startDate: new Date("2024-01-01"),
        endDate: new Date("2050-06-15"),
      },
      {
        scenarioId: scenario.id,
        memberId: member2.id,
        name: "Product Manager Salary",
        amount: 130000,
        frequency: Frequency.ANNUAL,
        growthRule: GrowthRule.TRACK_INFLATION,
        growthPct: 2.0,
        startDate: new Date("2024-01-01"),
        endDate: new Date("2052-03-22"),
      },
      {
        scenarioId: scenario.id,
        memberId: member1.id,
        name: "Rental Income",
        amount: 2500,
        frequency: Frequency.MONTHLY,
        growthRule: GrowthRule.TRACK_INFLATION,
        startDate: new Date("2024-01-01"),
      },
    ],
  });
  console.log("✅ Created incomes");

  // Create expenses
  await prisma.expense.createMany({
    data: [
      {
        scenarioId: scenario.id,
        name: "Mortgage Payment",
        category: "Housing",
        amount: 3500,
        frequency: Frequency.MONTHLY,
        growthRule: GrowthRule.NONE,
        startDate: new Date("2024-01-01"),
        endDate: new Date("2044-01-01"),
        isEssential: true,
      },
      {
        scenarioId: scenario.id,
        name: "Property Tax",
        category: "Housing",
        amount: 12000,
        frequency: Frequency.ANNUAL,
        growthRule: GrowthRule.TRACK_INFLATION,
        startDate: new Date("2024-01-01"),
        isEssential: true,
      },
      {
        scenarioId: scenario.id,
        name: "Groceries",
        category: "Food",
        amount: 1200,
        frequency: Frequency.MONTHLY,
        growthRule: GrowthRule.TRACK_INFLATION,
        startDate: new Date("2024-01-01"),
        isEssential: true,
      },
      {
        scenarioId: scenario.id,
        name: "Utilities",
        category: "Housing",
        amount: 400,
        frequency: Frequency.MONTHLY,
        growthRule: GrowthRule.TRACK_INFLATION,
        startDate: new Date("2024-01-01"),
        isEssential: true,
      },
      {
        scenarioId: scenario.id,
        name: "Travel & Entertainment",
        category: "Discretionary",
        amount: 800,
        frequency: Frequency.MONTHLY,
        growthRule: GrowthRule.TRACK_INFLATION,
        startDate: new Date("2024-01-01"),
        isEssential: false,
      },
    ],
  });
  console.log("✅ Created expenses");

  // Create accounts
  const account401k1 = await prisma.account.create({
    data: {
      scenarioId: scenario.id,
      name: "Alex 401(k)",
      type: AccountType.TRADITIONAL,
      expectedReturnPct: 7.0,
    },
  });

  const account401k2 = await prisma.account.create({
    data: {
      scenarioId: scenario.id,
      name: "Jordan 401(k)",
      type: AccountType.TRADITIONAL,
      expectedReturnPct: 7.0,
    },
  });

  const rothIra = await prisma.account.create({
    data: {
      scenarioId: scenario.id,
      name: "Alex Roth IRA",
      type: AccountType.ROTH,
      expectedReturnPct: 7.0,
    },
  });

  const brokerage = await prisma.account.create({
    data: {
      scenarioId: scenario.id,
      name: "Joint Brokerage",
      type: AccountType.TAXABLE,
      expectedReturnPct: 6.0,
    },
  });

  const savings = await prisma.account.create({
    data: {
      scenarioId: scenario.id,
      name: "Emergency Fund",
      type: AccountType.TAXABLE,
      expectedReturnPct: 4.5,
    },
  });
  console.log("✅ Created accounts");

  // Create holdings
  await prisma.holding.createMany({
    data: [
      {
        accountId: account401k1.id,
        ticker: "VTI",
        shares: 800,
        avgPrice: 200,
      },
      {
        accountId: account401k1.id,
        ticker: "VXUS",
        shares: 500,
        avgPrice: 60,
      },
      {
        accountId: brokerage.id,
        ticker: "VOO",
        shares: 200,
        avgPrice: 400,
      },
      {
        accountId: brokerage.id,
        ticker: "BND",
        shares: 300,
        avgPrice: 80,
      },
      {
        accountId: savings.id,
        ticker: "CASH",
        shares: 50000,
        avgPrice: 1,
      },
    ],
  });
  console.log("✅ Created holdings");

  // Create contributions
  await prisma.contribution.createMany({
    data: [
      {
        scenarioId: scenario.id,
        accountId: account401k1.id,
        amountMonthly: 1916.67, // ~23000/year
        startDate: new Date("2024-01-01"),
        endDate: new Date("2050-06-15"),
        escalationPct: 3.0,
      },
      {
        scenarioId: scenario.id,
        accountId: account401k2.id,
        amountMonthly: 1916.67, // ~23000/year
        startDate: new Date("2024-01-01"),
        endDate: new Date("2052-03-22"),
        escalationPct: 3.0,
      },
      {
        scenarioId: scenario.id,
        accountId: rothIra.id,
        amountMonthly: 583.33, // ~7000/year
        startDate: new Date("2024-01-01"),
        endDate: new Date("2050-06-15"),
      },
    ],
  });
  console.log("✅ Created contributions");

  // Create loans
  await prisma.loan.createMany({
    data: [
      {
        scenarioId: scenario.id,
        name: "Car Loan",
        type: LoanType.AUTO,
        principal: 35000,
        aprPct: 4.9,
        termMonths: 60,
        startDate: new Date("2022-06-01"),
        paymentOverrideMonthly: 650,
      },
      {
        scenarioId: scenario.id,
        name: "Student Loan",
        type: LoanType.STUDENT,
        principal: 25000,
        aprPct: 5.5,
        termMonths: 120,
        startDate: new Date("2020-01-01"),
      },
    ],
  });
  console.log("✅ Created loans");

  // Create goals
  await prisma.goal.createMany({
    data: [
      {
        scenarioId: scenario.id,
        name: "Retirement",
        type: GoalType.RETIREMENT,
        targetAmountReal: 3000000,
        targetDate: new Date("2050-06-15"),
        priority: 1,
      },
      {
        scenarioId: scenario.id,
        name: "College Fund - Child 1",
        type: GoalType.COLLEGE,
        targetAmountReal: 150000,
        targetDate: new Date("2038-09-01"),
        priority: 2,
      },
      {
        scenarioId: scenario.id,
        name: "Beach House Down Payment",
        type: GoalType.HOME_PURCHASE,
        targetAmountReal: 200000,
        targetDate: new Date("2035-01-01"),
        priority: 3,
      },
    ],
  });
  console.log("✅ Created goals");

  console.log("🎉 Database seeding completed!");
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
