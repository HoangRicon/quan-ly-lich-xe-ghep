import { splitQuickTripInput } from "./split-input";
import type { ParsedQuickTripChunk, QuickTripCandidate } from "./types";

const PHONE_PATTERN = /(?:^|[^\d])((?:0\d{9,10}|84\d{9,10}))(?!\d)/;
const PRICE_K_PATTERN = /(?:^|[\s,;])(\d{2,4}(?:[.,]\d+)?)\s*k\b/i;
const PRICE_THOUSAND_PATTERN =
  /(?:^|[\s,;])(\d{2,4}(?:[.,]\d+)?)\s*(?:nghin|ngan)\b/i;
const PRICE_CA_PATTERN = /(?:^|[\s,;])(\d{2,4}(?:[.,]\d+)?)\s*ca\b/i;
const PRICE_MILLION_PATTERN =
  /(?:^|[\s,;])(\d{1,3}(?:[.,]\d+)?)\s*(?:tr|trieu)\b/i;
const PRICE_CONTEXT_NUMBER_PATTERN =
  /\b(?:gia|cuoc|phi|tra|tien)\s*(?:la|khoang|tam)?\s*(\d{5,9})\b/i;
const TIME_COLON_PATTERN = /(?:^|[^\d])([01]?\d|2[0-3]):([0-5]\d)\b/;
const TIME_H_PATTERN = /(?:^|[^\d])([01]?\d|2[0-3])\s*h(?:\s*([0-5]\d))?\b/i;
const TIME_WORD_PATTERN =
  /(?:^|[^\d])([01]?\d|2[0-3])\s*(?:gio|g)(?:\s*([0-5]\d))?(?:\s*(sang|trua|chieu|toi|dem))?\b/i;
const SEAT_PATTERN = /(?:^|[^\d])([1-9]\d?)\s*(?:khach|ghe)(?:\b|$)/i;
const SEAT_K_PATTERN = /(?:^|[^\d])([1-9])\s*k\b/i;
const RELATIVE_DATE_QUANTITY_PATTERN =
  "\\d+|mot|hai|ba|bon|tu|nam|sau|bay|tam|chin|muoi";
const RELATIVE_DATE_QUANTITY_TOKEN_PATTERN = new RegExp(
  `\\b(${RELATIVE_DATE_QUANTITY_PATTERN})\\s+(ngay|hom|tuan|thang)\\s+(?:nua|sau|toi)\\b`,
  "i",
);
const RELATIVE_DATE_TOKEN_PATTERNS = [
  RELATIVE_DATE_QUANTITY_TOKEN_PATTERN,
  /\b(?:hom\s+nay|ngay\s+nay)\b/i,
  /\b(?:ngay\s+mai|mai)\b/i,
  /\b(?:ngay\s+(?:kia|mot)|ngay\s+mot|kia)\b/i,
  /\b(?:tuan|thang)\s+(?:sau|toi)\b/i,
];
const RELATIVE_DATE_STRIP_PATTERNS = RELATIVE_DATE_TOKEN_PATTERNS.map(
  (pattern) => new RegExp(pattern.source, "gi"),
);
const ROUTE_STOP_WORDS =
  "luc|gio|gia|cuoc|phi|tra|tien|sdt|so dien thoai|dien thoai|lien he|dt|phone|khach|don|tra khach|ghi chu|note";
const ROUTE_STOP_LOOKAHEAD = `(?=\\s+(?:${ROUTE_STOP_WORDS})\\b|$)`;
const ROUTE_STOP_PATTERN = new RegExp(`\\s+(?:${ROUTE_STOP_WORDS})\\b.*$`, "i");

const REQUIRED_FIELDS = [
  "customerPhone",
  "departure",
  "destination",
  "departureTime",
  "price",
] as const satisfies readonly (keyof QuickTripCandidate)[];

function toAsciiText(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\u0111/g, "d")
    .replace(/\u0110/g, "D");
}

function parsePhone(text: string): string | undefined {
  return text.match(PHONE_PATTERN)?.[1];
}

function parsePrice(text: string): number | undefined {
  const searchableText = toAsciiText(text);
  const thousandMatch =
    searchableText.match(PRICE_K_PATTERN) ??
    searchableText.match(PRICE_THOUSAND_PATTERN) ??
    searchableText.match(PRICE_CA_PATTERN);

  if (thousandMatch) {
    const amount = Number.parseFloat(thousandMatch[1].replace(",", "."));
    if (Number.isFinite(amount)) {
      return Math.round(amount * 1000);
    }
  }

  const millionMatch = searchableText.match(PRICE_MILLION_PATTERN);
  if (millionMatch) {
    const amount = Number.parseFloat(millionMatch[1].replace(",", "."));
    if (Number.isFinite(amount)) {
      return Math.round(amount * 1_000_000);
    }
  }

  const contextNumberMatch = searchableText.match(PRICE_CONTEXT_NUMBER_PATTERN);
  if (contextNumberMatch) {
    const amount = Number.parseInt(contextNumberMatch[1], 10);
    if (Number.isFinite(amount)) {
      return amount;
    }
  }

  return undefined;
}

