import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { hashPassword } from "@/lib/password";

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      accountName,
      accountSlug,
      userEmail,
      userPassword,
      userFullName,
      userRole,
    } = body;

    if (!accountName?.trim() || !accountSlug?.trim()) {
      return NextResponse.json(
        { error: "Tên tài khoản và slug là bắt buộc." },
        { status: 400 }
      );
    }

    if (!userEmail?.trim() || !userPassword) {
      return NextResponse.json(
        { error: "Email và mật khẩu là bắt buộc." },
        { status: 400 }
      );
    }

    if (userPassword.length < 6) {
      return NextResponse.json(
        { error: "Mật khẩu phải có ít nhất 6 ký tự." },
        { status: 400 }
      );
    }

    // Check slug uniqueness
    const existingAccount = await prisma.account.findUnique({
      where: { slug: accountSlug.trim() },
    });

    if (existingAccount) {
      return NextResponse.json(
        { error: `Slug "${accountSlug}" đã tồn tại. Vui lòng chọn slug khác.` },
        { status: 409 }
      );
    }

    // Check email uniqueness
    const existingUser = await prisma.user.findUnique({
      where: { email: userEmail.trim().toLowerCase() },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: `Email "${userEmail}" đã được sử dụng.` },
        { status: 409 }
      );
    }

    // Create account
    const account = await prisma.account.create({
      data: {
        name: accountName.trim(),
        slug: accountSlug.trim().toLowerCase(),
      },
    });

    // Create user
    const passwordHash = await hashPassword(userPassword);
    const user = await prisma.user.create({
      data: {
        email: userEmail.trim().toLowerCase(),
        passwordHash,
        fullName: userFullName?.trim() || null,
        role: userRole || "user",
        accountId: account.id,
      },
    });

    return NextResponse.json({
      success: true,
      account: {
        id: account.id,
        name: account.name,
        slug: account.slug,
      },
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        accountId: user.accountId,
      },
    });
  } catch (error) {
    console.error("Create account error:", error);
    return NextResponse.json(
      { error: "Đã xảy ra lỗi khi tạo tài khoản." },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const accounts = await prisma.account.findMany({
      include: {
        _count: {
          select: { users: true },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({
      success: true,
      accounts: accounts.map((a) => ({
        id: a.id,
        name: a.name,
        slug: a.slug,
        userCount: a._count.users,
        createdAt: a.createdAt,
      })),
    });
  } catch (error) {
    console.error("List accounts error:", error);
    return NextResponse.json(
      { error: "Đã xảy ra lỗi khi lấy danh sách tài khoản." },
      { status: 500 }
    );
  }
}
