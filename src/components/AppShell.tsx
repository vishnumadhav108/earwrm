"use client";

import { useEffect, useState } from "react";
import { C } from "@/lib/theme";
import { placeholderRelease } from "@/lib/cover";
import { createClient } from "@/lib/supabase/client";
import { useStore } from "@/lib/store";
import { Dialog } from "./ui";
import { TabBar, type Tab } from "./TabBar";
import { ActionSheet } from "./ActionSheet";
import { LogScreen, type Seg } from "./screens/LogScreen";
import { ComingSoonScreen } from "./screens/ComingSoonScreen";
import { SearchScreen, type SearchMode } from "./screens/SearchScreen";
import { RateScreen } from "./screens/RateScreen";
import { ReleaseScreen } from "./screens/ReleaseScreen";
import { ProfileScreen } from "./screens/ProfileScreen";
import { SettingsScreen } from "./screens/SettingsScreen";
import { ListScreen } from "./screens/ListScreen";
import { EditListScreen, NewListScreen, PickListsScreen } from "./screens/ListFormScreens";
import type { Release } from "@/lib/types";

type Overlay = "search" | "rate" | "album" | "profile" | "settings" | "list" | "pick" | "newlist" | "editlist";

export function AppShell() {
  const store = useStore();

  const [tab, setTab] = useState<Tab>("log");
  const [seg, setSeg] = useState<Seg>("diary");
  const [nav, setNav] = useState<Overlay[]>([]);
  const [albumId, setAlbumId] = useState<string | null>(null);
  const [listId, setListId] = useState<string | null>(null);
  const [pickId, setPickId] = useState<string | null>(null);
  const [searchMode, setSearchMode] = useState<SearchMode>("plain");
  const [rateInit, setRateInit] = useState({ rating: 0, review: "", editing: false });
  const [sheet, setSheet] = useState<string | null>(null);
  const [confirmEntry, setConfirmEntry] = useState<string | null>(null);
  const [confirmList, setConfirmList] = useState<string | null>(null);
  const [confirmAccount, setConfirmAccount] = useState(false);
  const [notice, setNotice] = useState<{ title: string; body: string } | null>(null);
  const [favFull, setFavFull] = useState(false);
  const [email, setEmail] = useState("");

  /** Shown once when a visitor lands on the demo, so "nothing saves" is not a surprise. */
  const [showDemoIntro, setShowDemoIntro] = useState(store.demo);

  useEffect(() => {
    // Demo mode has no session to read an address off.
    if (store.demo) return;
    void createClient().auth.getUser().then(({ data }) => setEmail(data.user?.email ?? ""));
  }, [store.demo]);

  const overlay = nav.length ? nav[nav.length - 1] : null;
  const push = (v: Overlay) => setNav((n) => [...n, v]);
  const pop = () => setNav((n) => n.slice(0, -1));
  const reset = () => {
    setNav([]);
    setTab("log");
    setSeg("diary");
  };

  const rel = (id: string): Release => store.releases[id] ?? placeholderRelease(id);

  const openRelease = (id: string) => {
    setAlbumId(id);
    push("album");
  };

  const startRate = (id: string) => {
    const e = store.entries.find((x) => x.releaseId === id);
    setAlbumId(id);
    setRateInit({ rating: e?.rating ?? 0, review: e?.review ?? "", editing: !!e });
    push("rate");
  };

  const openSearch = (mode: SearchMode) => {
    setSearchMode(mode);
    push("search");
  };

  const onPick = (r: Release) => {
    // Kicks off the metadata upsert; dependent writes wait on it internally, so
    // a queue insert can no longer race ahead of the row it references.
    void store.remember(r);
    if (searchMode === "queue") {
      if (store.queue.includes(r.id)) {
        setNotice({ title: "Already in your queue", body: `${r.title} is waiting in the queue.` });
        return;
      }
      store.toggleQueue(r.id);
      pop();
      return;
    }
    if (searchMode === "list" && listId) {
      if (!store.addToList(listId, r.id)) {
        const l = store.lists.find((x) => x.id === listId);
        setNotice({ title: "Already in this list", body: `${r.title} is already in ${l?.name ?? "this list"}.` });
        return;
      }
      pop();
      return;
    }
    setAlbumId(r.id);
    push("album");
    if (searchMode === "diary") setSheet(r.id);
  };

  const deleteAccount = async () => {
    setConfirmAccount(false);
    const res = await fetch("/api/account", { method: "DELETE" });
    if (res.ok) {
      await store.signOut();
      return;
    }
    const data = await res.json().catch(() => ({}));
    setNotice({
      title: "Account not deleted",
      body: data.error ?? "Something went wrong. Your account is unchanged.",
    });
  };

  if (!store.ready) {
    return (
      <div className="app-shell" style={{ alignItems: "center", justifyContent: "center" }}>
        <div style={{ fontWeight: 500, fontSize: 10, lineHeight: 1, letterSpacing: ".2em", color: C.w28 }}>EARWRM</div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      {tab === "log" && !overlay && (
        <LogScreen
          seg={seg}
          onSeg={setSeg}
          onProfile={() => push("profile")}
          onAdd={() => openSearch(seg === "tolisten" ? "queue" : "diary")}
          onNewList={() => { setPickId(null); push("newlist"); }}
          onOpenRelease={openRelease}
          onHold={setSheet}
          onEditEntry={startRate}
          onAskDeleteEntry={setConfirmEntry}
          onOpenList={(id) => { setListId(id); push("list"); }}
          onEditList={(id) => { setListId(id); push("editlist"); }}
          onAskDeleteList={setConfirmList}
        />
      )}

      {tab !== "log" && !overlay && (
        <ComingSoonScreen
          tab={tab}
          initials={
            (store.profile.displayName || store.profile.username || "")
              .split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase() || "··"
          }
          onProfile={() => push("profile")}
          onBackToLog={() => setTab("log")}
        />
      )}

      {overlay === "search" && (
        <SearchScreen
          mode={searchMode}
          onBack={pop}
          onPick={onPick}
          onHold={(r) => { void store.remember(r); setSheet(r.id); }}
        />
      )}

      {overlay === "album" && albumId && (
        <ReleaseScreen
          release={rel(albumId)}
          onBack={pop}
          onOpenSheet={() => setSheet(albumId)}
          onEditLog={() => startRate(albumId)}
        />
      )}

      {overlay === "rate" && albumId && (
        <RateScreen
          release={rel(albumId)}
          initialRating={rateInit.rating}
          initialReview={rateInit.review}
          editing={rateInit.editing}
          onBack={pop}
          onSave={(rating, review) => { store.setEntry(albumId, rating, review); reset(); }}
          onAskDelete={() => setConfirmEntry(albumId)}
        />
      )}

      {overlay === "profile" && (
        <ProfileScreen onBack={pop} onSettings={() => push("settings")} onOpenRelease={openRelease} />
      )}

      {overlay === "settings" && (
        <SettingsScreen
          demo={store.demo}
          email={email}
          onBack={pop}
          onProfile={() => setNav(["profile"])}
          onAskDeleteAccount={() => setConfirmAccount(true)}
        />
      )}

      {overlay === "list" && listId && (
        <ListScreen
          listId={listId}
          onBack={pop}
          onAdd={() => openSearch("list")}
          onOpenRelease={openRelease}
          onHold={setSheet}
        />
      )}

      {overlay === "pick" && pickId && (
        <PickListsScreen
          releaseId={pickId}
          onBack={pop}
          onNewList={() => push("newlist")}
          onNotice={(title, body) => setNotice({ title, body })}
        />
      )}

      {overlay === "newlist" && (
        <NewListScreen onBack={pop} onCreate={(name) => { store.createList(name, pickId); pop(); }} />
      )}

      {overlay === "editlist" && listId && (
        <EditListScreen
          listId={listId}
          onBack={pop}
          onSave={(name, desc) => { store.updateList(listId, name, desc); pop(); }}
          onAskDelete={() => setConfirmList(listId)}
        />
      )}

      {!overlay && (
        <TabBar tab={tab} onTab={(t) => { setTab(t); setNav([]); }} onAdd={() => openSearch("plain")} />
      )}

      {sheet && (
        <ActionSheet
          releaseId={sheet}
          onClose={() => setSheet(null)}
          onReview={() => { const id = sheet; setSheet(null); startRate(id); }}
          onAddToLists={() => { setPickId(sheet); setSheet(null); push("pick"); }}
          onFavFull={() => { setSheet(null); setFavFull(true); }}
          onNotice={(title, body) => setNotice({ title, body })}
        />
      )}

      {confirmEntry && (
        <Dialog
          title="Delete this entry?"
          body={`${rel(confirmEntry).title} will be unmarked as listened, and your star rating and review will be deleted. This can’t be undone.`}
        >
          <div style={{ display: "flex", gap: 9, marginTop: 20 }}>
            <button onClick={() => setConfirmEntry(null)} style={{ flex: 1, height: 39, borderRadius: 5, border: `1px solid ${C.w16}`, fontWeight: 500, fontSize: 14, lineHeight: 1 }}>
              Cancel
            </button>
            <button
              onClick={() => { store.removeEntry(confirmEntry); setConfirmEntry(null); setSheet(null); reset(); }}
              style={{ flex: 1, height: 39, borderRadius: 5, background: C.danger, color: C.dangerFg, fontWeight: 600, fontSize: 14, lineHeight: 1 }}
            >
              Delete
            </button>
          </div>
        </Dialog>
      )}

      {confirmList && (
        <Dialog
          title="Delete this list?"
          body={`${store.lists.find((l) => l.id === confirmList)?.name ?? "This list"} will be deleted permanently. The releases stay in your diary.`}
        >
          <div style={{ display: "flex", gap: 9, marginTop: 20 }}>
            <button onClick={() => setConfirmList(null)} style={{ flex: 1, height: 39, borderRadius: 5, border: `1px solid ${C.w16}`, fontWeight: 500, fontSize: 14, lineHeight: 1 }}>
              Cancel
            </button>
            <button
              onClick={() => {
                store.deleteList(confirmList);
                setConfirmList(null);
                setNav((n) => n.filter((v) => v !== "editlist" && v !== "list"));
              }}
              style={{ flex: 1, height: 39, borderRadius: 5, background: C.danger, color: C.dangerFg, fontWeight: 600, fontSize: 14, lineHeight: 1 }}
            >
              Delete
            </button>
          </div>
        </Dialog>
      )}

      {confirmAccount && (
        <Dialog
          title="Delete your account?"
          body="Your diary, lists, queue and favorites are deleted permanently along with your login. This can’t be undone."
          z={96}
        >
          <div style={{ display: "flex", gap: 9, marginTop: 20 }}>
            <button onClick={() => setConfirmAccount(false)} style={{ flex: 1, height: 39, borderRadius: 5, border: `1px solid ${C.w16}`, fontWeight: 500, fontSize: 14, lineHeight: 1 }}>
              Cancel
            </button>
            <button onClick={() => void deleteAccount()} style={{ flex: 1, height: 39, borderRadius: 5, background: C.danger, color: C.dangerFg, fontWeight: 600, fontSize: 14, lineHeight: 1 }}>
              Delete
            </button>
          </div>
        </Dialog>
      )}

      {showDemoIntro && (
        <Dialog
          title="You’re in the demo"
          body="Log records, rate them, write reviews, build lists — every feature works on a diary that already has some records in it. Nothing is saved, so a refresh puts it all back."
          z={98}
        >
          <button
            onClick={() => setShowDemoIntro(false)}
            style={{ width: "100%", height: 39, marginTop: 20, borderRadius: 5, background: C.accent, color: "#fff", fontWeight: 600, fontSize: 14, lineHeight: 1 }}
          >
            Start exploring
          </button>
        </Dialog>
      )}

      {store.error && (
        <Dialog title="Not saved" body={store.error} z={97}>
          <button
            onClick={store.clearError}
            style={{ width: "100%", height: 39, marginTop: 20, borderRadius: 5, border: `1px solid ${C.w22}`, background: "transparent", fontWeight: 600, fontSize: 14, lineHeight: 1, color: "#fff" }}
          >
            OK
          </button>
        </Dialog>
      )}

      {notice && (
        <Dialog title={notice.title} body={notice.body} z={95}>
          <button
            onClick={() => setNotice(null)}
            style={{ width: "100%", height: 39, marginTop: 20, borderRadius: 5, border: `1px solid ${C.w22}`, background: "transparent", fontWeight: 600, fontSize: 14, lineHeight: 1, color: "#fff" }}
          >
            OK
          </button>
        </Dialog>
      )}

      {favFull && (
        <Dialog title="Five favorites is the limit" body="Remove one from your profile before adding another." z={90}>
          <button
            onClick={() => setFavFull(false)}
            style={{ width: "100%", height: 39, marginTop: 20, borderRadius: 5, border: `1px solid ${C.w16}`, fontWeight: 500, fontSize: 14, lineHeight: 1 }}
          >
            Got it
          </button>
        </Dialog>
      )}
    </div>
  );
}
