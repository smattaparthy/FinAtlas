import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { encrypt, decrypt } from "@/lib/auth/encryption";

/**
 * Safely decrypt an API key, falling back to raw value for legacy unencrypted keys.
 */
function safeDecrypt(value: string): string {
  try {
    return decrypt(value);
  } catch {
    console.warn("Failed to decrypt API key - may be a legacy unencrypted value");
    return value;
  }
}

// GET: Retrieve masked API key status
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { anthropicApiKey: true },
    });

    const hasKey = !!dbUser?.anthropicApiKey;
    let maskedKey: string | null = null;

    if (hasKey && dbUser.anthropicApiKey) {
      const decryptedKey = safeDecrypt(dbUser.anthropicApiKey);
      maskedKey = `sk-...${decryptedKey.slice(-4)}`;
    }

    return NextResponse.json({ hasKey, maskedKey });
  } catch (error) {
    console.error("Error fetching API key:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PUT: Update API key
export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { apiKey } = body;

    // Basic validation
    if (!apiKey || typeof apiKey !== "string") {
      return NextResponse.json({ error: "Invalid API key" }, { status: 400 });
    }

    // Validate it looks like an Anthropic API key
    if (!apiKey.startsWith("sk-ant-")) {
      return NextResponse.json(
        { error: "Invalid Anthropic API key format. Key should start with 'sk-ant-'" },
        { status: 400 }
      );
    }

    let encryptedKey: string;
    try {
      encryptedKey = encrypt(apiKey);
    } catch (error) {
      console.error("Encryption failed:", error);
      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { anthropicApiKey: encryptedKey },
    });

    const maskedKey = `sk-...${apiKey.slice(-4)}`;

    return NextResponse.json({
      success: true,
      maskedKey,
      message: "API key saved successfully"
    });
  } catch (error) {
    console.error("Error updating API key:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE: Remove API key
export async function DELETE() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { anthropicApiKey: null },
    });

    return NextResponse.json({
      success: true,
      message: "API key removed successfully"
    });
  } catch (error) {
    console.error("Error deleting API key:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
