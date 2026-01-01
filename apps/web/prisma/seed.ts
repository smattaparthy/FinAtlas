import { PrismaClient } from "@prisma/client";
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
      name: "Demo User",
      role: "USER",
    },
  });
  console.log("✅ Created demo user:", user.email);

  // Create household
  const household = await prisma.household.create({
    data: {
      name: "Demo Family",
      ownerUserId: user.id,
    },
  });
  console.log("✅ Created household:", household.name);

  // Create household members
  const member1 = await prisma.householdMember.create({
    data: {
      householdId: household.id,
      name: "Alex Demo",
      birthDate: new Date("1985-06-15"),
      retirementAge: 65,
    },
  });

  const member2 = await prisma.householdMember.create({
    data: {
      householdId: household.id,
      name: "Jordan Demo",
      birthDate: new Date("1987-03-22"),
      retirementAge: 65,
    },
  });
  console.log("✅ Created household members");

  // Create scenario
  const scenario = await prisma.scenario.create({
    data: {
      householdId: household.id,
      name: "Base Case",
      description: "Current trajectory with moderate assumptions",
      isBaseline: true,
    },
  });
  console.log("✅ Created scenario:", scenario.name);

  // Create scenario assumptions
  await prisma.scenarioAssumption.create({
    data: {
      scenarioId: scenario.id,
      projectionYears: 30,
      inflationRate: 0.025,
      defaultGrowthRate: 0.07,
      retirementWithdrawalRate: 0.04,
    },
  });
  console.log("✅ Created scenario assumptions");

  // Create tax profile
  const taxProfile = await prisma.taxProfile.create({
    data: {
      scenarioId: scenario.id,
      filingStatus: "MFJ",
      state: "CA",
    },
  });

  // Create tax rules
  await prisma.taxRule.createMany({
    data: [
      {
        taxProfileId: taxProfile.id,
        jurisdiction: "FEDERAL",
        bracketStart: 0,
        bracketEnd: 22000,
        rate: 0.10,
      },
      {
        taxProfileId: taxProfile.id,
        jurisdiction: "FEDERAL",
        bracketStart: 22000,
        bracketEnd: 89450,
        rate: 0.12,
      },
      {
        taxProfileId: taxProfile.id,
        jurisdiction: "FEDERAL",
        bracketStart: 89450,
        bracketEnd: 190750,
        rate: 0.22,
      },
      {
        taxProfileId: taxProfile.id,
        jurisdiction: "STATE",
        bracketStart: 0,
        bracketEnd: 20198,
        rate: 0.01,
      },
      {
        taxProfileId: taxProfile.id,
        jurisdiction: "STATE",
        bracketStart: 20198,
        bracketEnd: 47884,
        rate: 0.02,
      },
    ],
  });
  console.log("✅ Created tax profile and rules");

  // Create incomes
  await prisma.income.createMany({
    data: [
      {
        scenarioId: scenario.id,
        memberId: member1.id,
        name: "Software Engineer Salary",
        amount: 150000,
        frequency: "ANNUAL",
        growthRule: "INFLATION_PLUS",
        growthRate: 0.02,
        startDate: new Date("2024-01-01"),
        endDate: new Date("2050-06-15"),
        isTaxable: true,
      },
      {
        scenarioId: scenario.id,
        memberId: member2.id,
        name: "Product Manager Salary",
        amount: 130000,
        frequency: "ANNUAL",
        growthRule: "INFLATION_PLUS",
        growthRate: 0.02,
        startDate: new Date("2024-01-01"),
        endDate: new Date("2052-03-22"),
        isTaxable: true,
      },
      {
        scenarioId: scenario.id,
        memberId: member1.id,
        name: "Rental Income",
        amount: 2500,
        frequency: "MONTHLY",
        growthRule: "INFLATION",
        startDate: new Date("2024-01-01"),
        isTaxable: true,
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
        amount: 3500,
        frequency: "MONTHLY",
        growthRule: "FIXED",
        startDate: new Date("2024-01-01"),
        endDate: new Date("2044-01-01"),
        category: "Housing",
        isDiscretionary: false,
      },
      {
        scenarioId: scenario.id,
        name: "Property Tax",
        amount: 12000,
        frequency: "ANNUAL",
        growthRule: "INFLATION",
        startDate: new Date("2024-01-01"),
        category: "Housing",
        isDiscretionary: false,
      },
      {
        scenarioId: scenario.id,
        name: "Groceries",
        amount: 1200,
        frequency: "MONTHLY",
        growthRule: "INFLATION",
        startDate: new Date("2024-01-01"),
        category: "Food",
        isDiscretionary: false,
      },
      {
        scenarioId: scenario.id,
        name: "Utilities",
        amount: 400,
        frequency: "MONTHLY",
        growthRule: "INFLATION",
        startDate: new Date("2024-01-01"),
        category: "Housing",
        isDiscretionary: false,
      },
      {
        scenarioId: scenario.id,
        name: "Travel & Entertainment",
        amount: 800,
        frequency: "MONTHLY",
        growthRule: "INFLATION",
        startDate: new Date("2024-01-01"),
        category: "Discretionary",
        isDiscretionary: true,
      },
    ],
  });
  console.log("✅ Created expenses");

  // Create accounts
  const account401k1 = await prisma.account.create({
    data: {
      scenarioId: scenario.id,
      memberId: member1.id,
      name: "Alex 401(k)",
      type: "TRADITIONAL_401K",
      balance: 250000,
      growthRule: "FIXED",
      growthRate: 0.07,
    },
  });

  const account401k2 = await prisma.account.create({
    data: {
      scenarioId: scenario.id,
      memberId: member2.id,
      name: "Jordan 401(k)",
      type: "TRADITIONAL_401K",
      balance: 180000,
      growthRule: "FIXED",
      growthRate: 0.07,
    },
  });

  const rothIra = await prisma.account.create({
    data: {
      scenarioId: scenario.id,
      memberId: member1.id,
      name: "Alex Roth IRA",
      type: "ROTH_IRA",
      balance: 75000,
      growthRule: "FIXED",
      growthRate: 0.07,
    },
  });

  const brokerage = await prisma.account.create({
    data: {
      scenarioId: scenario.id,
      name: "Joint Brokerage",
      type: "BROKERAGE",
      balance: 150000,
      growthRule: "FIXED",
      growthRate: 0.06,
    },
  });

  const savings = await prisma.account.create({
    data: {
      scenarioId: scenario.id,
      name: "Emergency Fund",
      type: "SAVINGS",
      balance: 50000,
      growthRule: "FIXED",
      growthRate: 0.045,
    },
  });
  console.log("✅ Created accounts");

  // Create holdings
  await prisma.holding.createMany({
    data: [
      {
        accountId: account401k1.id,
        symbol: "VTI",
        name: "Vanguard Total Stock Market ETF",
        shares: 800,
        costBasis: 160000,
      },
      {
        accountId: account401k1.id,
        symbol: "VXUS",
        name: "Vanguard Total International Stock ETF",
        shares: 500,
        costBasis: 30000,
      },
      {
        accountId: brokerage.id,
        symbol: "VOO",
        name: "Vanguard S&P 500 ETF",
        shares: 200,
        costBasis: 80000,
      },
      {
        accountId: brokerage.id,
        symbol: "BND",
        name: "Vanguard Total Bond Market ETF",
        shares: 300,
        costBasis: 24000,
      },
    ],
  });
  console.log("✅ Created holdings");

  // Create contributions
  await prisma.contribution.createMany({
    data: [
      {
        accountId: account401k1.id,
        amount: 23000,
        frequency: "ANNUAL",
        startDate: new Date("2024-01-01"),
        endDate: new Date("2050-06-15"),
        employerMatch: 0.06,
        employerMatchLimit: 9000,
      },
      {
        accountId: account401k2.id,
        amount: 23000,
        frequency: "ANNUAL",
        startDate: new Date("2024-01-01"),
        endDate: new Date("2052-03-22"),
        employerMatch: 0.04,
        employerMatchLimit: 5200,
      },
      {
        accountId: rothIra.id,
        amount: 7000,
        frequency: "ANNUAL",
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
        name: "Home Mortgage",
        type: "MORTGAGE",
        principal: 450000,
        currentBalance: 380000,
        interestRate: 0.0375,
        monthlyPayment: 3500,
        startDate: new Date("2020-03-01"),
        termMonths: 360,
      },
      {
        scenarioId: scenario.id,
        memberId: member2.id,
        name: "Car Loan",
        type: "AUTO",
        principal: 35000,
        currentBalance: 18000,
        interestRate: 0.049,
        monthlyPayment: 650,
        startDate: new Date("2022-06-01"),
        termMonths: 60,
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
        type: "RETIREMENT",
        targetAmount: 3000000,
        targetDate: new Date("2050-06-15"),
        priority: 1,
      },
      {
        scenarioId: scenario.id,
        name: "College Fund - Child 1",
        type: "EDUCATION",
        targetAmount: 150000,
        targetDate: new Date("2038-09-01"),
        priority: 2,
      },
      {
        scenarioId: scenario.id,
        name: "Beach House Down Payment",
        type: "MAJOR_PURCHASE",
        targetAmount: 200000,
        targetDate: new Date("2035-01-01"),
        priority: 3,
      },
      {
        scenarioId: scenario.id,
        name: "Emergency Fund Target",
        type: "EMERGENCY_FUND",
        targetAmount: 100000,
        priority: 1,
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
