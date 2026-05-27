/** Base URL for auth email links (must match Supabase Auth → URL configuration). */
export function siteUrl() {
  const configured = import.meta.env.VITE_SITE_URL?.replace(/\/$/, "");
  if (configured) {
    return configured;
  }
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  return "";
}

export function loginRedirectUrl() {
  return `${siteUrl()}/login`;
}

export function passwordResetRedirectUrl() {
  return `${siteUrl()}/reset-password`;
}
