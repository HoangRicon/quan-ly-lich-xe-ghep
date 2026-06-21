/**
 * SWR hooks for quick-entry sessions.
 * Uses raw fetch + useState/useEffect (no SWR dependency).
 */

import { useState, useCallback, useEffect, useRef } from "react";
import type { QuickEntrySession } from "@/lib/quick-create/types";

export { type QuickEntrySession };

export function useSessions() {
  const [sessions, setSessions] = useState<QuickEntrySession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const mountedRef = useRef(true);

  const fetchSessions = useCallback(async () => {
    try {
      const res = await fetch("/api/quick-trip-entry/sessions", { cache: "no-store" });
      const json = await res.json();
      if (mountedRef.current) {
        if (json.success) {
          setSessions(json.data ?? []);
        }
        setIsLoading(false);
        setIsError(false);
      }
    } catch {
      if (mountedRef.current) {
        setIsError(true);
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    fetchSessions();
    return () => { mountedRef.current = false; };
  }, [fetchSessions]);

  const createSession = useCallback(
    async (name: string): Promise<QuickEntrySession> => {
      const res = await fetch("/api/quick-trip-entry/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? "Tạo phiên thất bại");
      const session = json.data as QuickEntrySession;
      setSessions((prev) => [session, ...prev]);
      return session;
    },
    [],
  );

  const updateSession = useCallback(
    async (sessionId: number, data: { name?: string; status?: "active" | "archived" }): Promise<QuickEntrySession> => {
      const res = await fetch(`/api/quick-trip-entry/sessions/${sessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? "Cập nhật thất bại");
      const session = json.data as QuickEntrySession;
      setSessions((prev) => prev.map((s) => (s.id === sessionId ? session : s)));
      return session;
    },
    [],
  );

  const deleteSession = useCallback(async (sessionId: number) => {
    const res = await fetch(`/api/quick-trip-entry/sessions/${sessionId}?confirmDiscard=true`, {
      method: "DELETE",
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error ?? "Xóa phiên thất bại");
    setSessions((prev) => prev.filter((s) => s.id !== sessionId));
  }, []);

  return {
    sessions,
    isLoading,
    isError,
    mutate: fetchSessions,
    createSession,
    updateSession,
    deleteSession,
  };
}
