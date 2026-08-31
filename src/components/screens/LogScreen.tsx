"use client";

import { C, TOP_LOG } from "@/lib/theme";
import { placeholderRelease } from "@/lib/cover";
import { useDragReorder, useRowGestures } from "@/lib/gestures";
import { useStore } from "@/lib/store";
import { Cover, EmptyStars, EmptyState, Stars, TypeBadge, PlusButton } from "../ui";

export type Seg = "diary" | "lists" | "tolisten";

const EditIcon = (
  <svg width="15" height="15" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 16l1-3 9-9 2 2-9 9-3 1z" />
  </svg>
);
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

const actionBtn = (bg: string, fg: string): React.CSSProperties => ({
  width: 82, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
  gap: 5, background: bg, color: fg, font: "600 9px/1 inherit", letterSpacing: ".16em",
});

type Props = {
  seg: Seg;
  onSeg: (s: Seg) => void;
  onProfile: () => void;
  onAdd: () => void;
  onOpenRelease: (id: string) => void;
  onHold: (id: string) => void;
  onEditEntry: (id: string) => void;
  onAskDeleteEntry: (id: string) => void;
  onOpenList: (listId: string) => void;
  onEditList: (listId: string) => void;
  onAskDeleteList: (listId: string) => void;
  onNewList: () => void;
};

