"use client";

import { memo } from "react";
import { X, Car, Trash2 } from "lucide-react";

interface MultiSelectToolbarProps {
  count: number;
  onCreateAll?: () => void;
  onDeleteAll?: () => void;
  onClear?: () => void;
  isCreating?: boolean;
  isDeleting?: boolean;
}

export const MultiSelectToolbar = memo(function MultiSelectToolbar({
  count,
  onCreateAll,
  onDeleteAll,
  onClear,
  isCreating = false,
  isDeleting = false,
}: MultiSelectToolbarProps) {
  if (count === 0) return null;

  return (
    <div className="sticky top-12 z-40 bg-blue-600 px-4 py-2 flex items-center justify-between gap-3 shadow-lg">
      <button
        onClick={onClear}
        className="flex items-center gap-2 text-white hover:bg-white/10 px-2 py-1 rounded-lg transition-colors"
      >
        <X className="w-4 h-4" />
        <span className="text-sm font-semibold">{count} đã chọn</span>
      </button>

      <div className="flex items-center gap-2">
        {onCreateAll && (
          <button
            onClick={onCreateAll}
            disabled={isCreating}
            className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
          >
            {isCreating ? (
              <div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin" />
            ) : (
              <Car className="w-4 h-4" />
            )}
            Tạo tất cả
          </button>
        )}
        {onDeleteAll && (
          <button
            onClick={onDeleteAll}
            disabled={isDeleting}
            className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
          >
            {isDeleting ? (
              <div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4" />
            )}
            Xóa
          </button>
        )}
      </div>
    </div>
  );
});