function normalizeHourForPeriod(hour: number, period: string | undefined) {
  if (!period) return hour;

  const normalizedPeriod = period.toLowerCase();

  if (normalizedPeriod === "sang" && hour === 12) {
    return 0;
  }

  if (
    (normalizedPeriod === "chieu" ||
      normalizedPeriod === "toi" ||
      normalizedPeriod === "dem") &&
    hour > 0 &&
    hour < 12
  ) {
    return hour + 12;
  }

  return hour;
}

function parseRelativeQuantity(value: string) {
  const parsed = Number.parseInt(value, 10);
  if (Number.isInteger(parsed) && parsed > 0) {
    return parsed;
  }

  const numberWords: Record<string, number> = {
    mot: 1,
    hai: 2,
    ba: 3,
    bon: 4,
    tu: 4,
    nam: 5,
    sau: 6,
    bay: 7,
    tam: 8,
    chin: 9,
    muoi: 10,
  };

  return numberWords[value.toLowerCase()];
}

function addDays(date: Date, days: number) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function addMonths(date: Date, months: number) {
  const result = new Date(date);
  const dayOfMonth = result.getDate();
  result.setDate(1);
  result.setMonth(result.getMonth() + months);

  const lastDayOfTargetMonth = new Date(
    result.getFullYear(),
    result.getMonth() + 1,
    0,
  ).getDate();
  result.setDate(Math.min(dayOfMonth, lastDayOfTargetMonth));

  return result;
}

function resolveRelativeDate(text: string, now: Date) {
  const searchableText = toSearchableText(text);
  const quantityMatch = searchableText.match(RELATIVE_DATE_QUANTITY_TOKEN_PATTERN);

  if (quantityMatch) {
    const amount = parseRelativeQuantity(quantityMatch[1]);
    if (amount) {
      const unit = quantityMatch[2];
      if (unit === "thang") {
        return addMonths(now, amount);
      }

      return addDays(now, unit === "tuan" ? amount * 7 : amount);
    }
  }

  if (/\b(?:ngay\s+(?:kia|mot)|ngay\s+mot|kia)\b/.test(searchableText)) {
    return addDays(now, 2);
  }

  if (/\b(?:ngay\s+mai|mai)\b/.test(searchableText)) {
    return addDays(now, 1);
  }

  if (/\b(?:tuan)\s+(?:sau|toi)\b/.test(searchableText)) {
    return addDays(now, 7);
  }

  if (/\b(?:thang)\s+(?:sau|toi)\b/.test(searchableText)) {
    return addMonths(now, 1);
  }

  return new Date(now);
}

export function hasRelativeDateExpression(text: string) {
  const searchableText = toSearchableText(text);
  return RELATIVE_DATE_TOKEN_PATTERNS.some((pattern) =>
    pattern.test(searchableText),
  );
}

function parseDepartureTime(text: string, now: Date): string | undefined {
  const searchableText = toAsciiText(text);
  const timeMatch =
    searchableText.match(TIME_COLON_PATTERN) ??
    searchableText.match(TIME_H_PATTERN) ??
    searchableText.match(TIME_WORD_PATTERN);

  if (!timeMatch) {
    return undefined;
  }

  const hour = normalizeHourForPeriod(
    Number.parseInt(timeMatch[1], 10),
    timeMatch[3],
  );
  const minute = Number.parseInt(timeMatch[2] ?? "0", 10);
  const departureTime = resolveRelativeDate(text, now);
  departureTime.setHours(hour, minute, 0, 0);

  return departureTime.toISOString();
}

function parseSeats(text: string): number | undefined {
  const searchableText = toAsciiText(text);
  const explicitSeatMatch = searchableText.match(SEAT_PATTERN);
  if (explicitSeatMatch) {
    return Number.parseInt(explicitSeatMatch[1], 10);
  }

  const shorthandSeatMatch = searchableText.match(SEAT_K_PATTERN);
  if (shorthandSeatMatch) {
    return Number.parseInt(shorthandSeatMatch[1], 10);
  }

  return undefined;
}

function toSearchableText(text: string): string {
  return toAsciiText(text).toLowerCase();
}

function parseTripType(text: string): "ghep" | "bao" {
  return /\b(?:bao|bx)\b/.test(toSearchableText(text)) ? "bao" : "ghep";
}

function parseTripDirection(text: string): "oneway" | "roundtrip" {
  return /\b2\s*(?:c|chieu)\b/.test(toSearchableText(text))
    ? "roundtrip"
    : "oneway";
}

function cleanEndpoint(value: string): string | undefined {
  const cleaned = value
    .replace(ROUTE_STOP_PATTERN, "")
    .replace(/^[\s,.;:|/\\]+|[\s,.;:|/\\]+$/g, "")
    .replace(/^(?:khach|kh|anh|chi|co|can|xe|di|tu)\s+/i, "")
    .replace(/\s+/g, " ")
    .trim();

  return cleaned || undefined;
}

