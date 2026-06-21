/**
 * AI Composer state machine hook.
 */

import { useState, useCallback, useRef } from "react";
import type { ComposerState } from "@/lib/quick-create/types";

export interface UseAIComposerReturn {
  state: ComposerState;
  text: string;
  errorMessage: string | null;
  setText: (text: string) => void;
  appendText: (text: string) => void;
  setAnalyzing: () => void;
  setGenerating: () => void;
  setDone: () => void;
  setError: (message: string) => void;
  reset: () => void;
}

export function useAIComposer(): UseAIComposerReturn {
  const [state, setState] = useState<ComposerState>("idle");
  const [text, setTextState] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
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
    setText,
    appendText,
    setAnalyzing,
    setGenerating,
    setDone,
    setError,
    reset,
  };
}
