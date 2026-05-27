/**
 * Finish sign-up / magic-link / recovery flows when the user lands with
 * tokens in the URL (email confirmation link).
 */
export async function completeAuthFromUrl(supabase) {
  if (!supabase || typeof window === "undefined") {
    return { ok: false };
  }

  const query = new URLSearchParams(window.location.search);
  const code = query.get("code");

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return { ok: false, error: error.message };
    }
    cleanAuthParamsFromUrl();
    return { ok: true, kind: query.get("type") || "signup" };
  }

  const hash = window.location.hash.startsWith("#")
    ? window.location.hash.slice(1)
    : "";
  if (!hash) {
    return { ok: false };
  }

  const hashParams = new URLSearchParams(hash);
  const type = hashParams.get("type");
  const hasToken =
    hashParams.has("access_token") || hashParams.has("refresh_token");

  if (!hasToken) {
    return { ok: false };
  }

  const { data, error } = await supabase.auth.getSession();
  if (error) {
    return { ok: false, error: error.message };
  }

  if (!data.session) {
    return {
      ok: false,
      error: "Confirmation link is invalid or expired. Request a new email."
    };
  }

  cleanAuthParamsFromUrl();
  return { ok: true, kind: type || "signup" };
}

function cleanAuthParamsFromUrl() {
  window.history.replaceState(null, "", window.location.pathname);
}
