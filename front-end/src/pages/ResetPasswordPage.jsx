import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { GraduationCap, KeyRound } from "lucide-react";
import { useApp } from "../context/useApp.js";
import { isSupabaseConfigured, supabase } from "../lib/supabaseClient.js";

export default function ResetPasswordPage() {
  const { updatePassword } = useApp();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [recoveryReady, setRecoveryReady] = useState(false);
  const [checkingLink, setCheckingLink] = useState(true);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      const id = window.setTimeout(() => setCheckingLink(false), 0);
      return () => window.clearTimeout(id);
    }

    let isMounted = true;

    async function checkRecoverySession() {
      const queryParams = new URLSearchParams(window.location.search);
      const code = queryParams.get("code");

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (!isMounted) return;

        if (!error) {
          setRecoveryReady(true);
          setCheckingLink(false);
          window.history.replaceState(null, "", window.location.pathname);
          return;
        }
      }

      const { data } = await supabase.auth.getSession();
      if (!isMounted) return;

      if (data.session) {
        setRecoveryReady(true);
        setCheckingLink(false);
        return;
      }

      const hash = window.location.hash.startsWith("#")
        ? window.location.hash.slice(1)
        : "";
      const params = new URLSearchParams(hash);
      const type = params.get("type");

      if (type === "recovery") {
        setRecoveryReady(true);
      }

      setCheckingLink(false);
    }

    void checkRecoverySession();

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        window.setTimeout(() => {
          setRecoveryReady(true);
          setCheckingLink(false);
        }, 0);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const result = await updatePassword({ password, confirmPassword });
      if (!result.ok) {
        setError(result.error);
        return;
      }

      navigate("/login?reset=1", {
        replace: true,
        state: { message: result.message }
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="login-shell">
      <div className="login-panel">
        <div className="login-brand">
          <span className="sidebar-brand-icon" aria-hidden="true">
            <GraduationCap size={24} />
          </span>
          <span className="sidebar-brand-text">HelpQ</span>
        </div>
        <h1>Choose a new password</h1>
        <p className="login-subtitle">
          Enter and confirm your new password below.
        </p>

        {checkingLink ? (
          <p className="field-message">Verifying reset link…</p>
        ) : null}

        {!checkingLink && !recoveryReady ? (
          <div className="login-card">
            <p className="field-message error" role="alert">
              This reset link is invalid or has expired. Request a new one from
              the forgot password page.
            </p>
            <Link className="btn btn-gold btn-block" to="/forgot-password">
              Request new link
            </Link>
            <p className="login-footer-text">
              <Link className="text-link" to="/login">
                Back to sign in
              </Link>
            </p>
          </div>
        ) : null}

        {!checkingLink && recoveryReady ? (
          <form className="login-card" noValidate onSubmit={handleSubmit}>
            <label className="form-label" htmlFor="password">
              New password
            </label>
            <input
              autoComplete="new-password"
              className="form-input"
              id="password"
              minLength={6}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
              required
              type="password"
              value={password}
            />

            <label className="form-label" htmlFor="confirmPassword">
              Confirm new password
            </label>
            <input
              autoComplete="new-password"
              className="form-input"
              id="confirmPassword"
              minLength={6}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter your password"
              required
              type="password"
              value={confirmPassword}
            />

            {error ? (
              <p className="field-message error" role="alert">
                {error}
              </p>
            ) : null}

            <button
              className="btn btn-gold btn-block login-submit"
              disabled={isSubmitting}
              type="submit">
              <KeyRound aria-hidden="true" size={20} />
              {isSubmitting ? "Updating…" : "Update password"}
            </button>

            <p className="login-footer-text">
              <Link className="text-link" to="/login">
                Back to sign in
              </Link>
            </p>
          </form>
        ) : null}
      </div>
    </div>
  );
}
