import type { QuickTripCandidate } from "./types";

export const QUICK_ENTRY_AUTO_SAVE_THRESHOLD = 0.85;

const REQUIRED_FIELDS = [
  "customerPhone",
  "departure",
  "destination",
  "departureTime",
  "price",
] as const satisfies readonly (keyof QuickTripCandidate)[];

function uniqueValues(values: string[]): string[] {
  return [...new Set(values)];
}

export function getQuickTripMissingFields(
  candidate: QuickTripCandidate,
): string[] {
  return REQUIRED_FIELDS.filter((field) => {
    const value = candidate[field];
    return (
      value === undefined ||
      value === null ||
      (typeof value === "string" && value.trim() === "")
    );
  });
}

export function validateQuickTripCandidate(candidate: QuickTripCandidate): {
  candidate: QuickTripCandidate;
  canAutoSave: boolean;
} {
  const warnings = [...candidate.warnings];

  if (
    candidate.price != null &&
    (!Number.isFinite(candidate.price) || candidate.price <= 0)
  ) {
    warnings.push("invalid_price");
  }

  if (
    candidate.totalSeats != null &&
    (!Number.isFinite(candidate.totalSeats) || candidate.totalSeats < 1)
  ) {
    warnings.push("invalid_total_seats");
  }

  if (
    candidate.tripType !== undefined &&
    candidate.tripType !== "ghep" &&
    candidate.tripType !== "bao"
  ) {
    warnings.push("invalid_trip_type");
  }

  if (
    candidate.tripDirection !== undefined &&
    candidate.tripDirection !== "oneway" &&
    candidate.tripDirection !== "roundtrip"
  ) {
    warnings.push("invalid_trip_direction");
  }

  const validatedCandidate: QuickTripCandidate = {
    ...candidate,
    missingFields: getQuickTripMissingFields(candidate),
    warnings: uniqueValues(warnings),
  };

  return {
    candidate: validatedCandidate,
    canAutoSave:
      validatedCandidate.missingFields.length === 0 &&
      validatedCandidate.warnings.length === 0 &&
      validatedCandidate.confidence >= QUICK_ENTRY_AUTO_SAVE_THRESHOLD,
  };
}
