/**
 * Hook for managing parse mode preference.
 * Persists to localStorage.
 */

import { useState, useCallback } from "react";
import type { ParseMode } from "@/lib/quick-create/types";

const STORAGE_KEY = "quick-create-parse-mode";

function getStoredMode(): ParseMode {
  if (typeof window === "undefined") return "smart";

  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "smart" || stored === "rule") return stored;

  return "smart";
}

export function useParseMode() {
  const [mode, setModeState] = useState<ParseMode>(() => getStoredMode());

  const setMode = useCallback((newMode: ParseMode) => {
    setModeState(newMode);
    localStorage.setItem(STORAGE_KEY, newMode);
  }, []);

  const toggleMode = useCallback(() => {
    setMode(mode === "smart" ? "rule" : "smart");
  }, [mode, setMode]);

  return {
    mode,
    setMode,
    toggleMode,
  };
}
