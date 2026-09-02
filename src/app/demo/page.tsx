import { StoreProvider } from "@/lib/store";
import { AppShell } from "@/components/AppShell";

export const metadata = { title: "earwrm — demo" };

/**
 * The whole app, running against an in-memory diary instead of Supabase. It
 * lives at its own route rather than behind a flag on `/` so it needs no
 * session, no cookie and no database row: everything a visitor does here is
 * React state, and closing the tab is the reset.
 */
export default function Demo() {
  return (
    <StoreProvider demo>
      <AppShell />
    </StoreProvider>
  );
}
