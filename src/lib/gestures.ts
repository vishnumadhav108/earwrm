"use client";

import { useCallback, useRef, useState } from "react";

const OPEN_AT = -48;      // past this, the row latches open
const COMMIT_AT = -170;   // past this, a delete-only row fires immediately
const TWO_ACTION_W = -164; // Edit + Delete, 82px each
const ONE_ACTION_W = -88;  // Delete only

/**
 * Swipe-to-reveal plus long-press, shared by every list row in the app.
 * Only one row is open at a time. Mirrors the prototype's swipe handlers:
 * a short drag latches the row open, a long drag past COMMIT_AT commits the
 * destructive action outright, and a tap that ended a drag is swallowed.
 */
export function useRowGestures(onHold?: (key: string) => void) {
  const [swipeKey, setSwipeKey] = useState<string | null>(null);
  const [swipeDx, setSwipeDx] = useState(0);

  const active = useRef<{ key: string; x0: number; commit: boolean; onCommit?: () => void; moved: boolean } | null>(null);
  const suppressTap = useRef(false);
  const pressed = useRef(false);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dragging = useRef(false);

  const closeSwipe = useCallback(() => {
    setSwipeKey(null);
    setSwipeDx(0);
  }, []);

  const endHold = useCallback(() => {
    if (holdTimer.current) clearTimeout(holdTimer.current);
    holdTimer.current = null;
  }, []);

  const beginHold = useCallback((key: string) => {
    pressed.current = false;
    endHold();
    if (!onHold) return;
    holdTimer.current = setTimeout(() => {
      pressed.current = true;
      onHold(key);
    }, 380);
  }, [onHold, endHold]);

  const setDragging = useCallback((v: boolean) => {
    dragging.current = v;
  }, []);

  /** Props for the sliding surface of a row. */
  const swipeProps = useCallback((key: string, opts?: { commit?: boolean; onCommit?: () => void }) => {
    const commit = !!opts?.commit;
    const isOpen = swipeKey === key;
    const dx = isOpen ? swipeDx : 0;

    return {
      handlers: {
        onPointerDown: (e: React.PointerEvent) => {
          if (dragging.current) return;
          active.current = { key, x0: e.clientX, commit, onCommit: opts?.onCommit, moved: false };
          if (swipeKey && swipeKey !== key) closeSwipe();
        },
        onPointerMove: (e: React.PointerEvent) => {
          const a = active.current;
          if (!a) return;
          const next = Math.max(-240, Math.min(0, e.clientX - a.x0));
          if (next < -4) {
            a.moved = true;
            endHold();
          }
          if (a.moved) {
            setSwipeKey(a.key);
            setSwipeDx(next);
          }
        },
        onPointerUp: () => {
          const a = active.current;
          active.current = null;
          endHold();
          if (!a || !a.moved) return;
          suppressTap.current = true;
          setTimeout(() => (suppressTap.current = false), 260);
          if (a.commit && swipeDx <= COMMIT_AT) {
            closeSwipe();
            a.onCommit?.();
            return;
          }
          const open = swipeDx <= OPEN_AT;
          setSwipeKey(open ? a.key : null);
          setSwipeDx(open ? (a.commit ? ONE_ACTION_W : TWO_ACTION_W) : 0);
        },
        onPointerCancel: () => {
          active.current = null;
          endHold();
        },
      },
      /** Style for the sliding surface. */
      style: { transform: `translateX(${dx}px)`, transition: "transform .16s", touchAction: "pan-y" as const },
      /** Style for the action strip revealed underneath. */
      actionOpacity: isOpen ? 1 : 0,
      deleteWidth: `${Math.max(88, -dx)}px`,
    };
  }, [swipeKey, swipeDx, closeSwipe, endHold]);

  /** Props for the tappable button inside a row. */
  const tapProps = useCallback((key: string, onOpen: () => void) => ({
    onClick: () => {
      if (suppressTap.current) return;
      if (swipeKey) return closeSwipe();
      if (pressed.current) {
        pressed.current = false;
        return;
      }
      onOpen();
    },
    onPointerDown: () => beginHold(key),
    onPointerUp: endHold,
    onPointerLeave: endHold,
    onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
  }), [swipeKey, closeSwipe, beginHold, endHold]);

  return { swipeKey, closeSwipe, swipeProps, tapProps, setDragging };
}

/**
 * Drag-to-reorder. The order is recomputed live from how many cell-lengths the
 * pointer has travelled, then committed once on release. The queue and
 * list-detail rows stack vertically; the profile's favourites are a horizontal
 * grid, so that one measures along x instead.
 */
export function useDragReorder({
  order, rowAttr, onPreview, onCommit, setDragging, axis = "y", gap = 0,
}: {
  order: string[];
  rowAttr: string;
  onPreview: (ids: string[]) => void;
  onCommit: (ids: string[]) => void;
  setDragging?: (v: boolean) => void;
  axis?: "x" | "y";
  gap?: number;
}) {
  const [dragId, setDragId] = useState<string | null>(null);
  const base = useRef<string[]>([]);
  const cell = useRef(66);
  const start0 = useRef(0);
  const latest = useRef<string[]>([]);

  const start = useCallback((id: string) => (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const row = (e.currentTarget as HTMLElement).closest(`[${rowAttr}]`);
    const box = row?.getBoundingClientRect();
    cell.current = (axis === "x" ? box?.width : box?.height) ?? 66;
    cell.current += gap;
    start0.current = axis === "x" ? e.clientX : e.clientY;
    base.current = order.slice();
    latest.current = order.slice();
    setDragId(id);
    setDragging?.(true);

    const move = (ev: PointerEvent) => {
      const from = base.current.indexOf(id);
      const pos = axis === "x" ? ev.clientX : ev.clientY;
      const steps = Math.round((pos - start0.current) / cell.current);
      const to = Math.max(0, Math.min(base.current.length - 1, from + steps));
      const next = base.current.filter((x) => x !== id);
      next.splice(to, 0, id);
      if (next.join("|") !== latest.current.join("|")) {
        latest.current = next;
        onPreview(next);
      }
    };
    const end = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", end);
      window.removeEventListener("pointercancel", end);
      setDragId(null);
      setDragging?.(false);
      if (latest.current.join("|") !== base.current.join("|")) onCommit(latest.current);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", end);
    window.addEventListener("pointercancel", end);
  }, [order, rowAttr, onPreview, onCommit, setDragging, axis, gap]);

  return { dragId, dragStart: start };
}
