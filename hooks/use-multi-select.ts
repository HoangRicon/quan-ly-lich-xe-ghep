/**
 * Multi-select state hook.
 */

import { useState, useCallback } from "react";

export function useMultiSelect() {
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [isSelecting, setIsSelecting] = useState(false);

  const enterSelectMode = useCallback(() => {
    setIsSelecting(true);
  }, []);

  const exitSelectMode = useCallback(() => {
    setIsSelecting(false);
    setSelectedIds(new Set());
  }, []);

  const toggle = useCallback((id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const selectAll = useCallback((ids: number[]) => {
    setSelectedIds(new Set(ids));
  }, []);

  const isSelected = useCallback(
    (id: number) => selectedIds.has(id),
    [selectedIds],
  );

  return {
    selectedIds,
    isSelecting,
    isSelected,
    toggle,
    selectAll,
    enterSelectMode,
    exitSelectMode,
    count: selectedIds.size,
  };
}
