import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { z } from "zod";

const cloneSchema = z.object({
  sourceScenarioId: z.string().min(1),
  name: z.string().min(1).max(100),
  modifications: z
    .array(
      z.object({
        type: z.enum([
          "ADD_EXPENSE",
          "ADD_LOAN",
          "ADD_INCOME",
          "ADD_CONTRIBUTION",
          "MODIFY_INCOME",
          "MODIFY_LOAN",
        ]),
        data: z.record(z.unknown()),
      })
    )
    .optional(),
});

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = cloneSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { sourceScenarioId, name, modifications = [] } = parsed.data;

  // Fetch source scenario with all nested data
  const source = await prisma.scenario.findFirst({
    where: {
      id: sourceScenarioId,
      household: { ownerUserId: user.id },
    },
    include: {
      assumptions: true,
      taxProfile: { include: { taxRules: true } },
      incomes: true,
      expenses: true,
      accounts: { include: { holdings: true, contributions: true } },
      loans: true,
      goals: true,
      lifeEvents: true,
    },
  });

  if (!source) {
    return NextResponse.json(
      { error: "Source scenario not found or access denied" },
      { status: 404 }
    );
  }

  // Clone in a transaction
  const newScenario = await prisma.$transaction(async (tx) => {
    // Create base scenario
    const scenario = await tx.scenario.create({
      data: {
        householdId: source.householdId,
        name,
        description: `Cloned from "${source.name}"`,
        isBaseline: false,
      },
    });

    // Clone assumptions
    if (source.assumptions) {
      await tx.scenarioAssumption.create({
        data: {
          scenarioId: scenario.id,
          projectionYears: source.assumptions.projectionYears,
          inflationRate: source.assumptions.inflationRate,
          defaultGrowthRate: source.assumptions.defaultGrowthRate,
          retirementWithdrawalRate: source.assumptions.retirementWithdrawalRate,
        },
      });
    }

    // Clone tax profile + rules
    if (source.taxProfile) {
      const tp = await tx.taxProfile.create({
        data: {
          scenarioId: scenario.id,
          filingStatus: source.taxProfile.filingStatus,
          state: source.taxProfile.state,
          taxYear: source.taxProfile.taxYear,
          includePayrollTaxes: source.taxProfile.includePayrollTaxes,
          advancedOverridesEnabled: source.taxProfile.advancedOverridesEnabled,
          payrollOverrides: source.taxProfile.payrollOverrides,
        },
      });

      if (source.taxProfile.taxRules.length > 0) {
        await tx.taxRule.createMany({
          data: source.taxProfile.taxRules.map((r) => ({
            taxProfileId: tp.id,
            jurisdiction: r.jurisdiction,
            bracketStart: r.bracketStart,
            bracketEnd: r.bracketEnd,
            rate: r.rate,
          })),
        });
      }
    }

    // Clone incomes
    if (source.incomes.length > 0) {
      await tx.income.createMany({
        data: source.incomes.map((i) => ({
          scenarioId: scenario.id,
          memberId: i.memberId,
          name: i.name,
          amount: i.amount,
          frequency: i.frequency,
          startDate: i.startDate,
          endDate: i.endDate,
          growthRule: i.growthRule,
          growthRate: i.growthRate,
          isTaxable: i.isTaxable,
        })),
      });
    }

    // Clone expenses
    if (source.expenses.length > 0) {
      await tx.expense.createMany({
        data: source.expenses.map((e) => ({
          scenarioId: scenario.id,
          name: e.name,
          amount: e.amount,
          frequency: e.frequency,
          startDate: e.startDate,
          endDate: e.endDate,
          growthRule: e.growthRule,
          growthRate: e.growthRate,
          category: e.category,
          isDiscretionary: e.isDiscretionary,
        })),
      });
    }

    // Clone accounts with holdings and contributions
    for (const acc of source.accounts) {
      const newAcc = await tx.account.create({
        data: {
          scenarioId: scenario.id,
          memberId: acc.memberId,
          name: acc.name,
          type: acc.type,
          balance: acc.balance,
          growthRule: acc.growthRule,
          growthRate: acc.growthRate,
        },
      });

      if (acc.holdings.length > 0) {
        await tx.holding.createMany({
          data: acc.holdings.map((h) => ({
            accountId: newAcc.id,
            symbol: h.symbol,
            name: h.name,
            shares: h.shares,
            costBasis: h.costBasis,
          })),
        });
      }

      if (acc.contributions.length > 0) {
        await tx.contribution.createMany({
          data: acc.contributions.map((c) => ({
            accountId: newAcc.id,
            amount: c.amount,
            frequency: c.frequency,
            startDate: c.startDate,
            endDate: c.endDate,
            employerMatch: c.employerMatch,
            employerMatchLimit: c.employerMatchLimit,
          })),
        });
      }
    }

    // Clone loans
    if (source.loans.length > 0) {
      await tx.loan.createMany({
        data: source.loans.map((l) => ({
          scenarioId: scenario.id,
          memberId: l.memberId,
          name: l.name,
          type: l.type,
          principal: l.principal,
          currentBalance: l.currentBalance,
          interestRate: l.interestRate,
          monthlyPayment: l.monthlyPayment,
          startDate: l.startDate,
          termMonths: l.termMonths,
          propertyAddress: l.propertyAddress,
          propertyZipCode: l.propertyZipCode,
          propertyCity: l.propertyCity,
          propertyState: l.propertyState,
          propertyCounty: l.propertyCounty,
          propertyValue: l.propertyValue,
          annualPropertyTax: l.annualPropertyTax,
          annualHomeInsurance: l.annualHomeInsurance,
          monthlyHOAFees: l.monthlyHOAFees,
          monthlyPMI: l.monthlyPMI,
          pmiRequired: l.pmiRequired,
          insuranceProvider: l.insuranceProvider,
          hoaName: l.hoaName,
        })),
      });
    }

    // Clone goals
    if (source.goals.length > 0) {
      await tx.goal.createMany({
        data: source.goals.map((g) => ({
          scenarioId: scenario.id,
          name: g.name,
          type: g.type,
          targetAmount: g.targetAmount,
          targetDate: g.targetDate,
          priority: g.priority,
        })),
      });
    }

    // Clone life events
    if (source.lifeEvents.length > 0) {
      await tx.lifeEvent.createMany({
        data: source.lifeEvents.map((le) => ({
          scenarioId: scenario.id,
          name: le.name,
          type: le.type,
          targetDate: le.targetDate,
          description: le.description,
          color: le.color,
          icon: le.icon,
        })),
      });
    }

    // Apply modifications
    for (const mod of modifications) {
      const d = mod.data as Record<string, unknown>;
      switch (mod.type) {
        case "ADD_EXPENSE":
          await tx.expense.create({
            data: {
              scenarioId: scenario.id,
              name: d.name as string,
              amount: d.amount as number,
              frequency: (d.frequency as string) ?? "MONTHLY",
              startDate: d.startDate ? new Date(d.startDate as string) : new Date(),
              endDate: d.endDate ? new Date(d.endDate as string) : null,
              growthRule: (d.growthRule as string) ?? "INFLATION",
              category: (d.category as string) ?? null,
            },
          });
          break;

        case "ADD_LOAN":
          await tx.loan.create({
            data: {
              scenarioId: scenario.id,
              name: d.name as string,
              type: (d.type as string) ?? "OTHER",
              principal: d.principal as number,
              currentBalance: d.currentBalance as number,
              interestRate: d.interestRate as number,
              monthlyPayment: d.monthlyPayment as number,
              startDate: d.startDate ? new Date(d.startDate as string) : new Date(),
              termMonths: d.termMonths as number,
              propertyAddress: (d.propertyAddress as string) ?? null,
              propertyValue: (d.propertyValue as number) ?? null,
              annualPropertyTax: (d.annualPropertyTax as number) ?? null,
              annualHomeInsurance: (d.annualHomeInsurance as number) ?? null,
            },
          });
          break;

        case "ADD_INCOME":
          await tx.income.create({
            data: {
              scenarioId: scenario.id,
              name: d.name as string,
              amount: d.amount as number,
              frequency: (d.frequency as string) ?? "ANNUAL",
              startDate: d.startDate ? new Date(d.startDate as string) : new Date(),
              endDate: d.endDate ? new Date(d.endDate as string) : null,
              growthRule: (d.growthRule as string) ?? "NONE",
              isTaxable: (d.isTaxable as boolean) ?? true,
            },
          });
          break;

        default:
          break;
      }
    }

    return scenario;
  });

  return NextResponse.json({ scenario: newScenario }, { status: 201 });
}
