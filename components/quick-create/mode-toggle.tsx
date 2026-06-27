"use client";

import { FileText, Sparkles } from "lucide-react";
import type { ParseMode } from "@/lib/quick-create/types";

interface ModeToggleProps {
  mode: ParseMode;
  onModeChange: (mode: ParseMode) => void;
  disabled?: boolean;
}

const MODE_OPTIONS = [
  {
    value: "rule",
    label: "Nhanh",
    title: "Phân tích nhanh",
    description: "Dùng khi prompt rõ ràng, có cấu trúc",
    Icon: FileText,
  },
  {
    value: "smart",
    label: "Sâu",
    title: "Phân tích sâu",
    description: "Dùng khi prompt phức tạp, nhiều ý lạ, thiếu thông tin",
    Icon: Sparkles,
  },
] as const;

export function ModeToggle({
  mode,
  onModeChange,
  disabled = false,
}: ModeToggleProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
        Chế độ
      </span>
      <div
        role="radiogroup"
        aria-label="Chế độ phân tích"
        className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-0.5"
      >
        {MODE_OPTIONS.map(({ value, label, title, description, Icon }) => {
          const isSelected = mode === value;

          return (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={isSelected}
              disabled={disabled}
              onClick={() => onModeChange(value)}
              title={`${title}: ${description}`}
              className={[
                "flex min-h-8 min-w-12 items-center justify-center gap-1.5 rounded-md px-2.5 text-xs font-bold transition-colors",
                "disabled:cursor-not-allowed disabled:opacity-50",
                isSelected && value === "smart"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "",
                isSelected && value === "rule"
                  ? "bg-slate-800 text-white shadow-sm"
                  : "",
                !isSelected
                  ? "text-slate-500 hover:bg-white hover:text-slate-800"
                  : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
