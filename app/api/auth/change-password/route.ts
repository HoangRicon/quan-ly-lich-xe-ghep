import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword, hashPassword } from "@/lib/password";
import { getSession, removeSession } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { currentPassword, newPassword } = await request.json();

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: "Current password and new password are required" },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: "New password must be at least 6 characters" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: session.id },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    const isValidPassword = await verifyPassword(currentPassword, user.passwordHash);
    if (!isValidPassword) {
      return NextResponse.json(
        { error: "Current password is incorrect" },
        { status: 400 }
      );
    }

    // Tăng passwordVersion để vô hiệu hóa tất cả các phiên cũ
    const passwordHash = await hashPassword(newPassword);
    
    // Lấy passwordVersion hiện tại và tăng lên 1
    const currentUser = await prisma.user.findUnique({
      where: { id: session.id },
      select: { passwordVersion: true },
    });
    
    const newPasswordVersion = (currentUser?.passwordVersion || 0) + 1;
    
    await prisma.user.update({
      where: { id: session.id },
      data: { 
        passwordHash,
        passwordVersion: newPasswordVersion,
      },
    });

    // Xóa session hiện tại
    await removeSession();

    return NextResponse.json({
      success: true,
      message: "Password changed successfully. Please login again with your new password.",
      requireRelogin: true,
    });
  } catch (error) {
    console.error("Change password error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
