import { json } from "@/lib/server";
import { supabasePublicConfig } from "@/lib/supabase-server";

export async function GET() {
  const config = supabasePublicConfig();
  return json(
    config.enabled
      ? { enabled: true, url: config.url, key: config.key }
      : { enabled: false },
  );
}
