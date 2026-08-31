"use client";

import { C, TOP } from "@/lib/theme";
import { placeholderRelease } from "@/lib/cover";
import { useDragReorder, useRowGestures } from "@/lib/gestures";
import { useStore } from "@/lib/store";
import { BackButton, Cover, Overlay, PlusButton, TypeBadge } from "../ui";

const TrashIcon = (
  <svg width="15" height="15" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="4" y1="6" x2="16" y2="6" /><path d="M6 6v10h8V6" /><line x1="8.2" y1="4" x2="11.8" y2="4" />
  </svg>
);
const GripIcon = (
  <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
    <line x1="4" y1="6" x2="16" y2="6" /><line x1="4" y1="10" x2="16" y2="10" /><line x1="4" y1="14" x2="16" y2="14" />
  </svg>
);

export function ListScreen({
  listId, onBack, onAdd, onOpenRelease, onHold,
}: { listId: string; onBack: () => void; onAdd: () => void; onOpenRelease: (id: string) => void; onHold: (id: string) => void }) {
  const store = useStore();
  const list = store.lists.find((l) => l.id === listId);
  const rel = (id: string) => store.releases[id] ?? placeholderRelease(id);
  const g = useRowGestures(onHold);

  const drag = useDragReorder({
    order: list?.ids ?? [],
    rowAttr: "data-list-row",
    onPreview: (ids) => store.reorderList(listId, ids),
    onCommit: (ids) => store.reorderList(listId, ids),
    setDragging: g.setDragging,
  });

  if (!list) return null;

  return (
    <Overlay>
      <div style={{ flex: "none", display: "flex", alignItems: "center", justifyContent: "space-between", padding: `${TOP}px 16px 8px` }}>
        <BackButton onClick={onBack} style={{ marginLeft: -6 }} />
        <PlusButton onClick={onAdd} title="Add to list" />
      </div>
      <div style={{ flex: "none", padding: "2px 20px 0" }}>
        <div style={{ font: "600 22px/1.15 inherit", letterSpacing: "-.028em", textWrap: "pretty" }}>{list.name}</div>
        {!!list.desc && (
          <div style={{ marginTop: 6, font: "400 12.5px/1.5 inherit", color: C.w42, textWrap: "pretty" }}>{list.desc}</div>
        )}
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "0 20px 40px" }}>
        <div style={{ display: "flex", justifyContent: "flex-end", padding: "14px 0 10px", borderBottom: `1px solid ${C.w07}`, font: "400 10.5px/1.2 inherit", color: C.w32 }}>
          {list.ids.length}
        </div>
        {list.ids.map((id) => {
          const a = rel(id);
          const sw = g.swipeProps(`li:${id}`, { commit: true, onCommit: () => store.removeFromList(listId, id) });
          return (
            <div key={id} style={{ position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", top: 0, right: 0, bottom: 0, display: "flex", justifyContent: "flex-end", opacity: sw.actionOpacity }}>
                <button
                  onClick={() => store.removeFromList(listId, id)}
                  style={{
                    width: sw.deleteWidth, display: "flex", flexDirection: "column", alignItems: "center",
                    justifyContent: "center", gap: 5, background: C.danger, color: C.dangerFg,
                    font: "600 9px/1 inherit", letterSpacing: ".16em",
                  }}
                >
                  {TrashIcon}DELETE
                </button>
              </div>
              <div
                data-list-row="1"
                {...sw.handlers}
                style={{
                  display: "flex", alignItems: "center", gap: 10, padding: "10px 0",
                  borderBottom: `1px solid ${C.w045}`, background: C.bg,
                  opacity: drag.dragId === id ? 0.85 : 1, ...sw.style,
                }}
              >
                <button {...g.tapProps(id, () => onOpenRelease(id))} style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 12, textAlign: "left" }}>
                  <Cover release={a} size={44} stripe={4} font={10} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ font: "500 14px/1.3 inherit", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.title}</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0, marginTop: 2 }}>
                      <TypeBadge type={a.type} />
                      <div style={{ font: "400 11.5px/1.3 inherit", color: C.w40, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.artist}</div>
                    </div>
                  </div>
                </button>
                <div
                  title="Drag to reorder"
                  onPointerDown={drag.dragStart(id)}
                  style={{ flex: "none", width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", color: C.w30, cursor: "grab", touchAction: "none" }}
                >
                  {GripIcon}
                </div>
              </div>
            </div>
          );
        })}
        {list.ids.length === 0 && (
          <div style={{ padding: "64px 8px", textAlign: "center", font: "400 13px/1.5 inherit", color: C.w40 }}>
            Nothing in this list yet.
          </div>
        )}
      </div>
    </Overlay>
  );
}
