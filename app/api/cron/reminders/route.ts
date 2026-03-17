import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmailViaSmtp } from "@/lib/email";

export const runtime = "nodejs";

function isValidEmail(email: string) {
  const v = String(email || "").trim();
  // simple + safe check (avoids pulling extra deps)
  return v.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

function renderTemplate(input: string, data: Record<string, unknown>) {
  let out = input;
  for (const [key, value] of Object.entries(data)) {
    out = out.replaceAll(`{{${key}}}`, String(value));
  }
  return out;
}

function isInQuietHours(nowHour: number, start: number | null, end: number | null) {
  if (start === null || end === null) return false;
  if (start === end) return true; // whole day
  // Example: 22 -> 7 crosses midnight
  if (start > end) return nowHour >= start || nowHour < end;
  return nowHour >= start && nowHour < end;
}

function fmtViDateTime(d: Date) {
  return d.toLocaleString("vi-VN", { hour12: false });
}

// GET /api/cron/reminders
// Call this endpoint every minute on VPS (cron/systemd timer). Protect with CRON_SECRET.
export async function GET(request: NextRequest) {
  try {
    const secret = request.headers.get("x-cron-secret") || "";
    if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
      // Helpful (non-sensitive) debug info for local/dev runs.
      // Do NOT leak secrets; only expose whether server has a secret and whether the provided header was empty.
      const isProd = process.env.NODE_ENV === "production";
      const debug = isProd
        ? undefined
        : {
            hasServerSecret: Boolean(process.env.CRON_SECRET),
            providedHeaderEmpty: secret.length === 0,
            hint: !process.env.CRON_SECRET ? "server_missing_CRON_SECRET" : "header_mismatch",
          };
      return NextResponse.json({ success: false, error: "Unauthorized", debug }, { status: 401 });
    }

    const url = new URL(request.url);
    const dryRun = url.searchParams.get("dryRun") === "1" || url.searchParams.get("dryRun") === "true";

    const now = new Date();
    const nowHour = now.getHours();

    // Load reminder recipient email from Settings (system_settings category=email)
    // - reminder_to_email: email nhận nhắc lịch (admin/operator)
    // - fallback: from_email (email người gửi) for backward compatibility
    const emailSettingsRows = await prisma.systemSettings.findMany({
      where: { category: "email", key: { in: ["reminder_to_email", "from_email"] } },
    });
    const emailSettings: Record<string, string> = {};
    for (const r of emailSettingsRows) {
      if (typeof r.value === "string") emailSettings[r.key] = r.value;
    }
    const reminderToEmail = (emailSettings.reminder_to_email || emailSettings.from_email || "").trim();

    // Load active reminder template (fallback to booking_confirmation if missing)
    const tpl =
      (await prisma.emailTemplate.findFirst({ where: { key: "trip_reminder", isActive: true } })) ||
      (await prisma.emailTemplate.findFirst({ where: { key: "booking_confirmation", isActive: true } }));

    if (!tpl) {
      return NextResponse.json({ success: false, error: "Missing email template in DB" }, { status: 500 });
    }

    // Fetch upcoming trips up to next 24h + 2m for tolerance
    const horizon = new Date(now.getTime() + 24 * 60 * 60 * 1000 + 2 * 60 * 1000);
    const trips = await prisma.trip.findMany({
      where: {
        status: { in: ["scheduled", "confirmed"] },
        departureTime: { gt: now, lte: horizon },
      },
      include: {
        customers: { include: { customer: true } },
        driver: true,
      },
    });

    // Preload settings for involved users
    const createdByIds = Array.from(new Set(trips.map((t: any) => (t as any).createdById || 1)));
    const settingsRows = await prisma.userSettings.findMany({
      where: { userId: { in: createdByIds } },
    });
    const settingsMap = new Map<number, typeof settingsRows[number]>();
    for (const s of settingsRows) settingsMap.set(s.userId, s);

    let scannedTrips = 0;
    let emailsSent = 0;
    let emailsSkippedNoEmail = 0;
    let emailsSkippedNoRecipient = 0;
    let emailsSkippedQuietHours = 0;
    let emailsSkippedDup = 0;
    const candidates: Array<{
      tripId: number;
      to: string;
      offset: number;
      departureTime: string;
      deltaMinutes: number;
      wouldSend: boolean;
      skippedReason?: "dup" | "no_recipient";
    }> = [];

    for (const trip of trips) {
      scannedTrips++;
      const createdById = (trip as any).createdById || 1;
      const settings =
        settingsMap.get(createdById) ||
        (await prisma.userSettings.findUnique({ where: { userId: createdById } })) ||
        null;

      const emailEnabled = settings?.emailEnabled ?? true;
      const reminderOffset = settings?.reminderOffset ?? 60;
      const quietStart = settings?.quietHoursStart ?? null;
      const quietEnd = settings?.quietHoursEnd ?? null;

      if (!emailEnabled) continue;
      if (isInQuietHours(nowHour, quietStart, quietEnd)) {
        emailsSkippedQuietHours++;
        continue;
      }

      const deltaMs = new Date(trip.departureTime).getTime() - now.getTime();
      const min = reminderOffset * 60 * 1000;
      const max = min + 60 * 1000; // in the next 1 minute window
      if (deltaMs < min || deltaMs >= max) continue;

      // Recipient: send to admin/operator email configured in Settings (NOT customer emails)
      if (!reminderToEmail || !isValidEmail(reminderToEmail)) {
        emailsSkippedNoRecipient++;
        if (candidates.length < 50) {
          candidates.push({
            tripId: trip.id,
            to: reminderToEmail || "",
            offset: reminderOffset,
            departureTime: new Date(trip.departureTime).toISOString(),
            deltaMinutes: Math.round(deltaMs / 60000),
            wouldSend: false,
            skippedReason: "no_recipient",
          });
        }
        continue;
      }

      const already = await prisma.notification.findFirst({
        where: {
          type: "email_reminder",
          AND: [
            { data: { path: ["tripId"], equals: trip.id } },
            { data: { path: ["offset"], equals: reminderOffset } },
            { data: { path: ["to"], equals: reminderToEmail } },
          ],
        },
      });
      if (already) {
        emailsSkippedDup++;
        if (candidates.length < 50) {
          candidates.push({
            tripId: trip.id,
            to: reminderToEmail,
            offset: reminderOffset,
            departureTime: new Date(trip.departureTime).toISOString(),
            deltaMinutes: Math.round(deltaMs / 60000),
            wouldSend: false,
            skippedReason: "dup",
          });
        }
        continue;
      }

      if (candidates.length < 50) {
        candidates.push({
          tripId: trip.id,
          to: reminderToEmail,
          offset: reminderOffset,
          departureTime: new Date(trip.departureTime).toISOString(),
          deltaMinutes: Math.round(deltaMs / 60000),
          wouldSend: true,
        });
      }

      if (dryRun) continue;

      const customerNames = (trip.customers || [])
        .map((tc: any) => tc?.customer?.name)
        .filter(Boolean)
        .join(", ");

      const data = {
        customer_name: customerNames || "Khách",
        departure_time: fmtViDateTime(new Date(trip.departureTime)),
        pickup_location: trip.departure,
        dropoff_location: trip.destination,
        driver_name: (trip as any)?.driver?.fullName || "",
      };

      const subject = renderTemplate(tpl.subject, data);
      const body = renderTemplate(tpl.body, data);

      const smtp = await sendEmailViaSmtp({
        to: reminderToEmail,
        subject,
        text: body,
      });

      await prisma.notification.create({
        data: {
          userId: createdById, // owner/operator for tracking
          type: "email_reminder",
          title: subject,
          content: body,
          data: {
            tripId: trip.id,
            offset: reminderOffset,
            to: reminderToEmail,
            sentAt: new Date().toISOString(),
            smtp,
          },
        },
      });

      emailsSent++;
    }

    return NextResponse.json({
      success: true,
      dryRun,
      now: now.toISOString(),
      scannedTrips,
      emailsSent,
      emailsSkippedNoEmail,
      emailsSkippedNoRecipient,
      emailsSkippedQuietHours,
      emailsSkippedDup,
      candidates,
    });
  } catch (error: any) {
    console.error("GET /api/cron/reminders error:", error);
    return NextResponse.json({ success: false, error: error?.message || "Failed" }, { status: 500 });
  }
}

