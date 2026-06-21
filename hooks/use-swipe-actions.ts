/**
 * Swipe actions state hook.
 */

import { useState, useCallback } from "react";
import type { SwipeDirection } from "@/lib/quick-create/types";
import {
  SWIPE_THRESHOLD_REVEAL,
  SWIPE_THRESHOLD_ACTION,
} from "@/lib/quick-create/constants";

export interface UseSwipeActionsReturn {
  swipeDirection: SwipeDirection;
  isRevealed: boolean;
  isActionTriggered: boolean;
  onPointerDown: (e: React.PointerEvent) => void;
  onPointerMove: (e: React.PointerEvent, cardRef: React.RefObject<HTMLElement | null>) => void;
  onPointerUp: (e: React.PointerEvent) => void;
  resetSwipe: () => void;
}

export function useSwipeActions(): UseSwipeActionsReturn {
  const [swipeDirection, setSwipeDirection] = useState<SwipeDirection>(null);
  const [isActionTriggered, setIsActionTriggered] = useState(false);
  const startX = { current: 0 };

  const resetSwipe = useCallback(() => {
    setSwipeDirection(null);
    setIsActionTriggered(false);
  }, []);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    startX.current = e.clientX;
  }, []);

  const onPointerMove = useCallback(
    (_e: React.PointerEvent, _cardRef: React.RefObject<HTMLElement | null>) => {
      // Direction is determined on pointer up
    },
    [],
  );

  const onPointerUp = useCallback(
    (e: React.PointerEvent) => {
      const deltaX = e.clientX - startX.current;

      if (Math.abs(deltaX) < SWIPE_THRESHOLD_REVEAL) {
        setSwipeDirection(null);
        setIsActionTriggered(false);
        return;
      }

      if (deltaX < -SWIPE_THRESHOLD_ACTION) {
        setSwipeDirection("left");
        setIsActionTriggered(true);
      } else if (deltaX > SWIPE_THRESHOLD_ACTION) {
        setSwipeDirection("right");
        setIsActionTriggered(true);
      } else if (deltaX < 0) {
        setSwipeDirection("left");
        setIsActionTriggered(false);
      } else {
        setSwipeDirection("right");
        setIsActionTriggered(false);
      }
    },
    [],
  );

  return {
    swipeDirection,
    isRevealed: swipeDirection !== null,
    isActionTriggered,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    resetSwipe,
  };
}
