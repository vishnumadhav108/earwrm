import { NextResponse } from "next/server";
import { createClient as createSsrClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

/**
 * Deletes the signed-in user. Every user-owned table cascades from
 * auth.users, so removing the auth user removes the diary with it.
 *
 * Deleting an auth user is an admin operation, so this needs the service-role
 * key. Without it the route refuses rather than half-deleting the account.
 */
export async function DELETE() {
  const supabase = await createSsrClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    return NextResponse.json(
      { error: "Account deletion needs SUPABASE_SERVICE_ROLE_KEY to be set on the server." },
      { status: 501 },
    );
  }

  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) {
    console.error("account delete", error);
    return NextResponse.json({ error: "Could not delete the account." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
