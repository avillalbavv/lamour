import { env } from "cloudflare:workers";

export type SupabaseAccount = {
  id: string;
  email?: string;
  phone?: string;
  created_at?: string;
  user_metadata?: {
    full_name?: string;
    phone?: string;
    age_confirmed?: boolean;
    age_confirmed_at?: string;
    terms_version?: string;
    privacy_version?: string;
  };
};

function value(name: string) {
  return String((env as Record<string, unknown>)[name] || "").trim();
}

export function supabasePublicConfig() {
  const url = value("SUPABASE_URL").replace(/\/$/, "");
  const key = value("SUPABASE_PUBLISHABLE_KEY");
  return { url, key, enabled: Boolean(url && key) };
}

export function supabaseAdminConfigured() {
  return Boolean(
    supabasePublicConfig().enabled && value("SUPABASE_SERVICE_ROLE_KEY"),
  );
}

export async function getSupabaseAccount(request: Request) {
  const config = supabasePublicConfig();
  const token = request.headers
    .get("authorization")
    ?.replace(/^Bearer\s+/i, "");
  if (!config.enabled || !token) return null;
  const response = await fetch(`${config.url}/auth/v1/user`, {
    headers: { apikey: config.key, Authorization: `Bearer ${token}` },
  });
  if (!response.ok) return null;
  return (await response.json()) as SupabaseAccount;
}

export async function listSupabaseProfiles() {
  const config = supabasePublicConfig();
  const serviceKey = value("SUPABASE_SERVICE_ROLE_KEY");
  if (!config.enabled || !serviceKey) return [];
  const response = await fetch(
    `${config.url}/rest/v1/profiles?select=id,email,phone,full_name,age_confirmed,age_confirmed_at,terms_version,privacy_version,created_at,updated_at&order=created_at.desc&limit=500`,
    {
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
      },
    },
  );
  if (!response.ok) throw new Error("No se pudieron consultar los perfiles.");
  return (await response.json()) as Array<Record<string, unknown>>;
}
