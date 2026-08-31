"use client";

import { useState } from "react";
import { C, TOP } from "@/lib/theme";
import { useStore } from "@/lib/store";
import { Cover, Overlay, StarPicker, TypeBadge } from "../ui";
import type { Release } from "@/lib/types";

export function RateScreen({
  release, initialRating, initialReview, editing, onBack, onSave, onAskDelete,
}: {
  release: Release;
  initialRating: number;
  initialReview: string;
  editing: boolean;
  onBack: () => void;
  onSave: (rating: number, review: string) => void;
  onAskDelete: () => void;
}) {
  const { settings } = useStore();
  const [rating, setRating] = useState(initialRating);
  const [review, setReview] = useState(initialReview);

  const save = () => onSave(rating, review.trim());

  return (
    <Overlay>
      <div style={{ flex: "none", display: "flex", alignItems: "center", justifyContent: "space-between", padding: `${TOP}px 16px 8px` }}>
        <button onClick={onBack} style={{ flex: 1, height: 30, padding: "0 6px", font: "400 13.5px/1 inherit", color: C.w55, textAlign: "left" }}>
          Cancel
        </button>
        <div style={{ flex: "none", font: "600 15px/1 inherit", letterSpacing: "-.02em" }}>{editing ? "Edit log" : "New log"}</div>
        <button onClick={save} style={{ flex: 1, height: 30, padding: "0 6px", font: "600 13.5px/1 inherit", color: "#fff", textAlign: "right" }}>
          Save
        </button>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "18px 24px 40px", display: "flex", flexDirection: "column", alignItems: "center" }}>
        <Cover release={release} size={132} stripe={6} font={26} border={C.w10} />
        <div style={{ marginTop: 18, font: "600 17px/1.25 inherit", letterSpacing: "-.02em", textAlign: "center" }}>{release.title}</div>
        <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 7 }}>
          <TypeBadge type={release.type} height={15} font={9} />
          <div style={{ flex: "none", whiteSpace: "nowrap", font: "400 13px/1.3 inherit", color: C.w45 }}>{release.artist}</div>
        </div>

        <div style={{ marginTop: 26 }}>
          <StarPicker value={rating} onChange={setRating} size={31} gap={5} halfStars={settings.halfStars} />
        </div>

        <div style={{ width: "100%", marginTop: 28 }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 8 }}>
            <div style={{ font: "500 10px/1 inherit", letterSpacing: ".2em", color: C.w30 }}>REVIEW</div>
            <div style={{ font: "400 10px/1 inherit", color: C.w24 }}>{review.length}/240</div>
          </div>
          <textarea
            value={review}
            onChange={(e) => setReview(e.target.value.slice(0, 240))}
            placeholder="One line on how it landed…"
            style={{
              width: "100%", boxSizing: "border-box", minHeight: 96, resize: "none", padding: 14,
              borderRadius: 5, background: C.w05, border: `1px solid ${C.w07}`, font: "400 14px/1.5 inherit",
            }}
          />
        </div>

        {editing ? (
          <button
            onClick={onAskDelete}
            style={{
              width: "100%", marginTop: 20, height: 41, borderRadius: 5, border: `1px solid ${C.dangerBorder}`,
              background: "transparent", font: "500 13.5px/1 inherit", color: C.danger,
            }}
          >
            Delete
          </button>
        ) : (
          <button
            onClick={save}
            style={{
              width: "100%", marginTop: 20, height: 41, borderRadius: 5, background: C.accent,
              color: "#fff", font: "600 13.5px/1 inherit", letterSpacing: ".02em",
            }}
          >
            Add to diary
          </button>
        )}
      </div>
    </Overlay>
  );
}
