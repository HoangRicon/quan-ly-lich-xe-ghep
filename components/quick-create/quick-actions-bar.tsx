"use client";

import { memo, useRef, useCallback, useState } from "react";
import { Car, Edit2, Copy, Trash2 } from "lucide-react";
import type { DraftItem, SwipeDirection } from "@/lib/quick-create/types";
import { SWIPE_THRESHOLD_ACTION } from "@/lib/quick-create/constants";

interface QuickActionsBarProps {
  item: DraftItem;
  children: React.ReactNode;
  onCreateRide?: (item: DraftItem) => void;
  onEdit?: (item: DraftItem) => void;
  onDuplicate?: (item: DraftItem) => void;
  onDelete?: (item: DraftItem) => void;
  disabled?: boolean;
}

export const QuickActionsBar = memo(function QuickActionsBar({
  item,
  children,
  onCreateRide,
  onEdit,
  onDuplicate,
  onDelete,
  disabled = false,
}: QuickActionsBarProps) {
  const [direction, setDirection] = useState<SwipeDirection>(null);
  const [triggered, setTriggered] = useState(false);
  const startX = useRef(0);
  const cardRef = useRef<HTMLDivElement>(null);

  const reset = useCallback(() => {
    setDirection(null);
    setTriggered(false);
  }, []);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (disabled) return;
    startX.current = e.clientX;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }, [disabled]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (disabled) return;
    const delta = e.clientX - startX.current;
    if (Math.abs(delta) > 10) {
      setDirection(delta < 0 ? "left" : "right");
    } else {
      setDirection(null);
    }
  }, [disabled]);

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    if (disabled) return;
    const delta = e.clientX - startX.current;
    if (delta < -SWIPE_THRESHOLD_ACTION && onCreateRide) {
      setTriggered(true);
      setTimeout(() => {
        onCreateRide(item);
        reset();
        setTriggered(false);
      }, 200);
    } else if (delta > SWIPE_THRESHOLD_ACTION) {
      // Right swipe — let the card handle via long-press/multi-select
      reset();
    } else {
      reset();
    }
  }, [disabled, item, onCreateRide, reset]);

  const translateX = direction === "left" ? "-80px" : direction === "right" ? "80px" : "0";
  const isTriggered = triggered || direction !== null;

  const isSaved = item.status === "saved" || item.status === "auto_saved" || !!item.createdTripId;
  const isFailed = item.status === "failed";

  return (
    <div className="relative overflow-hidden rounded-lg">
      {/* Left swipe action (revealed from right) */}
      <div
        className={[
          "absolute inset-y-0 right-0 w-20 flex items-center justify-center bg-blue-600 transition-opacity",
          direction === "left" && !triggered ? "opacity-100" : "",
          direction === "left" && triggered ? "opacity-0" : "",
          !direction ? "opacity-0" : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <button
          onClick={() => { onCreateRide?.(item); reset(); }}
          className="flex flex-col items-center gap-1 text-white"
        >
          <Car className="w-5 h-5" />
          <span className="text-[10px] font-semibold">Tạo xe</span>
        </button>
      </div>

      {/* Right swipe actions (revealed from left) */}
      <div
        className={[
          "absolute inset-y-0 left-0 flex items-center gap-1 px-2 transition-opacity",
          direction === "right" ? "opacity-100" : "opacity-0",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {!isSaved && !isFailed && onEdit && (
          <button
            onClick={() => { onEdit(item); reset(); }}
            className="w-10 h-10 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center"
          >
            <Edit2 className="w-4 h-4" />
          </button>
        )}
        {onDuplicate && (
          <button
            onClick={() => { onDuplicate(item); reset(); }}
            className="w-10 h-10 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-700 flex items-center justify-center"
          >
            <Copy className="w-4 h-4" />
          </button>
        )}
        {!isSaved && !isFailed && onDelete && (
          <button
            onClick={() => { onDelete(item); reset(); }}
            className="w-10 h-10 rounded-lg bg-red-100 hover:bg-red-200 text-red-600 flex items-center justify-center"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Card with swipe transform */}
      <div
        ref={cardRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={reset}
        style={{
          transform: translateX,
          transition: isTriggered ? "none" : "transform 0.2s ease-out",
        }}
      >
        {children}
      </div>
    </div>
  );
});
