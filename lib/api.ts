import { getSupabaseClient } from "./supabase-client";

export async function api<T = any>(
  path: string,
  data?: unknown,
  options: { token?: string } = {},
): Promise<T> {
  const headers: Record<string, string> = {};
  if (data !== undefined) headers["Content-Type"] = "application/json";
  let token = options.token;
  if (!token && path === "admin") {
    const client = await getSupabaseClient();
    const { data: auth } = (await client?.auth.getSession()) || { data: null };
    token = auth?.session?.access_token;
  }
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch("/api/" + path, {
    method: data === undefined ? "GET" : "POST",
    headers,
    body: data === undefined ? undefined : JSON.stringify(data),
  });
  let result;
  try {
    result = await response.json();
  } catch {
    throw new Error("No hay respuesta del servidor. Intentá nuevamente.");
  }
  if (!response.ok)
    throw new Error(result.error || "No se pudo completar la solicitud.");
  return result;
}
