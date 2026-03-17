import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const DEFAULT_STATUSES = [
  { key: "scheduled", label: "Chờ gán", color: "amber", sortOrder: 1 },
  { key: "confirmed", label: "Đã gán", color: "blue", sortOrder: 2 },
  { key: "running", label: "Đang đi", color: "green", sortOrder: 3 },
  { key: "completed", label: "Hoàn thành", color: "slate", sortOrder: 4 },
  { key: "cancelled", label: "Đã hủy", color: "red", sortOrder: 5 },
] as const;

async function ensureDefaults() {
  const count = await prisma.tripStatus.count();
  if (count > 0) return;

  await prisma.tripStatus.createMany({
    data: DEFAULT_STATUSES.map((s) => ({
      key: s.key,
      label: s.label,
      color: s.color,
      sortOrder: s.sortOrder,
      isActive: true,
    })),
  });
}

// GET /api/trip-statuses - list statuses (auto-seed defaults if empty)
export async function GET() {
  try {
    await ensureDefaults();
    const statuses = await prisma.tripStatus.findMany({
      orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
    });
    return NextResponse.json({ success: true, statuses });
  } catch (error) {
    console.error("GET /api/trip-statuses error:", error);
    return NextResponse.json({ success: false, error: "Không thể tải trạng thái" }, { status: 500 });
  }
}

// POST /api/trip-statuses - create a new status
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { key, label, color, sortOrder, isActive } = body || {};

    if (!key?.trim() || !label?.trim()) {
      return NextResponse.json({ success: false, error: "Thiếu key/label" }, { status: 400 });
    }

    const created = await prisma.tripStatus.create({
      data: {
        key: String(key).trim(),
        label: String(label).trim(),
        color: String(color || "slate").trim(),
        sortOrder: Number.isFinite(Number(sortOrder)) ? Number(sortOrder) : 0,
        isActive: isActive === false ? false : true,
      },
    });
    return NextResponse.json({ success: true, status: created });
  } catch (error: any) {
    console.error("POST /api/trip-statuses error:", error);
    const msg =
      typeof error?.message === "string" && error.message.includes("Unique constraint")
        ? "Key trạng thái đã tồn tại"
        : "Không thể tạo trạng thái";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

// PUT /api/trip-statuses - update (single or batch)
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();

    // Batch: { statuses: [{ id, key?, label?, color?, sortOrder?, isActive? }, ...] }
    if (Array.isArray(body?.statuses)) {
      const updates = body.statuses as Array<any>;
      const results = await prisma.$transaction(
        updates.map((s) =>
          prisma.tripStatus.update({
            where: { id: Number(s.id) },
            data: {
              ...(s.key !== undefined ? { key: String(s.key).trim() } : {}),
              ...(s.label !== undefined ? { label: String(s.label).trim() } : {}),
              ...(s.color !== undefined ? { color: String(s.color).trim() } : {}),
              ...(s.sortOrder !== undefined ? { sortOrder: Number(s.sortOrder) } : {}),
              ...(s.isActive !== undefined ? { isActive: Boolean(s.isActive) } : {}),
            },
          })
        )
      );
      return NextResponse.json({ success: true, statuses: results });
    }

    // Single: { id, ...fields }
    const { id, key, label, color, sortOrder, isActive } = body || {};
    if (!id) return NextResponse.json({ success: false, error: "Thiếu id" }, { status: 400 });

    const updated = await prisma.tripStatus.update({
      where: { id: Number(id) },
      data: {
        ...(key !== undefined ? { key: String(key).trim() } : {}),
        ...(label !== undefined ? { label: String(label).trim() } : {}),
        ...(color !== undefined ? { color: String(color).trim() } : {}),
        ...(sortOrder !== undefined ? { sortOrder: Number(sortOrder) } : {}),
        ...(isActive !== undefined ? { isActive: Boolean(isActive) } : {}),
      },
    });
    return NextResponse.json({ success: true, status: updated });
  } catch (error) {
    console.error("PUT /api/trip-statuses error:", error);
    return NextResponse.json({ success: false, error: "Không thể cập nhật trạng thái" }, { status: 500 });
  }
}

// DELETE /api/trip-statuses?id=123
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ success: false, error: "Thiếu id" }, { status: 400 });

    const status = await prisma.tripStatus.findUnique({
      where: { id: Number(id) },
      select: { id: true, key: true },
    });
    if (!status) return NextResponse.json({ success: false, error: "Không tìm thấy trạng thái" }, { status: 404 });

    // Safety: prevent deleting a status that is currently used by trips (status is a plain string in Trip)
    const used = await prisma.trip.count({ where: { status: status.key } });
    if (used > 0) {
      return NextResponse.json(
        { success: false, error: `Không thể xóa: đang có ${used} cuốc xe dùng trạng thái '${status.key}'. Hãy tắt (Off) thay vì xóa.` },
        { status: 400 }
      );
    }

    await prisma.tripStatus.delete({ where: { id: status.id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/trip-statuses error:", error);
    return NextResponse.json({ success: false, error: "Không thể xóa trạng thái" }, { status: 500 });
  }
}

