import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Use Web Crypto API for token generation (works in both edge and Node.js)
function generateToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User with this email does not exist" },
        { status: 404 }
      );
    }

    const existingTokens = await prisma.passwordReset.findMany({
      where: {
        email,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
    });

    if (existingTokens.length > 0) {
      return NextResponse.json(
        { error: "A reset email has already been sent. Please check your inbox or wait 15 minutes." },
        { status: 429 }
      );
    }

    const token = generateToken();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    await prisma.passwordReset.create({
      data: {
        email,
        token,
        expiresAt,
      },
    });

    const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/auth/reset-password?token=${token}`;

    console.log("=== PASSWORD RESET LINK ===");
    console.log(`Email: ${email}`);
    console.log(`Reset URL: ${resetUrl}`);
    console.log("===========================");

    return NextResponse.json({
      success: true,
      message: "Password reset link has been sent to your email",
      debugResetUrl: process.env.NODE_ENV === "development" ? resetUrl : undefined,
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
