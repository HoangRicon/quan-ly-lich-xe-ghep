/**
 * Auto-generate a zom-style note from trip form fields.
 *
 * Logic mirror từ `components/trip-form.tsx` (lines 8-82 trước refactor).
 * Được share giữa trang thêm cuốc xe (`/dashboard/schedule/add`) và
 * bottom sheet sửa bản nháp ở trang tạo nhanh (`/dashboard/quick-create`).
 *
 * Format note (vd): "0-30p 1k HN - HP 150k 0912345678\nVị trí đón: 123 Cầu Giấy"
 */

export type AutoNoteTripType = "ghep" | "bao";
export type AutoNoteTripDirection = "oneway" | "roundtrip";

export interface AutoNoteInput {
  /** "HH:mm" — giờ khởi hành. */
  departureTime: string;
  /** Tên điểm đón (vd "Hà Nội", "HN"). */
  departure: string;
  /** Tên điểm đến (vd "Hải Phòng", "HP"). */
  destination: string;
  /** Giá tiền. Chấp nhận string có dấu chấm ("150.000") hoặc number (150000). */
  price: string | number;
  /** Số điện thoại khách (có thể rỗng). */
  phone: string;
  /** Số ghế — bỏ qua khi `tripType === "bao"`. */
  seats: number;
  /** Loại cuốc — KHÔNG bao gồm `_roundtrip`, tách riêng ở `tripDirection`. */
  tripType: AutoNoteTripType;
  /** Một chiều hay hai chiều. */
  tripDirection?: AutoNoteTripDirection;
  /** Địa chỉ đón cụ thể (optional). */
  pickupLocation?: string;
  /** Địa chỉ trả cụ thể (optional). */
  dropoffLocation?: string;
}

function formatNumberWithDots(num: number): string {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

function parsePriceToNumber(price: string | number): number {
  if (typeof price === "number") return price;
  return parseInt(price.replace(/\./g, ""), 10) || 0;
}

/**
 * Sinh ghi chú tự động từ các trường của form.
 *
 * Quy tắc:
 * - diff ≤ 60 phút → `0-Xp` (X = số phút từ hiện tại đến giờ đi, tối thiểu 1)
 * - diff > 60 phút → `HHhMM` (giờ đi)
 * - ghép 1 ghế → `1k`, ghép 2+ ghế → `2k`, bao → `bx`
 * - 2 chiều → thêm hậu tố ` 2C` vào timePart
 * - có vị trí đón/trả → thêm 2 dòng phụ
 */
export function generateAutoNote(input: AutoNoteInput): string {
  const {
    departureTime,
    departure,
    destination,
    price,
    phone,
    seats,
    tripType,
    tripDirection,
    pickupLocation,
    dropoffLocation,
  } = input;

  const now = new Date();
  const currentHours = now.getHours();
  const currentMinutes = now.getMinutes();

  const [hours, minutes] = departureTime.split(":").map(Number);

  let diffMinutes = hours * 60 + minutes - (currentHours * 60 + currentMinutes);

  if (diffMinutes === 0) {
    diffMinutes = 0;
  } else if (diffMinutes < 0) {
    diffMinutes += 24 * 60;
  }

  const displayMinutes = Math.max(1, diffMinutes);

  let seatType = "";
  if (tripType === "bao") {
    seatType = "bx";
  } else if (seats === 1) {
    seatType = "1k";
  } else if (seats >= 2) {
    seatType = "2k";
  } else {
    seatType = "1k";
  }

  const directionSuffix = tripDirection === "roundtrip" ? " 2C" : "";

  const priceNum = parsePriceToNumber(price);
  const priceDisplay = priceNum >= 1000 ? `${Math.round(priceNum / 1000)}k` : priceNum.toString();

  let timePart = "";
  if (diffMinutes <= 60) {
    timePart = `0-${displayMinutes}p ${seatType}`;
  } else {
    const departureHour = hours.toString().padStart(2, "0");
    const departureMinute = minutes.toString().padStart(2, "0");
    timePart = `${departureHour}h${departureMinute} ${seatType}`;
  }

  const baseNote = `${timePart}${directionSuffix} ${departure} - ${destination} ${priceDisplay} ${phone}`.trim();

  const safePickup = (pickupLocation || "").trim();
  const safeDropoff = (dropoffLocation || "").trim();
  const pickupLine = safePickup ? `\nVị trí đón: ${safePickup}` : "";
  const dropoffLine = safeDropoff ? `\nVị trí trả: ${safeDropoff}` : "";

  return `${baseNote}${pickupLine}${dropoffLine}`;
}
