import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";

type ExportType = "incomes" | "expenses" | "loans" | "accounts" | "goals";

function escapeCSVValue(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function formatDateForCSV(date: Date | string | null): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toISOString().split("T")[0]; // YYYY-MM-DD
}

function formatPercentForCSV(rate: number | null): string {
  if (rate === null) return "";
  return (rate * 100).toFixed(2);
}

async function generateIncomesCSV(scenarioId: string): Promise<string> {
  const incomes = await prisma.income.findMany({
    where: { scenarioId },
    include: { member: true },
  });

  const headers = "Name,Amount,Frequency,Member,Start Date,End Date,Taxable";
  const rows = incomes.map((income) => {
    return [
      escapeCSVValue(income.name),
      escapeCSVValue(income.amount.toString()),
      escapeCSVValue(income.frequency),
      escapeCSVValue(income.member?.name || ""),
      escapeCSVValue(formatDateForCSV(income.startDate)),
      escapeCSVValue(formatDateForCSV(income.endDate)),
      escapeCSVValue(income.isTaxable ? "Yes" : "No"),
    ].join(",");
  });

  return [headers, ...rows].join("\n");
}

async function generateExpensesCSV(scenarioId: string): Promise<string> {
  const expenses = await prisma.expense.findMany({
    where: { scenarioId },
  });

  const headers = "Name,Amount,Frequency,Category,Start Date,End Date";
  const rows = expenses.map((expense) => {
    return [
      escapeCSVValue(expense.name),
      escapeCSVValue(expense.amount.toString()),
      escapeCSVValue(expense.frequency),
      escapeCSVValue(expense.category),
      escapeCSVValue(formatDateForCSV(expense.startDate)),
      escapeCSVValue(formatDateForCSV(expense.endDate)),
    ].join(",");
  });

  return [headers, ...rows].join("\n");
}

async function generateLoansCSV(scenarioId: string): Promise<string> {
  const loans = await prisma.loan.findMany({
    where: { scenarioId },
  });

  const headers =
    "Name,Type,Principal,Current Balance,Interest Rate,Monthly Payment,Term Months,Start Date";
  const rows = loans.map((loan) => {
    return [
      escapeCSVValue(loan.name),
      escapeCSVValue(loan.type),
      escapeCSVValue(loan.principal.toString()),
      escapeCSVValue(loan.currentBalance.toString()),
      escapeCSVValue(formatPercentForCSV(loan.interestRate)),
      escapeCSVValue(loan.monthlyPayment.toString()),
      escapeCSVValue(loan.termMonths.toString()),
      escapeCSVValue(formatDateForCSV(loan.startDate)),
    ].join(",");
  });

  return [headers, ...rows].join("\n");
}

async function generateAccountsCSV(scenarioId: string): Promise<string> {
  const accounts = await prisma.account.findMany({
    where: { scenarioId },
    include: { holdings: true },
  });

  const headers = "Account Name,Type,Balance,Growth Rate,Holdings Count";
  const rows = accounts.map((account) => {
    return [
      escapeCSVValue(account.name),
      escapeCSVValue(account.type),
      escapeCSVValue(account.balance.toString()),
      escapeCSVValue(formatPercentForCSV(account.growthRate)),
      escapeCSVValue(account.holdings.length.toString()),
    ].join(",");
  });

  return [headers, ...rows].join("\n");
}

async function generateGoalsCSV(scenarioId: string): Promise<string> {
  const goals = await prisma.goal.findMany({
    where: { scenarioId },
  });

  const headers = "Name,Target Amount,Target Date,Priority";
  const rows = goals.map((goal) => {
    return [
      escapeCSVValue(goal.name),
      escapeCSVValue(goal.targetAmount.toString()),
      escapeCSVValue(formatDateForCSV(goal.targetDate)),
      escapeCSVValue(goal.priority),
    ].join(",");
  });

  return [headers, ...rows].join("\n");
}

export async function GET(request: NextRequest) {
  try {
    // Auth check
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Rate limit: 20 exports per minute to prevent abuse
    const rateLimit = checkRateLimit(`export:${user.id}`, { maxRequests: 20, windowMs: 60000 });
    if (!rateLimit.allowed) return rateLimitResponse(rateLimit);

    // Get query params
    const searchParams = request.nextUrl.searchParams;
    const scenarioId = searchParams.get("scenarioId");
    const type = searchParams.get("type") as ExportType;

    if (!scenarioId) {
      return NextResponse.json({ error: "scenarioId is required" }, { status: 400 });
    }

    if (!type || !["incomes", "expenses", "loans", "accounts", "goals"].includes(type)) {
      return NextResponse.json({ error: "Invalid type parameter" }, { status: 400 });
    }

    // Verify ownership
    const scenario = await prisma.scenario.findUnique({
      where: { id: scenarioId },
      include: { household: true },
    });

    if (!scenario || scenario.household.ownerUserId !== user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Generate CSV based on type
    let csvString: string;
    switch (type) {
      case "incomes":
        csvString = await generateIncomesCSV(scenarioId);
        break;
      case "expenses":
        csvString = await generateExpensesCSV(scenarioId);
        break;
      case "loans":
        csvString = await generateLoansCSV(scenarioId);
        break;
      case "accounts":
        csvString = await generateAccountsCSV(scenarioId);
        break;
      case "goals":
        csvString = await generateGoalsCSV(scenarioId);
        break;
      default:
        return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    }

    // Return CSV file
    return new Response(csvString, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="finatlas-${type}-${new Date().toISOString().split("T")[0]}.csv"`,
      },
    });
  } catch (error) {
    console.error("Export error:", error);
    return NextResponse.json(
      { error: "Failed to generate export" },
      { status: 500 }
    );
  }
}
