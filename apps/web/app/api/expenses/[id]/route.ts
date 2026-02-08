import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import { z } from "zod";

const updateExpenseSchema = z.object({
  name: z.string().min(1, "Name is required").optional(),
  amount: z.number().positive("Amount must be positive").optional(),
  frequency: z.enum(["MONTHLY", "BIWEEKLY", "WEEKLY", "ANNUAL", "ONE_TIME"]).optional(),
  startDate: z.string().transform((s) => new Date(s)).optional(),
  endDate: z.string().nullable().optional().transform((s) => (s ? new Date(s) : null)),
  growthRule: z.enum(["NONE", "FIXED", "INFLATION", "INFLATION_PLUS"]).optional(),
  growthRate: z.number().nullable().optional(),
  category: z.string().nullable().optional(),
  isDiscretionary: z.boolean().optional(),
});

type RouteContext = { params: Promise<{ id: string }> };

// Helper to verify expense ownership
async function verifyOwnership(expenseId: string, userId: string) {
  const expense = await prisma.expense.findUnique({
    where: { id: expenseId },
    include: {
      scenario: {
        include: { household: true },
      },
    },
  });

  if (!expense) {
    return { error: "Expense not found", status: 404, expense: null };
  }

  if (expense.scenario.household.ownerUserId !== userId) {
    return { error: "Forbidden", status: 403, expense: null };
  }

  return { error: null, status: 200, expense };
}

// GET /api/expenses/[id] - Get a single expense
export async function GET(req: Request, context: RouteContext) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;
    const { error, status, expense } = await verifyOwnership(id, user.id);

    if (error) {
      return NextResponse.json({ error }, { status });
    }

    return NextResponse.json({ expense });
  } catch (error) {
    console.error("Error fetching expense:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PUT /api/expenses/[id] - Update an expense
export async function PUT(req: Request, context: RouteContext) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;
    const { error, status } = await verifyOwnership(id, user.id);

    if (error) {
      return NextResponse.json({ error }, { status });
    }

    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const parsed = updateExpenseSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const data = parsed.data;

    const expense = await prisma.expense.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.amount !== undefined && { amount: data.amount }),
        ...(data.frequency !== undefined && { frequency: data.frequency }),
        ...(data.startDate !== undefined && { startDate: data.startDate }),
        ...(data.endDate !== undefined && { endDate: data.endDate }),
        ...(data.growthRule !== undefined && { growthRule: data.growthRule }),
        ...(data.growthRate !== undefined && { growthRate: data.growthRate }),
        ...(data.category !== undefined && { category: data.category }),
        ...(data.isDiscretionary !== undefined && { isDiscretionary: data.isDiscretionary }),
      },
    });

    return NextResponse.json({ expense });
  } catch (error) {
    console.error("Error updating expense:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/expenses/[id] - Delete an expense
export async function DELETE(req: Request, context: RouteContext) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;
    const { error, status } = await verifyOwnership(id, user.id);

    if (error) {
      return NextResponse.json({ error }, { status });
    }

    await prisma.expense.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting expense:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
