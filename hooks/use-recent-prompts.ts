/**
 * Recent prompts hook — persists in localStorage.
 */

import { useState, useCallback, useEffect } from "react";
import {
  RECENT_PROMPTS_KEY,
  MAX_RECENT_PROMPTS,
} from "@/lib/quick-create/constants";

export function useRecentPrompts() {
  const [prompts, setPrompts] = useState<string[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(RECENT_PROMPTS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setPrompts(parsed.slice(0, MAX_RECENT_PROMPTS));
        }
      }
    } catch {
      // ignore parse errors
    }
  }, []);

  const addPrompt = useCallback((text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    setPrompts((prev) => {
      const filtered = prev.filter((p) => p !== trimmed);
      const next = [trimmed, ...filtered].slice(0, MAX_RECENT_PROMPTS);
      try {
        localStorage.setItem(RECENT_PROMPTS_KEY, JSON.stringify(next));
      } catch {
        // ignore storage errors
      }
      return next;
    });
  }, []);

  return { prompts, addPrompt };
}
