/**
 * Hooks for quick-entry drafts (items).
 * Uses raw fetch + useState/useEffect (no SWR dependency).
 */

import { useState, useCallback, useEffect, useRef } from "react";
import { DRAFT_REFRESH_INTERVAL } from "@/lib/quick-create/constants";
import {
  getSaveResultError,
  inferExpectedDraftCount,
} from "@/lib/quick-create/draft-helpers";
import type {
  DraftItem,
  DraftPromptUpdatePayload,
  DraftUpsertPayload,
  ParseMode,
  SaveResult,
} from "@/lib/quick-create/types";

function normalizeCreatedDraftItems(data: unknown): DraftItem[] {
  if (Array.isArray(data)) {
    return data as DraftItem[];
  }

  if (data && typeof data === "object") {
    const record = data as { items?: unknown; id?: unknown };
    if (Array.isArray(record.items)) {
      return record.items as DraftItem[];
    }

    if (typeof record.id === "number") {
      return [record as DraftItem];
    }
  }

  return [];
}

export function useDrafts(sessionId: number | null) {
  const [drafts, setDrafts] = useState<DraftItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const mountedRef = useRef(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchDrafts = useCallback(async () => {
    if (sessionId === null) return;
    try {
      const res = await fetch(`/api/quick-trip-entry/sessions/${sessionId}/items`, {
        cache: "no-store",
      });
      const json = await res.json();
      if (mountedRef.current && json.success) {
        setDrafts(json.data ?? []);
        setIsError(false);
      }
    } catch {
      if (mountedRef.current) setIsError(true);
    } finally {
      if (mountedRef.current) setIsLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    mountedRef.current = true;
    setIsLoading(true);
    setDrafts([]);
    void fetchDrafts();
    return () => {
      mountedRef.current = false;
    };
  }, [fetchDrafts]);

  useEffect(() => {
    if (sessionId === null) return;
    intervalRef.current = setInterval(() => {
      void fetchDrafts();
    }, DRAFT_REFRESH_INTERVAL);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [sessionId, fetchDrafts]);

  const createDrafts = useCallback(
    async (
      rawText: string,
      parseMode: ParseMode = "smart",
      source: "text" | "voice" | "paste" = "text",
    ): Promise<DraftItem[]> => {
      if (sessionId === null) throw new Error("No session selected");
      const res = await fetch(`/api/quick-trip-entry/sessions/${sessionId}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rawText,
          source,
          autoSave: false,
          parseMode,
          expectedDraftCount: inferExpectedDraftCount(rawText),
          processingMode: "async",
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? "Tao ban nhap that bai");
      const items = normalizeCreatedDraftItems(json.data);
      const itemsWithMode = items.map((item) => ({ ...item, parseMode }));
      setDrafts((prev) => [...prev, ...itemsWithMode]);
      return itemsWithMode;
    },
    [sessionId],
  );

  const updateDraft = useCallback(
    async (itemId: number, parsedData: DraftUpsertPayload): Promise<DraftItem> => {
      const res = await fetch(`/api/quick-trip-entry/items/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ parsedData }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? "Cap nhat that bai");
      const item = json.data as DraftItem;
      setDrafts((prev) => prev.map((d) => (d.id === itemId ? item : d)));
      return item;
    },
    [],
  );

  const updateDraftPrompt = useCallback(
    async (
      itemId: number,
      payload: DraftPromptUpdatePayload,
      parseMode: ParseMode = "smart",
    ): Promise<DraftItem> => {
      const res = await fetch(`/api/quick-trip-entry/items/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, parseMode }),
      });
      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error ?? "Cap nhat prompt that bai");
      }
      const item = { ...(json.data as DraftItem), parseMode } as const;
      setDrafts((prev) => prev.map((d) => (d.id === itemId ? item : d)));
      return item;
    },
    [],
  );

  const saveDraft = useCallback(async (itemId: number): Promise<SaveResult> => {
    try {
      const res = await fetch(`/api/quick-trip-entry/items/${itemId}/save`, {
        method: "POST",
      });
      const json = await res.json();
      if (!json.success) {
        return { success: false, error: json.error ?? "Luu that bai" };
      }

      const item = json.data as DraftItem;
      setDrafts((prev) => prev.map((d) => (d.id === itemId ? item : d)));
      const saveError = getSaveResultError(item);

      if (saveError) {
        return { success: false, item, error: saveError };
      }

      return { success: true, item };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "Loi khong xac dinh",
      };
    }
  }, []);

  const saveDraftWithParsedData = useCallback(
    async (itemId: number, parsedData: DraftUpsertPayload): Promise<SaveResult> => {
      try {
        await updateDraft(itemId, parsedData);
        return await saveDraft(itemId);
      } catch (err) {
        return {
          success: false,
          error: err instanceof Error ? err.message : "Loi khong xac dinh",
        };
      }
    },
    [saveDraft, updateDraft],
  );

  const discardDraft = useCallback(async (itemId: number) => {
    const res = await fetch(`/api/quick-trip-entry/items/${itemId}/discard`, {
      method: "POST",
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error ?? "Huy ban nhap that bai");
    setDrafts((prev) => prev.filter((d) => d.id !== itemId));
  }, []);

  const duplicateDraft = useCallback(
    async (itemId: number): Promise<DraftItem> => {
      const res = await fetch(`/api/quick-trip-entry/items/${itemId}/duplicate`, {
        method: "POST",
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? "Nhan doi ban nhap that bai");
      const item = json.data as DraftItem;
      setDrafts((prev) => [...prev, item]);
      return item;
    },
    [],
  );

  const saveAllValid = useCallback(async (): Promise<SaveResult[]> => {
    if (sessionId === null) throw new Error("No session selected");
    const res = await fetch(`/api/quick-trip-entry/sessions/${sessionId}/save-valid`, {
      method: "POST",
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error ?? "Luu hang loat that bai");
    const results = (json.data ?? []) as SaveResult[];
    await fetchDrafts();
    return results;
  }, [sessionId, fetchDrafts]);

  return {
    drafts,
    isLoading,
    isError,
    mutate: fetchDrafts,
    createDrafts,
    updateDraft,
    updateDraftPrompt,
    saveDraft,
    saveDraftWithParsedData,
    discardDraft,
    duplicateDraft,
    saveAllValid,
  };
}