function removeKnownTokens(text: string): string {
  return RELATIVE_DATE_STRIP_PATTERNS.reduce(
    (value, pattern) => value.replace(pattern, " "),
    toAsciiText(text),
  )
    .replace(PHONE_PATTERN, " ")
    .replace(PRICE_K_PATTERN, " ")
    .replace(PRICE_THOUSAND_PATTERN, " ")
    .replace(PRICE_CA_PATTERN, " ")
    .replace(PRICE_MILLION_PATTERN, " ")
    .replace(PRICE_CONTEXT_NUMBER_PATTERN, " ")
    .replace(TIME_COLON_PATTERN, " ")
    .replace(TIME_H_PATTERN, " ")
    .replace(TIME_WORD_PATTERN, " ")
    .replace(SEAT_PATTERN, " ")
    .replace(SEAT_K_PATTERN, " ")
    .replace(/\b(?:bao|bx|ghep|2\s*c|2\s*chieu)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseRoute(text: string): {
  departure?: string;
  destination?: string;
} {
  const searchableText = toAsciiText(text);
  const fromToPattern = new RegExp(
    `(?:^|\\s)(?:di\\s+)?tu\\s+(.+?)\\s+(?:den|toi|ve)\\s+(.+?)${ROUTE_STOP_LOOKAHEAD}`,
    "i",
  );
  const explicitFromToMatch = searchableText.match(fromToPattern);

  if (explicitFromToMatch) {
    return {
      departure: cleanEndpoint(explicitFromToMatch[1]),
      destination: cleanEndpoint(explicitFromToMatch[2]),
    };
  }

  const directVerbPattern = new RegExp(
    `(?:^|\\s)di\\s+(.+?)\\s+(?:den|toi|ve)\\s+(.+?)${ROUTE_STOP_LOOKAHEAD}`,
    "i",
  );
  const directVerbMatch = searchableText.match(directVerbPattern);

  if (directVerbMatch) {
    return {
      departure: cleanEndpoint(directVerbMatch[1]),
      destination: cleanEndpoint(directVerbMatch[2]),
    };
  }

  const cleanedText = removeKnownTokens(text);
  const symbolicMatch = cleanedText.match(/(.+?)\s*(?:->|=>|>|-)\s*(.+)/);

  if (symbolicMatch) {
    return {
      departure: cleanEndpoint(symbolicMatch[1]),
      destination: cleanEndpoint(symbolicMatch[2]),
    };
  }

  const wordSeparatorMatch = cleanedText.match(
    /(.+?)\s+(?:di|den|toi|ve)\s+(.+)/i,
  );
  if (wordSeparatorMatch) {
    return {
      departure: cleanEndpoint(wordSeparatorMatch[1]),
      destination: cleanEndpoint(wordSeparatorMatch[2]),
    };
  }

  return {};
}

function getMissingFields(candidate: QuickTripCandidate): string[] {
  return REQUIRED_FIELDS.filter((field) => {
    const value = candidate[field];
    return value === undefined || value === null || value === "";
  });
}

function calculateConfidence(candidate: QuickTripCandidate): number {
  const missingFields = getMissingFields(candidate);

  if (missingFields.length === 0) {
    return candidate.warnings.length === 0 ? 0.9 : 0.85;
  }

  const presentRequiredFields = REQUIRED_FIELDS.length - missingFields.length;
  const baseConfidence = 0.2 + presentRequiredFields * 0.12;
  const optionalBoost =
    (candidate.totalSeats !== undefined ? 0.04 : 0) +
    (candidate.tripType !== undefined ? 0.03 : 0) +
    (candidate.tripDirection !== undefined ? 0.03 : 0);

  return Math.min(0.84, Number((baseConfidence + optionalBoost).toFixed(2)));
}

export function parseQuickTripChunk(
  rawText: string,
  now = new Date(),
): QuickTripCandidate {
  const text = rawText.trim();
  const phone = parsePhone(text);
  const price = parsePrice(text);
  const route = parseRoute(text);

  const candidate: QuickTripCandidate = {
    customerPhone: phone,
    departure: route.departure,
    destination: route.destination,
    departureTime: parseDepartureTime(text, now),
    price,
    totalSeats: parseSeats(text),
    tripType: parseTripType(text),
    tripDirection: parseTripDirection(text),
    confidence: 0,
    missingFields: [],
    warnings: [],
  };

  candidate.missingFields = getMissingFields(candidate);
  candidate.confidence = calculateConfidence(candidate);

  return candidate;
}

export function parseQuickTripInput(
  rawText: string,
  now = new Date(),
): ParsedQuickTripChunk[] {
  return splitQuickTripInput(rawText).map((chunk) => ({
    rawText: chunk,
    candidate: parseQuickTripChunk(chunk, now),
  }));
}
