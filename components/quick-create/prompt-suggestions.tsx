"use client";

import { PROMPT_SUGGESTIONS } from "@/lib/quick-create/constants";

interface PromptSuggestionsProps {
  onSuggestionClick?: (text: string) => void;
}

export function PromptSuggestions({ onSuggestionClick }: PromptSuggestionsProps) {
  return (
    <div className="mb-2">
      <p className="text-[10px] text-slate-400 font-medium mb-1 px-1">Gợi ý nhanh:</p>
      <div className="flex flex-wrap gap-1.5">
        {PROMPT_SUGGESTIONS.map((suggestion) => (
          <button
            key={suggestion}
            type="button"
            onClick={() => onSuggestionClick?.(suggestion)}
            className="px-3 py-1.5 bg-slate-100 hover:bg-blue-100 hover:text-blue-700 text-slate-600 text-xs rounded-full border border-slate-200 hover:border-blue-200 transition-colors text-left"
          >
            {suggestion}
          </button>
        ))}
      </div>
    </div>
  );
}
