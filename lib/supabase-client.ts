"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let clientPromise: Promise<SupabaseClient | null> | null = null;

export function getSupabaseClient() {
  if (!clientPromise) {
    clientPromise = fetch("/api/account/config", { cache: "no-store" })
      .then(async (response) => {
        const config = (await response.json()) as {
          enabled: boolean;
          url?: string;
          key?: string;
        };
        if (!config.enabled || !config.url || !config.key) return null;
        return createClient(config.url, config.key, {
          auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true,
          },
        });
      })
      .catch(() => null);
  }
  return clientPromise;
}
