export const QUICK_ENTRY_ITEM_STATUSES = {
  PENDING: "pending",
  PARSED: "parsed",
  NEEDS_REVIEW: "needs_review",
  AUTO_SAVED: "auto_saved",
  SAVED: "saved",
  FAILED: "failed",
  DISCARDED: "discarded",
} as const;

export type QuickEntryItemStatus =
  (typeof QUICK_ENTRY_ITEM_STATUSES)[keyof typeof QUICK_ENTRY_ITEM_STATUSES];

export type QuickEntrySource = "text" | "paste" | "voice";

export const QUICK_ENTRY_PROCESSING_MODES = {
  SYNC: "sync",
  ASYNC: "async",
} as const;

export type QuickEntryProcessingMode =
  (typeof QUICK_ENTRY_PROCESSING_MODES)[keyof typeof QUICK_ENTRY_PROCESSING_MODES];

export interface QuickTripCandidate {
  customerPhone?: string;
  customerName?: string;
  departure?: string;
  destination?: string;
  pickupLocation?: string;
  dropoffLocation?: string;
  departureTime?: string;
  price?: number;
  totalSeats?: number;
  tripType?: "ghep" | "bao";
  tripDirection?: "oneway" | "roundtrip";
  driverId?: number | null;
  notes?: string;
  confidence: number;
  missingFields: string[];
  warnings: string[];
}

export interface ParsedQuickTripChunk {
  rawText: string;
  candidate: QuickTripCandidate;
}
