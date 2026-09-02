"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { C } from "@/lib/theme";
import { createClient } from "@/lib/supabase/client";

/**
 * The Claude Design prototype has no sign-in screen — it assumed a signed-in
 * user. This is built in the same language as the rest of the app so it does
 * not read as a different product.
 */
export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (mode === "in") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.replace("/");
        router.refresh();
      } else {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        // Projects with email confirmation on return no session yet.
        if (data.session) {
          router.replace("/");
          router.refresh();
        } else {
          setSent(true);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  const input: React.CSSProperties = {
    width: "100%", boxSizing: "border-box", height: 41, padding: "0 13px", borderRadius: 5,
    background: C.w05, border: `1px solid ${C.w08}`, fontWeight: 400, fontSize: 14, lineHeight: 1,
  };
  const cap: React.CSSProperties = { fontWeight: 500, fontSize: 10, lineHeight: 1, letterSpacing: ".2em", color: C.w30 };

  return (
    <div className="app-shell" style={{ justifyContent: "center", padding: "0 24px" }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 7, marginBottom: 34 }}>
        <div style={{ fontWeight: 700, fontSize: 24, lineHeight: 1, letterSpacing: "-.03em", color: C.w92 }}>earwrm</div>
        <div style={{ fontWeight: 400, fontSize: 13, lineHeight: 1.5, color: C.w40, textAlign: "center", textWrap: "pretty" }}>
          A music diary. Log what you played, rate it, keep lists.
        </div>
      </div>

      {sent ? (
        <div style={{ textAlign: "center" }}>
          <div style={{ fontWeight: 600, fontSize: 15.5, lineHeight: 1.3 }}>Check your email</div>
          <div style={{ marginTop: 7, fontWeight: 400, fontSize: 13.5, lineHeight: 1.5, color: C.w48, textWrap: "pretty" }}>
            We sent a confirmation link to {email}. Open it to finish setting up your diary.
          </div>
        </div>
      ) : (
        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={cap}>EMAIL</div>
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" style={input} autoComplete="email" />
          <div style={{ ...cap, marginTop: 10 }}>PASSWORD</div>
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            style={input}
            autoComplete={mode === "in" ? "current-password" : "new-password"}
          />

          {error && (
            <div style={{ marginTop: 4, fontWeight: 400, fontSize: 12.5, lineHeight: 1.5, color: C.danger, textWrap: "pretty" }}>{error}</div>
          )}

          <button
            type="submit"
            disabled={busy}
            style={{
              marginTop: 18, height: 41, borderRadius: 5, background: C.accent, color: "#fff",
              fontWeight: 600, fontSize: 13.5, lineHeight: 1, letterSpacing: ".02em", opacity: busy ? 0.6 : 1,
            }}
          >
            {busy ? "…" : mode === "in" ? "Sign in" : "Create account"}
          </button>

          <button
            type="button"
            onClick={() => { setMode(mode === "in" ? "up" : "in"); setError(null); }}
            style={{ marginTop: 6, height: 32, fontWeight: 500, fontSize: 12.5, lineHeight: 1, color: C.w60 }}
          >
            {mode === "in" ? "Need an account? Sign up" : "Already have an account? Sign in"}
          </button>
        </form>
      )}
    </div>
  );
}