export function LogScreen(p: Props) {
  const store = useStore();
  const { releases, entries, queue, lists, liked, profile } = store;
  const rel = (id: string) => releases[id] ?? placeholderRelease(id);

  const g = useRowGestures(p.onHold);

  const queueDrag = useDragReorder({
    order: queue,
    rowAttr: "data-queue-row",
    onPreview: store.reorderQueue,
    onCommit: store.reorderQueue,
    setDragging: g.setDragging,
  });

  const initials =
    (profile.displayName || profile.username || "")
      .split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase() || "··";

  const segBtn = (key: Seg, label: string) => (
    <button
      onClick={() => p.onSeg(key)}
      style={{
        flex: 1, height: 26, borderRadius: 4, font: "500 11.5px/1 inherit", transition: "background .16s",
        background: p.seg === key ? C.segActive : "transparent",
        color: p.seg === key ? C.on : C.off,
      }}
    >
      {label}
    </button>
  );

  const addTitle = p.seg === "lists" ? "New list" : p.seg === "tolisten" ? "Add to queue" : "Log a release";

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <div style={{ flex: "none", padding: `${TOP_LOG}px 20px 14px`, borderBottom: `1px solid ${C.w07}` }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <button
            onClick={p.onProfile}
            style={{
              width: 34, height: 34, borderRadius: "50%", background: "#1d1d21", border: `1px solid ${C.w12}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              font: "500 11px/1 inherit", letterSpacing: ".04em", color: C.w72,
            }}
          >
            {initials}
          </button>
          <div style={{ font: "700 17px/1 inherit", letterSpacing: "-.03em", color: C.w92 }}>earwrm</div>
          <div style={{ width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <PlusButton onClick={p.seg === "lists" ? p.onNewList : p.onAdd} title={addTitle} />
          </div>
        </div>
        <div style={{ display: "flex", gap: 3, padding: 2, marginTop: 20, background: C.w055, borderRadius: 6 }}>
          {segBtn("diary", "Diary")}
          {segBtn("lists", "Lists")}
          {segBtn("tolisten", "Queue")}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "0 20px 128px" }}>
        {/* ------------------------------------------------------------ diary */}
        {p.seg === "diary" && (
          <div>
            {entries.map((e) => {
              const a = rel(e.releaseId);
              const sw = g.swipeProps(`d:${e.releaseId}`);
              return (
                <div key={e.releaseId} style={{ position: "relative", overflow: "hidden" }}>
                  <div style={{ position: "absolute", top: 0, right: 0, bottom: 0, display: "flex", opacity: sw.actionOpacity }}>
                    <button onClick={() => p.onEditEntry(e.releaseId)} style={actionBtn(C.accent, "#fff")}>{EditIcon}EDIT</button>
                    <button onClick={() => p.onAskDeleteEntry(e.releaseId)} style={actionBtn(C.danger, C.dangerFg)}>{TrashIcon}DELETE</button>
                  </div>
                  <div {...sw.handlers} style={{ background: C.bg, ...sw.style }}>
                    <button
                      {...g.tapProps(e.releaseId, () => p.onOpenRelease(e.releaseId))}
                      style={{ width: "100%", display: "flex", gap: 14, textAlign: "left", padding: "13px 0", borderBottom: `1px solid ${C.w055}` }}
                    >
                      <Cover release={a} size={66} stripe={5} font={15} />
                      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 4, paddingTop: 2 }}>
                        <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                          <div style={{ flex: 1, minWidth: 0, font: "600 14.5px/1.25 inherit", letterSpacing: "-.015em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {a.title}
                          </div>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
                          <TypeBadge type={a.type} />
                          <div style={{ font: "400 12.5px/1.2 inherit", color: C.w45, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {a.artist}
                          </div>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 1 }}>
                          {e.rating > 0 ? <Stars value={e.rating} size={12.5} /> : <EmptyStars size={12.5} />}
                          {liked[e.releaseId] && <span style={{ flex: "none", fontSize: 11, lineHeight: 1, color: C.accentLt }}>♥</span>}
                        </div>
                        {!!e.review && (
                          <div style={{ font: "400 12.5px/1.45 inherit", color: C.w62, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {e.review}
                          </div>
                        )}
                      </div>
                    </button>
                  </div>
                </div>
              );
            })}
            {entries.length === 0 && (
              <EmptyState title="Your diary is empty">
                Click the <span style={{ color: C.w75 }}>+</span> in the top right to log the last record you played and it will show up here, newest first.
              </EmptyState>
            )}
          </div>
        )}

        {/* ------------------------------------------------------------ lists */}
        {p.seg === "lists" && (
          <div style={{ paddingTop: 8 }}>
            {lists.map((l) => {
              const sw = g.swipeProps(`l:${l.id}`);
              return (
                <div key={l.id} style={{ position: "relative", overflow: "hidden" }}>
                  <div style={{ position: "absolute", top: 0, right: 0, bottom: 0, display: "flex", opacity: sw.actionOpacity }}>
                    <button onClick={() => p.onEditList(l.id)} style={actionBtn(C.accent, "#fff")}>{EditIcon}EDIT</button>
                    <button onClick={() => p.onAskDeleteList(l.id)} style={actionBtn(C.danger, C.dangerFg)}>{TrashIcon}DELETE</button>
                  </div>
                  <div {...sw.handlers} style={{ background: C.bg, ...sw.style }}>
                    <button
                      onClick={() => {
                        if (g.swipeKey) return g.closeSwipe();
                        p.onOpenList(l.id);
                      }}
                      style={{ width: "100%", display: "flex", flexDirection: "column", gap: 9, padding: "14px 0", borderBottom: `1px solid ${C.w045}`, textAlign: "left" }}
                    >
                      <div style={{ display: "flex", alignItems: "baseline", gap: 10, width: "100%" }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ font: "600 16px/1.2 inherit", letterSpacing: "-.02em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {l.name}
                          </div>
                          {!!l.desc && (
                            <div style={{ marginTop: 5, font: "400 12px/1.45 inherit", color: C.w40, textWrap: "pretty" }}>{l.desc}</div>
                          )}
                        </div>
                        <div style={{ flex: "none", font: "400 10.5px/1.2 inherit", color: C.w32 }}>{l.ids.length}</div>
                      </div>
                      <div style={{ display: "flex", overflow: "hidden", width: "100%" }}>
                        {l.ids.slice(0, 8).map((id) => (
                          <div key={id} style={{ marginRight: -12 }}>
                            <Cover release={rel(id)} size={52} stripe={5} font={11} border="rgba(10,10,11,.9)" />
                          </div>
                        ))}
                      </div>
                    </button>
                  </div>
                </div>
              );
            })}
            {lists.length === 0 && (
              <EmptyState title="No lists yet">
                Click the <span style={{ color: C.w75 }}>+</span> in the top right to create a new list. Group them however you like.
              </EmptyState>
            )}
          </div>
        )}

        {/* ------------------------------------------------------------ queue */}
        {p.seg === "tolisten" && (
          <div style={{ paddingTop: 6 }}>
            {queue.map((id) => {
              const a = rel(id);
              const sw = g.swipeProps(`q:${id}`, { commit: true, onCommit: () => store.removeFromQueue(id) });
              const isDrag = queueDrag.dragId === id;
              return (
                <div key={id} style={{ position: "relative", overflow: "hidden" }}>
                  <div style={{ position: "absolute", top: 0, right: 0, bottom: 0, display: "flex", justifyContent: "flex-end", opacity: sw.actionOpacity }}>
                    <button onClick={() => store.removeFromQueue(id)} style={{ ...actionBtn(C.danger, C.dangerFg), width: sw.deleteWidth }}>
                      {TrashIcon}DELETE
                    </button>
                  </div>
                  <div
                    data-queue-row="1"
                    {...sw.handlers}
                    style={{
                      display: "flex", alignItems: "center", gap: 12, padding: "11px 0",
                      borderBottom: `1px solid ${C.w045}`,
                      background: isDrag ? C.w06 : C.bg, opacity: isDrag ? 0.85 : 1, ...sw.style,
                    }}
                  >
                    <button {...g.tapProps(id, () => p.onOpenRelease(id))} style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 12, textAlign: "left" }}>
                      <Cover release={a} size={44} radius={4} stripe={4} font={10} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ font: "500 14px/1.3 inherit", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.title}</div>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0, marginTop: 2 }}>
                          <TypeBadge type={a.type} />
                          <div style={{ font: "400 11.5px/1.3 inherit", color: C.w40, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {a.artist}
                          </div>
                        </div>
                      </div>
                    </button>
                    <div
                      title="Drag to reorder"
                      onPointerDown={queueDrag.dragStart(id)}
                      style={{ flex: "none", width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", color: C.w30, cursor: "grab", touchAction: "none" }}
                    >
                      {GripIcon}
                    </div>
                  </div>
                </div>
              );
            })}
            {queue.length === 0 && (
              <EmptyState title="Your queue is empty">
                Click the <span style={{ color: C.w75 }}>+</span> in the top right to add a record you want to listen to, but haven&rsquo;t yet
              </EmptyState>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
