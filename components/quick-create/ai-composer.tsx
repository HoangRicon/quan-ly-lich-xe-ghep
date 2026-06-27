"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { Send, X, Trash2 } from "lucide-react";
import type { ComposerState, ParseMode } from "@/lib/quick-create/types";
import { COMPOSER_STATE_LABELS } from "@/lib/quick-create/constants";
import { PromptSuggestions } from "./prompt-suggestions";
import { ModeToggle } from "./mode-toggle";

interface AIComposerProps {
  state: ComposerState;
  text: string;
  errorMessage: string | null;
  parseMode: ParseMode;
  onTextChange: (text: string) => void;
  onSubmit: (text: string) => void;
  onCancel?: () => void;
  onParseModeChange?: (mode: ParseMode) => void;
  /** Only fills text into the input — does NOT submit */
  onSuggestionClick?: (text: string) => void;
}

export function AIComposer({
  state,
  text,
  errorMessage,
  parseMode,
  onTextChange,
  onSubmit,
  onCancel,
  onParseModeChange,
  onSuggestionClick,
}: AIComposerProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const isLoading = state === "analyzing" || state === "generating";
  const shouldShowSuggestions = showSuggestions && !text && state === "idle";

  // Auto-grow textarea
  const adjustHeight = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, []);

  useEffect(() => {
    adjustHeight();
  }, [text, adjustHeight]);

  const handleSubmit = () => {
    if (!text.trim() || isLoading) return;
    onSubmit(text.trim());
    setShowSuggestions(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const placeholder =
    state === "error"
      ? "Đã xảy ra lỗi, thử lại..."
      : COMPOSER_STATE_LABELS[state];

  return (
    <div className="bg-white border-t border-slate-200 px-4 pt-3 pb-4 safe-area-inset-bottom">
      <div className="mb-2 flex flex-wrap items-center justify-start gap-2">
        <ModeToggle
          mode={parseMode}
          onModeChange={onParseModeChange ?? (() => {})}
          disabled={isLoading || !onParseModeChange}
        />
      </div>

      {/* Suggestions */}
      {shouldShowSuggestions && (
        <PromptSuggestions
          onSuggestionClick={(suggestion) => {
            onParseModeChange?.(suggestion.mode);
            (onSuggestionClick ?? onTextChange)(suggestion.text);
            setShowSuggestions(false);
          }}
        />
      )}

      {/* Error message */}
      {state === "error" && errorMessage && (
        <div className="mb-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between">
          <span className="text-xs text-red-600">{errorMessage}</span>
          <button onClick={onCancel} className="text-red-400 hover:text-red-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Input row */}
      <div className="flex items-end gap-2">
        {/* Textarea */}
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={isLoading && text ? text : text}
            onChange={(e) => {
              onTextChange(e.target.value);
              setShowSuggestions(false);
            }}
            onKeyDown={handleKeyDown}
            onFocus={() => {
              if (state === "idle" && !text) setShowSuggestions(true);
            }}
            placeholder={placeholder}
            readOnly={isLoading}
            rows={1}
            className={[
              "w-full px-4 py-3 pr-10 text-sm outline-none resize-none bg-transparent transition-all",
              "border border-slate-200 rounded-lg",
              "focus:border-blue-500 focus:ring-1 focus:ring-blue-200",
              "placeholder:text-slate-400",
              state === "error"
                ? "bg-red-50 text-red-700"
                : state === "done"
                  ? "bg-green-50 text-green-700"
                  : "",
              isLoading ? "cursor-not-allowed" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            style={{ minHeight: "44px" }}
          />
          {text && !isLoading && (
            <button
              type="button"
              onClick={() => {
                onTextChange("");
                textareaRef.current?.focus();
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              title="Xoa noi dung"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Send / Cancel button */}
        <button
          type="button"
          onClick={isLoading && onCancel ? onCancel : handleSubmit}
          disabled={isLoading ? false : !text.trim()}
          className={[
            "w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 transition-colors",
            "disabled:opacity-40 disabled:cursor-not-allowed",
            isLoading
              ? "bg-slate-200 text-slate-500 hover:bg-slate-300"
              : "bg-blue-600 text-white hover:bg-blue-700",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          {isLoading ? (
            <>
              {state === "generating" ? (
                <div className="flex items-center gap-1">
                  <span className="typing-dot w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" />
                  <span className="typing-dot w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce [animation-delay:.1s]" />
                  <span className="typing-dot w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce [animation-delay:.2s]" />
                </div>
              ) : (
                <X className="w-5 h-5" />
              )}
            </>
          ) : (
            <Send className="w-5 h-5" />
          )}
        </button>
      </div>
    </div>
  );
}
