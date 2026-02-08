import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import {
  calculateBracketTax,
  calculatePayrollTax,
  getStandardDeduction,
  getDefaultFederalBrackets,
  TaxBracket,
} from "@/lib/tax/taxCalculations";

const FREQUENCY_MULTIPLIERS: Record<string, number> = {
  ANNUAL: 1,
  MONTHLY: 12,
  BIWEEKLY: 26,
  WEEKLY: 52,
  ONE_TIME: 0,
};

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const scenarioId = searchParams.get("scenarioId");

    if (!scenarioId) {
      return NextResponse.json(
        { error: "scenarioId is required" },
        { status: 400 }
      );
    }

    const scenario = await prisma.scenario.findFirst({
      where: {
        id: scenarioId,
        household: { ownerUserId: user.id },
      },
    });

    if (!scenario) {
      return NextResponse.json(
        { error: "Scenario not found" },
        { status: 404 }
      );
    }

    const [taxProfile, incomes] = await Promise.all([
      prisma.taxProfile.findUnique({
        where: { scenarioId },
        include: { taxRules: true },
      }),
      prisma.income.findMany({
        where: { scenarioId, isTaxable: true },
        select: { amount: true, frequency: true },
      }),
    ]);

    const grossIncome = incomes.reduce((total, income) => {
      const multiplier = FREQUENCY_MULTIPLIERS[income.frequency] ?? 1;
      return total + income.amount * multiplier;
    }, 0);

    const filingStatus = taxProfile?.filingStatus ?? "SINGLE";
    const includePayrollTaxes = taxProfile?.includePayrollTaxes ?? true;
    const state = taxProfile?.state ?? null;
    const taxYear = taxProfile?.taxYear ?? 2024;

    const standardDeduction = getStandardDeduction(filingStatus);
    const taxableIncome = Math.max(0, grossIncome - standardDeduction);

    const taxRules = taxProfile?.taxRules ?? [];
    const federalRulesData = taxRules.filter(
      (r) => r.jurisdiction === "FEDERAL"
    );
    const stateRulesData = taxRules.filter((r) => r.jurisdiction === "STATE");

    const federalBrackets: TaxBracket[] =
      federalRulesData.length > 0
        ? federalRulesData.map((r) => ({
            bracketStart: r.bracketStart,
            bracketEnd: r.bracketEnd,
            rate: r.rate,
          }))
        : getDefaultFederalBrackets();

    const stateBrackets: TaxBracket[] | null =
      stateRulesData.length > 0
        ? stateRulesData.map((r) => ({
            bracketStart: r.bracketStart,
            bracketEnd: r.bracketEnd,
            rate: r.rate,
          }))
        : null;

    const federalTax = calculateBracketTax(taxableIncome, federalBrackets);
    const stateTax = stateBrackets
      ? calculateBracketTax(taxableIncome, stateBrackets)
      : null;
    const payrollTax = includePayrollTaxes
      ? calculatePayrollTax(grossIncome)
      : null;

    const totalTax =
      federalTax.totalTax +
      (stateTax?.totalTax ?? 0) +
      (payrollTax?.total ?? 0);

    const takeHomePay = grossIncome - totalTax;
    const effectiveRate = grossIncome > 0 ? totalTax / grossIncome : 0;

    return NextResponse.json({
      grossIncome,
      standardDeduction,
      taxableIncome,
      federalTax,
      stateTax,
      payrollTax,
      totalTax,
      takeHomePay,
      effectiveRate,
      taxProfile: {
        filingStatus,
        state,
        taxYear,
        includePayrollTaxes,
      },
    });
  } catch (error) {
    console.error("Tax estimation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
