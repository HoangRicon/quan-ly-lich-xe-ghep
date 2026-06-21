/**
 * Quick Create page formatters.
 */

function parseDateLikeInput(value: string | null | undefined) {
  if (!value) return null;

  const direct = new Date(value);
  if (!Number.isNaN(direct.getTime())) {
    return direct;
  }

  const match = value.match(
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/,
  );
  if (!match) {
    return null;
  }

  const [, year, month, day, hour, minute, second = "0"] = match;
  const parsed = new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
    Number(second),
    0,
  );

  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function formatPriceK(price: number | string | null | undefined): string {
  const n =
    typeof price === "string"
      ? parseInt(price.replace(/[^\d]/g, ""), 10) || 0
      : (price ?? 0);
  if (!n) return "";
  return n >= 1000 ? `${Math.round(n / 1000)}k` : `${n}`;
}

export function formatCurrency(price: number | string | null | undefined): string {
  const n =
    typeof price === "string"
      ? parseInt(price.replace(/[^\d]/g, ""), 10) || 0
      : (price ?? 0);
  if (!n) return "—";
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".").concat("đ");
}

export function formatTime(departureTime: string | null | undefined): string {
  const parsed = parseDateLikeInput(departureTime);
  if (!parsed) return "—";

  return parsed.toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export function formatFullDate(departureTime: string | null | undefined): string {
  const parsed = parseDateLikeInput(departureTime);
  if (!parsed) return "—";

  return parsed.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
  });
}

export function formatPhoneLink(phone: string | null | undefined): string {
  if (!phone) return "";
  return `tel:${phone.replace(/[^\d+]/g, "")}`;
}

export function formatZaloLink(phone: string | null | undefined): string {
  if (!phone) return "";
  return `https://zalo.me/${phone.replace(/[^\d]/g, "")}`;
}

export function formatNumberWithDots(num: number | string | null | undefined): string {
  const n =
    typeof num === "string"
      ? parseInt(num.replace(/[^\d]/g, ""), 10) || 0
      : (num ?? 0);
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}
