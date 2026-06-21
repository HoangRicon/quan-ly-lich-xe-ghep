"use client";

import { useRef, useCallback, useState } from "react";

interface UsePullToRefreshOptions {
  /** Minimum pull distance (px) to trigger refresh */
  threshold?: number;
  /** Callback when pull threshold is reached */
  onRefresh: () => Promise<void>;
  /** Whether refresh is currently running */
  isRefreshing?: boolean;
}

interface PullState {
  pulling: boolean;
  /** 0–1+ progress relative to threshold */
  progress: number;
}

/**
 * Pull-to-refresh hook.
 * Attach the returned handlers to the scroll container element.
 * Set overscroll-behavior: contain on that element to prevent browser pull-to-refresh
 * from overriding the custom indicator.
 */
export function usePullToRefresh({
  threshold = 72,
  onRefresh,
  isRefreshing = false,
}: UsePullToRefreshOptions) {
  const [state, setState] = useState<PullState>({ pulling: false, progress: 0 });

  const startY = useRef<number>(0);
  const started = useRef(false);
  const fired = useRef(false);

  const onPointerDown = useCallback((e: React.PointerEvent | React.TouchEvent) => {
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    startY.current = clientY;
    started.current = true;
    fired.current = false;
    setState({ pulling: false, progress: 0 });
  }, []);

  const onPointerMove = useCallback(
    (e: React.PointerEvent | React.TouchEvent) => {
      if (!started.current || isRefreshing) return;

      const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
      const delta = clientY - startY.current;

      if (delta <= 0) {
        started.current = false;
        setState({ pulling: false, progress: 0 });
        return;
      }

      // Resist: reduce pull contribution as user scrolls down
      const resisted = delta * 0.4;
      const progress = Math.min(resisted / threshold, 1.6);
      setState({ pulling: true, progress });
    },
    [threshold, isRefreshing],
  );

  const onPointerUp = useCallback(async () => {
    if (!started.current) return;
    started.current = false;

    if (state.progress >= 1 && !fired.current && !isRefreshing) {
      fired.current = true;
      setState({ pulling: false, progress: 0 });
      try {
        await onRefresh();
      } catch {
        // handled by caller
      }
    } else {
      setState({ pulling: false, progress: 0 });
    }
  }, [state.progress, isRefreshing, onRefresh]);

  return {
    pullState: state,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel: onPointerUp,
      // Also handle touch events for mobile
      onTouchStart: onPointerDown as unknown as React.TouchEventHandler<HTMLElement>,
      onTouchMove: onPointerMove as unknown as React.TouchEventHandler<HTMLElement>,
      onTouchEnd: onPointerUp as unknown as React.TouchEventHandler<HTMLElement>,
    },
  };
}
