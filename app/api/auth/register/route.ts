import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { setSession, type UserPayload } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const { email, password, fullName } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "User with this email already exists" },
        { status: 409 }
      );
    }

    // Create a new account for the user
    const slug = email.split("@")[0].replace(/[^a-zA-Z0-9]/g, "-") + "-" + Date.now();
    const account = await prisma.account.create({
      data: {
        name: fullName || email.split("@")[0],
        slug,
      },
    });

    // Hash password and create user with the new account
    const passwordHash = await hashPassword(password);
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        fullName: fullName || email.split("@")[0],
        role: "user",
        accountId: account.id,
      },
    });

    const userPayload: UserPayload = {
      id: user.id,
      email: user.email,
      fullName: user.fullName || "",
      role: user.role,
      passwordVersion: user.passwordVersion,
      accountId: user.accountId,
    };

    await setSession(userPayload);

    return NextResponse.json({
      success: true,
      user: userPayload,
      accountId: user.accountId,
    });
  } catch (error) {
    console.error("Register error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
