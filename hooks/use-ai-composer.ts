/**
 * AI Composer state machine hook.
 */

import { useState, useCallback, useRef, useSyncExternalStore } from "react";
import type { ComposerState, ParseMode } from "@/lib/quick-create/types";

const PARSE_MODE_STORAGE_KEY = "quick-create-parse-mode";
const PARSE_MODE_STORAGE_EVENT = "quick-create-parse-mode-change";

export interface UseAIComposerReturn {
  state: ComposerState;
  text: string;
  errorMessage: string | null;
  parseMode: ParseMode;
  setText: (text: string) => void;
  appendText: (text: string) => void;
  setParseMode: (mode: ParseMode) => void;
  setAnalyzing: () => void;
  setGenerating: () => void;
  setDone: () => void;
  setError: (message: string) => void;
  reset: () => void;
}

function normalizeParseMode(value: string | null): ParseMode {
  return value === "rule" ? "rule" : "smart";
}

function getStoredParseModeSnapshot(): ParseMode {
  if (typeof window === "undefined") return "smart";

  return normalizeParseMode(localStorage.getItem(PARSE_MODE_STORAGE_KEY));
}

function getServerParseModeSnapshot(): ParseMode {
  return "smart";
}

function subscribeToParseMode(onStoreChange: () => void) {
  if (typeof window === "undefined") return () => {};

  const handleStorageChange = (event: Event) => {
    if (
      event instanceof StorageEvent &&
      event.key !== PARSE_MODE_STORAGE_KEY &&
      event.key !== null
    ) {
      return;
    }

    onStoreChange();
  };

  window.addEventListener("storage", handleStorageChange);
  window.addEventListener(PARSE_MODE_STORAGE_EVENT, handleStorageChange);

  return () => {
    window.removeEventListener("storage", handleStorageChange);
    window.removeEventListener(PARSE_MODE_STORAGE_EVENT, handleStorageChange);
  };
}

export function useAIComposer(): UseAIComposerReturn {
  const [state, setState] = useState<ComposerState>("idle");
  const [text, setTextState] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const parseMode = useSyncExternalStore(
    subscribeToParseMode,
    getStoredParseModeSnapshot,
    getServerParseModeSnapshot,
  );
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const setText = useCallback((t: string) => {
    setTextState(t);
  }, []);

  const appendText = useCallback((t: string) => {
    setTextState((prev) => (prev ? `${prev} ${t}` : t));
  }, []);

  const setParseMode = useCallback((mode: ParseMode) => {
    if (typeof window !== "undefined") {
      localStorage.setItem(PARSE_MODE_STORAGE_KEY, mode);
      window.dispatchEvent(new Event(PARSE_MODE_STORAGE_EVENT));
    }
  }, []);

  const setAnalyzing = useCallback(() => {
    setState("analyzing");
    setErrorMessage(null);
  }, []);

  const setGenerating = useCallback(() => {
    setState("generating");
  }, []);

  const setDone = useCallback(() => {
    setState("done");
    setTextState("");
    clearTimer();
    timerRef.current = setTimeout(() => setState("idle"), 2000);
  }, []);

  const setError = useCallback((message: string) => {
    setState("error");
    setErrorMessage(message);
    clearTimer();
    timerRef.current = setTimeout(() => setState("idle"), 4000);
  }, []);

  const reset = useCallback(() => {
    setState("idle");
    setTextState("");
    setErrorMessage(null);
    clearTimer();
  }, []);

  return {
    state,
    text,
    errorMessage,
    parseMode,
    setText,
    appendText,
    setParseMode,
    setAnalyzing,
    setGenerating,
    setDone,
    setError,
    reset,
  };
}
