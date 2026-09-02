"use client";

import { useState } from "react";
import { C, TOP } from "@/lib/theme";
import { useStore } from "@/lib/store";
import { Overlay } from "../ui";

const inputStyle: React.CSSProperties = {
  width: "100%", boxSizing: "border-box", height: 41, padding: "0 13px", borderRadius: 5,
  background: C.w05, border: `1px solid ${C.w08}`, fontWeight: 400, fontSize: 14, lineHeight: 1,
};
const capStyle: React.CSSProperties = { fontWeight: 500, fontSize: 10, lineHeight: 1, letterSpacing: ".2em", color: C.w30 };
const headerRow: React.CSSProperties = {
  flex: "none", display: "flex", alignItems: "center", justifyContent: "space-between", padding: `${TOP}px 16px 8px`,
};

/** "Add to lists" — toggle the current release into any of the user's lists. */
export function PickListsScreen({
  releaseId, onBack, onNewList, onNotice,
}: { releaseId: string; onBack: () => void; onNewList: () => void; onNotice: (title: string, body: string) => void }) {
  const { lists, releases, addToList, removeFromList } = useStore();
  const title = releases[releaseId]?.title ?? "This release";

  return (
    <Overlay>
      <div style={headerRow}>
        <button onClick={onBack} style={{ height: 30, padding: "0 6px", fontWeight: 400, fontSize: 13.5, lineHeight: 1, color: C.w55 }}>Cancel</button>
        <div style={{ fontWeight: 600, fontSize: 15, lineHeight: 1, letterSpacing: "-.02em" }}>Add to lists</div>
        <button onClick={onBack} style={{ height: 30, padding: "0 6px", fontWeight: 600, fontSize: 13.5, lineHeight: 1, color: "#fff" }}>Done</button>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "10px 20px 40px" }}>
        <div style={{ fontWeight: 500, fontSize: 13.5, lineHeight: 1.4, color: C.w60, paddingBottom: 12 }}>{title}</div>
        <button
          onClick={onNewList}
          style={{ width: "100%", display: "flex", alignItems: "center", gap: 11, padding: "11px 0", borderBottom: `1px solid ${C.w045}`, textAlign: "left" }}
        >
          <div style={{ flex: "none", width: 26, height: 26, borderRadius: "50%", border: `1px dashed ${C.w22}`, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 400, fontSize: 13, lineHeight: 1, color: C.w50 }}>
            ＋
          </div>
          <div style={{ fontWeight: 500, fontSize: 13.5, lineHeight: 1, color: C.w80 }}>New list</div>
        </button>
        {lists.map((l) => {
          const has = l.ids.includes(releaseId);
          return (
            <button
              key={l.id}
              onClick={() => {
                if (has) return removeFromList(l.id, releaseId);
                if (!addToList(l.id, releaseId)) onNotice("Already in this list", `${title} is already in ${l.name}.`);
              }}
              style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "13px 0", borderBottom: `1px solid ${C.w045}`, textAlign: "left" }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 500, fontSize: 14, lineHeight: 1.3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l.name}</div>
                <div style={{ marginTop: 2, fontWeight: 400, fontSize: 11, lineHeight: 1.3, color: C.w36 }}>
                  {l.ids.length} {l.ids.length === 1 ? "release" : "releases"}
                </div>
              </div>
              <div
                style={{
                  flex: "none", width: 22, height: 22, borderRadius: "50%",
                  border: `1px solid ${has ? C.purBorder : C.w16}`, background: has ? C.accent : "transparent",
                  color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 500, fontSize: 11, lineHeight: 1,
                }}
              >
                {has ? "✓" : ""}
              </div>
            </button>
          );
        })}
      </div>
    </Overlay>
  );
}

export function NewListScreen({ onBack, onCreate }: { onBack: () => void; onCreate: (name: string) => void }) {
  const [name, setName] = useState("");
  const valid = !!name.trim();
  return (
    <Overlay>
      <div style={headerRow}>
        <button onClick={onBack} style={{ height: 30, padding: "0 6px", fontWeight: 400, fontSize: 13.5, lineHeight: 1, color: C.w55 }}>Cancel</button>
        <div style={{ fontWeight: 600, fontSize: 15, lineHeight: 1, letterSpacing: "-.02em" }}>New list</div>
        <button
          onClick={() => valid && onCreate(name.trim())}
          style={{ height: 30, padding: "0 6px", fontWeight: 600, fontSize: 13.5, lineHeight: 1, color: valid ? "#fff" : C.w28 }}
        >
          Create
        </button>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "18px 20px 40px", display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={capStyle}>LIST NAME</div>
        <input value={name} onChange={(e) => setName(e.target.value.slice(0, 40))} placeholder="Sunday morning" autoFocus style={inputStyle} />
      </div>
    </Overlay>
  );
}

export function EditListScreen({
  listId, onBack, onSave, onAskDelete,
}: { listId: string; onBack: () => void; onSave: (name: string, desc: string) => void; onAskDelete: () => void }) {
  const { lists } = useStore();
  const list = lists.find((l) => l.id === listId);
  const [name, setName] = useState(list?.name ?? "");
  const [desc, setDesc] = useState(list?.desc ?? "");
  const valid = !!name.trim();

  return (
    <Overlay z={50}>
      <div style={headerRow}>
        <button onClick={onBack} style={{ height: 30, padding: "0 6px", fontWeight: 400, fontSize: 13.5, lineHeight: 1, color: C.w55 }}>Cancel</button>
        <div style={{ fontWeight: 600, fontSize: 15, lineHeight: 1, letterSpacing: "-.02em" }}>Edit list</div>
        <button
          onClick={() => valid && onSave(name.trim(), desc)}
          style={{ height: 30, padding: "0 6px", fontWeight: 600, fontSize: 13.5, lineHeight: 1, color: valid ? "#fff" : C.w28 }}
        >
          Save
        </button>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "18px 20px 40px", display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={capStyle}>LIST NAME</div>
        <input value={name} onChange={(e) => setName(e.target.value.slice(0, 40))} placeholder="Sunday morning" style={inputStyle} />
        <div style={{ ...capStyle, marginTop: 10 }}>DESCRIPTION</div>
        <textarea
          value={desc}
          onChange={(e) => setDesc(e.target.value.slice(0, 200))}
          placeholder="What holds this list together…"
          style={{ ...inputStyle, height: "auto", minHeight: 84, resize: "none", padding: 13, lineHeight: 1.5 }}
        />
        <button
          onClick={onAskDelete}
          style={{ marginTop: 14, height: 41, borderRadius: 5, border: `1px solid ${C.dangerBorder}`, background: "transparent", fontWeight: 500, fontSize: 13.5, lineHeight: 1, color: C.danger }}
        >
          Delete list
        </button>
      </div>
    </Overlay>
  );
}
