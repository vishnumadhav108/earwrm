"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/data/database.types";
import { assertSupabaseAllowed } from "./guard";

export const createClient = () => {
  assertSupabaseAllowed();
  return createBrowserClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
};
