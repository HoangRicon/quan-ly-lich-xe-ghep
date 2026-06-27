/**
 * AI Composer state machine hook.
 */

import { useState, useCallback, useRef } from "react";
import type { ComposerState, ParseMode } from "@/lib/quick-create/types";

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

function getDefaultParseMode(): ParseMode {
  if (typeof window === "undefined") return "smart";
  const stored = localStorage.getItem("quick-create-parse-mode");
  if (stored === "smart" || stored === "rule") return stored;
  return "smart";
}

export function useAIComposer(): UseAIComposerReturn {
  const [state, setState] = useState<ComposerState>("idle");
  const [text, setTextState] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [parseMode, setParseModeState] = useState<ParseMode>(getDefaultParseMode);
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
    setParseModeState(mode);
    localStorage.setItem("quick-create-parse-mode", mode);
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
