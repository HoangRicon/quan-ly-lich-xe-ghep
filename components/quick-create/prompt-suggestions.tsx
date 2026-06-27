"use client";

import {
  PROMPT_SUGGESTIONS,
  type PromptSuggestion,
} from "@/lib/quick-create/constants";

interface PromptSuggestionsProps {
  onSuggestionClick?: (suggestion: PromptSuggestion) => void;
}

export function PromptSuggestions({ onSuggestionClick }: PromptSuggestionsProps) {
  return (
    <div className="mb-2">
      <p className="mb-1 px-1 text-[10px] font-medium text-slate-400">
        Gợi ý nhanh:
      </p>
      <div className="flex flex-wrap gap-1.5">
        {PROMPT_SUGGESTIONS.map((suggestion) => (
          <button
            key={suggestion.text}
            type="button"
            onClick={() => onSuggestionClick?.(suggestion)}
            className={[
              "flex min-h-8 max-w-full items-center gap-1.5 rounded-full border px-3 py-1.5 text-left text-xs transition-colors",
              suggestion.mode === "smart"
                ? "border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100"
                : "border-slate-200 bg-slate-100 text-slate-700 hover:bg-white",
            ].join(" ")}
          >
            <span
              className={[
                "flex-shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold",
                suggestion.mode === "smart"
                  ? "bg-blue-600 text-white"
                  : "bg-slate-800 text-white",
              ].join(" ")}
            >
              {suggestion.label}
            </span>
            <span className="min-w-0 break-words">{suggestion.text}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
