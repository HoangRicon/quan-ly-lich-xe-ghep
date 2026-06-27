/**
 * Quick Create page types.
 * Re-exports and augments server-side serializer types for client use.
 */

import type { QuickEntryItemStatus, QuickTripCandidate } from "@/lib/quick-trip-entry/types";

export type { QuickEntryItemStatus, QuickTripCandidate };

/** Parse mode for creating drafts */
export type ParseMode = "smart" | "rule";

/** Serialized item as returned from API */
export interface DraftItem {
  id: number;
  sessionId: number;
  rawText: string;
  source: string;
  parseMode?: ParseMode;
  status: QuickEntryItemStatus;
  parsedData: QuickTripCandidate | null;
  missingFields: string[];
  warnings: string[];
  confidence: number | null;
  createdTripId: number | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Serialized session as returned from API */
export interface QuickEntrySession {
  id: number;
  name: string;
  sourceType: string;
  status: "active" | "archived";
  lastInputAt: string | null;
  createdAt: string;
  updatedAt: string;
  pendingCount: number;
  errorCount: number;
}

/** AI Composer state machine */
export type ComposerState =
  | "idle"
  | "analyzing"
  | "generating"
  | "done"
  | "error";

/** Swipe direction per card */
export type SwipeDirection = "left" | "right" | null;

/** Result of save operation */
export interface SaveResult {
  success: boolean;
  item?: DraftItem;
  error?: string;
}

export interface DraftUpsertPayload {
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
  notes?: string;
}

export interface DraftPromptUpdatePayload {
  rawText: string;
  reparse?: boolean;
}
