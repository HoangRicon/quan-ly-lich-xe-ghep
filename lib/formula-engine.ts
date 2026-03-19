/**
 * Formula Engine — Công thức tính điểm & lợi nhuận cho chuyến xe.
 *
 * Luồng:
 *  1. findMatchingFormula(tripData) — tìm công thức phù hợp nhất dựa trên
 *     tripType + tripDirection + seats + price.
 *  2. calculateProfit(points, profitRate) — lợi nhuận = điểm × tỉ lệ quy đổi.
 *  3. applyToTrip(trip, driver) — gọi 1+2 rồi trả về fields cần lưu vào DB.
 */

export interface TripMatchInput {
  /** Giá chuyến xe (VNĐ) */
  price: number;
  /** Tổng số ghế của xe: 4, 7, ... — dùng để match với formula.seats */
  totalSeats: number;
  /** "ghep" | "bao" */
  tripType: "ghep" | "bao";
  /** "oneway" | "roundtrip" */
  tripDirection?: "oneway" | "roundtrip";
}

export interface FormulaMatchResult {
  formulaId: number;
  formulaName: string;
  points: number;
  profit: number;
  profitRate: number;
}

/**
 * Normalize tripType + tripDirection → internal tripType key dùng trong bảng PricingFormula.
 *
 * Mapping:
 *   "ghep"    + "oneway"    → "ghep"
 *   "ghep"    + "roundtrip" → "ghep_roundtrip"
 *   "bao"     + "oneway"    → "bao"
 *   "bao"     + "roundtrip" → "bao_roundtrip"
 *   fallback "bao"           → "bao"
 */
export function resolveFormulaTripType(
  tripType: "ghep" | "bao",
  tripDirection?: "oneway" | "roundtrip"
): string {
  if (tripType === "bao") {
    return tripDirection === "roundtrip" ? "bao_roundtrip" : "bao";
  }
  return tripDirection === "roundtrip" ? "ghep_roundtrip" : "ghep";
}

/**
 * Kiểm tra price có nằm trong khoảng [minPrice, maxPrice] không.
 * - minPrice null  → không có giới hạn dưới (>= mọi giá)
 * - maxPrice null  → không có giới hạn trên (<= mọi giá)
 */
function priceInRange(
  price: number,
  minPrice: number | null,
  maxPrice: number | null
): boolean {
  if (minPrice !== null && price < Number(minPrice)) return false;
  if (maxPrice !== null && price > Number(maxPrice)) return false;
  return true;
}

/**
 * Tìm công thức phù hợp nhất cho chuyến xe.
 * Ưu tiên:
 *  1. Match chính xác tripType + seats + price range
 *  2. Match tripType + price range (seats = null = "tất cả")
 *
 * Trả về null nếu không có công thức nào match.
 */
export function findMatchingFormula(
  formulas: Array<{
    id: number;
    name: string;
    tripType: string;
    seats: number | null;
    minPrice: number | null;
    maxPrice: number | null;
    points: number;
  }>,
  trip: TripMatchInput
): FormulaMatchResult | null {
  const formulaTripType = resolveFormulaTripType(trip.tripType, trip.tripDirection);

  // Lọc các công thức cùng tripType và active
  const candidates = formulas.filter((f) => f.tripType === formulaTripType);
  if (candidates.length === 0) return null;

  // Tìm công thức match chính xác seats trước
  const seatsMatch = candidates.find(
    (f) => f.seats === trip.totalSeats && priceInRange(trip.price, f.minPrice, f.maxPrice)
  );
  if (seatsMatch) {
    return {
      formulaId: seatsMatch.id,
      formulaName: seatsMatch.name,
      points: seatsMatch.points,
      profit: 0,
      profitRate: 0,
    };
  }

  // Fallback: match không cần seats (seats = null)
  const anySeatsMatch = candidates.find(
    (f) => f.seats === null && priceInRange(trip.price, f.minPrice, f.maxPrice)
  );
  if (anySeatsMatch) {
    return {
      formulaId: anySeatsMatch.id,
      formulaName: anySeatsMatch.name,
      points: anySeatsMatch.points,
      profit: 0,
      profitRate: 0,
    };
  }

  return null;
}

/**
 * Tính lợi nhuận: điểm × tỉ lệ quy đổi (profitRate).
 */
export function calculateProfit(points: number, profitRate: number): number {
  return points * profitRate;
}

/**
 * Áp dụng công thức cho chuyến xe.
 * Trả về object chứa các trường cần update vào Trip model.
 */
export function applyFormula(
  trip: TripMatchInput,
  driverProfitRate: number,
  formulaResult: FormulaMatchResult | null
): {
  pointsEarned: number | null;
  profitRate: number | null;
  profit: number | null;
  matchedFormulaId: number | null;
} {
  // Nếu không match công thức nào → không tính gì cả
  if (!formulaResult) {
    return {
      pointsEarned: null,
      profitRate: null,
      profit: null,
      matchedFormulaId: null,
    };
  }

  const profit = calculateProfit(formulaResult.points, driverProfitRate);

  return {
    pointsEarned: formulaResult.points,
    profitRate: driverProfitRate,
    profit,
    matchedFormulaId: formulaResult.formulaId,
  };
}

/**
 * Tiện ích: định dạng số tiền VND có dấu chấm phân cách.
 */
export function formatVND(amount: number): string {
  return new Intl.NumberFormat("vi-VN").format(amount);
}
