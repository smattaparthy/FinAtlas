import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { z } from "zod";

const createAccountSchema = z.object({
  scenarioId: z.string().min(1),
  memberId: z.string().nullable().optional(),
  name: z.string().min(1).max(100),
  type: z.string().min(1),
  balance: z.number().min(0),
  growthRule: z.string().optional().default("MARKET"),
  growthRate: z.number().optional().nullable(),
});

// GET /api/accounts - List accounts for a scenario
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const scenarioId = req.nextUrl.searchParams.get("scenarioId");
    if (!scenarioId) {
      return NextResponse.json({ error: "scenarioId is required" }, { status: 400 });
    }

    // Verify user owns the scenario through household
    const scenario = await prisma.scenario.findFirst({
      where: {
        id: scenarioId,
        household: { ownerUserId: user.id },
      },
    });

    if (!scenario) {
      return NextResponse.json({ error: "Scenario not found" }, { status: 404 });
    }

    const accounts = await prisma.account.findMany({
      where: { scenarioId },
      include: {
        holdings: true,
        contributions: true,
        member: {
          select: { id: true, name: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ accounts });
  } catch (error) {
    console.error("Error fetching accounts:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/accounts - Create a new account
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = createAccountSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // Verify user owns the scenario through household
    const scenario = await prisma.scenario.findFirst({
      where: {
        id: data.scenarioId,
        household: { ownerUserId: user.id },
      },
    });

    if (!scenario) {
      return NextResponse.json({ error: "Scenario not found" }, { status: 404 });
    }

    // Verify member belongs to the household if provided
    if (data.memberId) {
      const member = await prisma.householdMember.findFirst({
        where: {
          id: data.memberId,
          householdId: scenario.householdId,
        },
      });

      if (!member) {
        return NextResponse.json({ error: "Member not found in household" }, { status: 404 });
      }
    }

    const account = await prisma.account.create({
      data: {
        scenarioId: data.scenarioId,
        memberId: data.memberId || null,
        name: data.name,
        type: data.type,
        balance: data.balance ?? 0,
        growthRule: data.growthRule ?? "FIXED",
        growthRate: data.growthRate ?? null,
      },
      include: {
        holdings: true,
        contributions: true,
        member: {
          select: { id: true, name: true },
        },
      },
    });

    return NextResponse.json({ account }, { status: 201 });
  } catch (error) {
    console.error("Error creating account:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
