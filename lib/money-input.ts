export function moneyDigits(value: unknown): string {
  return String(value ?? "").replace(/\D/g, "");
}

export function formatMoneyInput(value: unknown): string {
  const digits = moneyDigits(value);
  if (!digits) return "";
  return Number(digits).toLocaleString("vi-VN", { maximumFractionDigits: 0 });
}

export function parseMoneyInput(value: unknown): number | null {
  const digits = moneyDigits(value);
  if (!digits) return null;
  const parsed = Number(digits);
  return Number.isFinite(parsed) ? parsed : null;
}
