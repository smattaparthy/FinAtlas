import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { renderToBuffer } from "@react-pdf/renderer";
import { PdfReportDocument } from "@/components/reports/PdfReportDocument";

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { scenarioId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { scenarioId } = body;
  if (!scenarioId) {
    return NextResponse.json(
      { error: "scenarioId is required" },
      { status: 400 }
    );
  }

  try {
    // Verify scenario belongs to user's household
    const scenario = await prisma.scenario.findUnique({
      where: { id: scenarioId },
      include: { household: true },
    });

    if (!scenario || scenario.household.ownerUserId !== user.id) {
      return NextResponse.json(
        { error: "Scenario not found or access denied" },
        { status: 404 }
      );
    }

    // Fetch all financial data in parallel
    const [incomes, expenses, accounts, loans, goals] = await Promise.all([
      prisma.income.findMany({ where: { scenarioId } }),
      prisma.expense.findMany({ where: { scenarioId } }),
      prisma.account.findMany({ where: { scenarioId } }),
      prisma.loan.findMany({ where: { scenarioId } }),
      prisma.goal.findMany({ where: { scenarioId } }),
    ]);

    // Calculate annualized totals
    const FREQ: Record<string, number> = {
      ANNUAL: 1,
      MONTHLY: 12,
      BIWEEKLY: 26,
      WEEKLY: 52,
      ONE_TIME: 0,
    };

    const totalIncome = incomes.reduce(
      (sum, i) => sum + i.amount * (FREQ[i.frequency] || 0),
      0
    );
    const totalExpenses = expenses.reduce(
      (sum, e) => sum + e.amount * (FREQ[e.frequency] || 0),
      0
    );
    const totalAssets = accounts.reduce((sum, a) => sum + a.balance, 0);
    const totalDebt = loans.reduce((sum, l) => sum + l.currentBalance, 0);
    const netWorth = totalAssets - totalDebt;
    const netSavings = totalIncome - totalExpenses;

    // Simple projection: grow net worth by 6% annually for 20 years
    const projection = Array.from({ length: 20 }, (_, i) => ({
      year: new Date().getFullYear() + i + 1,
      netWorth:
        netWorth +
        netSavings * (i + 1) +
        totalAssets * (Math.pow(1.06, i + 1) - 1),
    }));

    // Health score computation
    const savingsRate =
      totalIncome > 0 ? (netSavings / totalIncome) * 100 : 0;
    const savingsScore =
      savingsRate >= 20
        ? 100
        : savingsRate >= 15
          ? 80
          : savingsRate >= 10
            ? 60
            : savingsRate >= 5
              ? 40
              : 20;

    const annualDebt = loans.reduce(
      (sum, l) => sum + l.monthlyPayment * 12,
      0
    );
    const dti = totalIncome > 0 ? (annualDebt / totalIncome) * 100 : 0;
    const dtiScore =
      dti < 15 ? 100 : dti < 28 ? 70 : dti < 36 ? 50 : dti < 50 ? 30 : 10;

    const monthlyExpenses = totalExpenses / 12;
    const emergencyMonths =
      monthlyExpenses > 0 ? totalAssets / monthlyExpenses : 0;
    const emergencyScore =
      emergencyMonths >= 9
        ? 100
        : emergencyMonths >= 6
          ? 80
          : emergencyMonths >= 3
            ? 60
            : emergencyMonths >= 1
              ? 30
              : 10;

    const retirementTarget = totalExpenses * 25;
    const retirementProgress =
      retirementTarget > 0 ? (netWorth / retirementTarget) * 100 : 0;
    const retirementScore =
      retirementProgress >= 100
        ? 100
        : retirementProgress >= 75
          ? 80
          : retirementProgress >= 50
            ? 60
            : retirementProgress >= 25
              ? 40
              : 20;

    const growthScore = 60; // simplified

    const overall = Math.round(
      savingsScore * 0.25 +
        dtiScore * 0.2 +
        emergencyScore * 0.2 +
        retirementScore * 0.2 +
        growthScore * 0.15
    );

    const healthScore = {
      overall,
      components: [
        {
          name: "Savings Rate",
          score: savingsScore,
          description: `${savingsRate.toFixed(1)}% of income`,
        },
        {
          name: "Debt-to-Income",
          score: dtiScore,
          description: `${dti.toFixed(1)}% DTI ratio`,
        },
        {
          name: "Emergency Fund",
          score: emergencyScore,
          description: `${emergencyMonths.toFixed(1)} months covered`,
        },
        {
          name: "Retirement Readiness",
          score: retirementScore,
          description: `${retirementProgress.toFixed(0)}% of target`,
        },
        {
          name: "NW Growth",
          score: growthScore,
          description: "Growth trajectory",
        },
      ],
      insights: [] as Array<{ type: string; title: string; description: string }>,
    };

    // Generate insights
    if (savingsScore < 60) {
      healthScore.insights.push({
        type: "warning",
        title: "Low Savings Rate",
        description:
          "Consider reducing discretionary spending to boost your savings rate.",
      });
    }
    if (dtiScore < 50) {
      healthScore.insights.push({
        type: "warning",
        title: "High Debt Load",
        description:
          "Focus on paying down high-interest debt to improve your financial health.",
      });
    }
    if (emergencyScore >= 80) {
      healthScore.insights.push({
        type: "positive",
        title: "Strong Emergency Fund",
        description: "Your emergency fund covers 6+ months of expenses.",
      });
    }
    if (overall >= 70) {
      healthScore.insights.push({
        type: "positive",
        title: "Good Financial Health",
        description: "Your overall financial position is solid.",
      });
    }

    // Render the PDF
    const buffer = await renderToBuffer(
      <PdfReportDocument
        dashboard={{
          totalIncome,
          totalExpenses,
          netSavings,
          totalAssets,
          totalDebt,
          netWorth,
        }}
        healthScore={healthScore}
        goals={goals.map((g) => ({
          name: g.name,
          type: g.type,
          targetAmount: g.targetAmount,
          targetDate: g.targetDate?.toISOString() ?? null,
          priority: g.priority,
        }))}
        projection={projection}
        scenarioName={scenario.name}
        generatedDate={new Date().toLocaleDateString()}
      />
    );

    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="FinAtlas-Report-${new Date().toISOString().split("T")[0]}.pdf"`,
      },
    });
  } catch (error) {
    console.error("PDF generation failed:", error);
    return NextResponse.json(
      { error: "Failed to generate PDF report" },
      { status: 500 }
    );
  }
}
