import { supabase } from "./supabaseClient";

const apiBaseUrl =
  import.meta.env.VITE_API_URL?.replace(/\/+$/, "") || "http://127.0.0.1:3001";

async function buildHeaders(headers = {}) {
  const nextHeaders = new Headers(headers);

  if (!nextHeaders.has("Content-Type")) {
    nextHeaders.set("Content-Type", "application/json");
  }

  if (supabase) {
    const {
      data: { session }
    } = await supabase.auth.getSession();

    if (session?.access_token) {
      nextHeaders.set("Authorization", `Bearer ${session.access_token}`);
    }
  }

  return nextHeaders;
}

export async function apiFetch(path, options = {}) {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...options,
    headers: await buildHeaders(options.headers)
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      payload?.error?.message || payload?.message || "Request failed";
    const error = new Error(message);
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  return payload;
}
