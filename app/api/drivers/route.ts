import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    // Temporarily disable auth check for development
    // const user = await getUserFromRequest(request);
    // if (!user) {
    //   return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    // }

    const { searchParams } = new URL(request.url);
    const q = (searchParams.get("q") || "").trim();
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const skip = (page - 1) * limit;

    // "Zom" is stored as users with role="driver", but we only expose minimal fields:
    // name + revenue. No vehicle/phone/status/rating management is needed for this product.
    const where: any = {
      role: "driver",
      ...(q
        ? {
            fullName: {
              contains: q,
              mode: "insensitive",
            },
          }
        : {}),
    };

    const [drivers, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          fullName: true,
          totalRevenue: true,
        },
      }),
      prisma.user.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: drivers.map((d) => ({
        id: d.id,
        fullName: d.fullName,
        totalRevenue: Number(d.totalRevenue),
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get drivers error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Temporarily disable auth check for development
    // const user = await getUserFromRequest(request);
    // if (!user) {
    //   return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    // }

    const { fullName } = await request.json();

    // Keep DB constraints happy (email/passwordHash are required), but we don't manage these in UI.
    const email = `zom-${Date.now()}@zom.local`;
    const password = "zom123"; // Default password for demo

    if (!fullName) {
      return NextResponse.json({ error: "Tên Zom là bắt buộc" }, { status: 400 });
    }

    const { hashPassword } = await import("@/lib/password");
    const passwordHash = await hashPassword(password);

    const driver = await prisma.user.create({
      data: {
        email,
        passwordHash,
        fullName,
        phone: null,
        role: "driver",
        status: "offline",
        rating: 5, // unused for Zom, kept for compatibility
        avatar: null,
      },
    });

    return NextResponse.json({ success: true, data: driver }, { status: 201 });
  } catch (error) {
    console.error("Create driver error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
