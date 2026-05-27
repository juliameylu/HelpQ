import { useEffect, useState } from "react";
import {
  Link,
  Navigate,
  useLocation,
  useNavigate,
  useSearchParams
} from "react-router-dom";
import { GraduationCap, LogIn, UserPlus } from "lucide-react";
import { completeAuthFromUrl } from "../lib/completeAuthFromUrl.js";
import { supabase } from "../lib/supabaseClient.js";
import { useApp } from "../context/useApp.js";

const initialForm = {
  email: "",
  password: "",
  confirmPassword: "",
  fullName: "",
  role: "student"
};

export default function LoginPage() {
  const { user, login, signup, resendSignupConfirmation } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [authMode, setAuthMode] = useState("sign-in");
  const [form, setForm] = useState(initialForm);
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(() => location.state?.message ?? "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmingEmail, setConfirmingEmail] = useState(false);

  const loggedOut = searchParams.get("loggedOut") === "1";
  const emailJustConfirmed = searchParams.get("confirmed") === "1";
  const passwordReset = searchParams.get("reset") === "1";
  const from = location.state?.from?.pathname || "/";
  const isSignUp = authMode === "sign-up";

  useEffect(() => {
    if (!supabase) {
      return undefined;
    }

    let active = true;

    const id = window.setTimeout(async () => {
      setConfirmingEmail(true);
      const result = await completeAuthFromUrl(supabase);
      if (!active) {
        return;
      }
      setConfirmingEmail(false);

      if (result.ok && result.kind === "signup") {
        setSuccess("Email confirmed! You are signed in.");
      } else if (result.error) {
        setError(result.error);
      }
    }, 0);

    return () => {
      active = false;
      window.clearTimeout(id);
    };
  }, []);

  if (user) {
    return <Navigate replace to={from} />;
  }

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
    setError("");
    setSuccess("");
  }

  function switchAuthMode(nextMode) {
    setAuthMode(nextMode);
    setError("");
    setSuccess("");
    if (nextMode === "sign-in") {
      setForm((current) => ({
        ...initialForm,
        email: current.email,
        password: "",
        confirmPassword: ""
      }));
    } else if (nextMode === "sign-up") {
      setForm((current) => ({
        ...initialForm,
        email: current.email
      }));
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSuccess("");
    setIsSubmitting(true);

    try {
      if (isSignUp) {
        const result = await signup({
          email: form.email,
          password: form.password,
          confirmPassword: form.confirmPassword,
          fullName: form.fullName,
          role: form.role
        });

        if (!result.ok) {
          setError(result.error);
          return;
        }

        setForm({ ...initialForm, email: form.email });
        setAuthMode("sign-in");
        setSuccess(result.message);
        return;
      }

      const result = await login(form.email, form.password);
      if (!result.ok) {
        setError(result.error);
        if (result.needsEmailConfirmation) {
          setAuthMode("sign-in");
        }
        return;
      }
      navigate(from, { replace: true });
    } finally {
      setIsSubmitting(false);
    }
  }

  const submitLabel = isSignUp ? "Create account" : "Sign in";

  async function handleResendConfirmation() {
    setError("");
    setSuccess("");
    setIsSubmitting(true);
    try {
      const result = await resendSignupConfirmation(form.email);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSuccess(result.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="login-shell">
      {loggedOut ? (
        <p className="login-toast" role="status">
          Logged out successfully
        </p>
      ) : null}

      {passwordReset && !success ? (
        <p className="login-toast" role="status">
          Password updated. Sign in with your new password.
        </p>
      ) : null}

      {emailJustConfirmed && !success ? (
        <p className="login-toast" role="status">
          Email confirmed. Sign in with your password.
        </p>
      ) : null}

      {confirmingEmail ? (
        <p className="login-toast" role="status">
          Confirming your email…
        </p>
      ) : null}

      <div className="login-panel">
        <div className="login-brand">
          <span className="sidebar-brand-icon" aria-hidden="true">
            <GraduationCap size={24} />
          </span>
          <span className="sidebar-brand-text">HelpQ</span>
        </div>
        <h1>{isSignUp ? "Create account" : "Welcome back"}</h1>
        <p className="login-subtitle">
          {isSignUp
            ? "Sign up with your Cal Poly email to get started"
            : "Sign in to your account to continue"}
        </p>

        <form className="login-card" noValidate onSubmit={handleSubmit}>
          {isSignUp ? (
            <>
              <label className="form-label" htmlFor="fullName">
                Full name
              </label>
              <input
                autoComplete="name"
                className="form-input"
                id="fullName"
                onChange={(e) => updateField("fullName", e.target.value)}
                placeholder="Lara Nichols-Brown"
                type="text"
                value={form.fullName}
              />

              <fieldset className="role-fieldset">
                <legend className="form-label">I am a</legend>
                <div className="role-options">
                  <label className="role-option">
                    <input
                      checked={form.role === "student"}
                      name="role"
                      onChange={() => updateField("role", "student")}
                      type="radio"
                      value="student"
                    />
                    Student
                  </label>
                  <label className="role-option">
                    <input
                      checked={form.role === "professor"}
                      name="role"
                      onChange={() => updateField("role", "professor")}
                      type="radio"
                      value="professor"
                    />
                    Professor
                  </label>
                </div>
                <p className="role-hint">
                  Professors can create classes and office hours. Students join
                  with a class code.
                </p>
              </fieldset>
            </>
          ) : null}

          <label className="form-label" htmlFor="email">
            Email address
          </label>
          <input
            autoComplete="email"
            className="form-input"
            id="email"
            onChange={(e) => updateField("email", e.target.value)}
            placeholder="you@calpoly.edu"
            required
            type="email"
            value={form.email}
          />

          <label className="form-label" htmlFor="password">
            Password
          </label>
          <input
            autoComplete={isSignUp ? "new-password" : "current-password"}
            className="form-input"
            id="password"
            minLength={isSignUp ? 6 : undefined}
            onChange={(e) => updateField("password", e.target.value)}
            placeholder="Enter your password"
            required
            type="password"
            value={form.password}
          />

          {isSignUp ? (
            <>
              <label className="form-label" htmlFor="confirmPassword">
                Confirm password
              </label>
              <input
                autoComplete="new-password"
                className="form-input"
                id="confirmPassword"
                minLength={6}
                onChange={(e) => updateField("confirmPassword", e.target.value)}
                placeholder="Re-enter your password"
                required
                type="password"
                value={form.confirmPassword}
              />
            </>
          ) : null}

          {!isSignUp ? (
            <div className="login-row">
              <label className="checkbox-label">
                <input
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  type="checkbox"
                />
                Remember me
              </label>
              <Link className="text-link" to="/forgot-password">
                Forgot password?
              </Link>
            </div>
          ) : null}

          {success ? (
            <p className="field-message success" role="status">
              {success}
            </p>
          ) : null}

          {error ? (
            <p className="field-message error" role="alert">
              {error}
            </p>
          ) : null}

          <button
            className="btn btn-gold btn-block login-submit"
            disabled={isSubmitting}
            type="submit">
            {isSignUp ? (
              <UserPlus aria-hidden="true" size={20} />
            ) : (
              <LogIn aria-hidden="true" size={20} />
            )}
            {isSubmitting ? "Please wait…" : submitLabel}
          </button>

          <p className="login-footer-text">
            {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
            <button
              className="text-link"
              onClick={() => switchAuthMode(isSignUp ? "sign-in" : "sign-up")}
              type="button">
              {isSignUp ? "Sign in" : "Sign up"}
            </button>
          </p>

          {!isSignUp ? (
            <p className="login-footer-text">
              Didn&apos;t get a confirmation email?{" "}
              <button
                className="text-link"
                disabled={isSubmitting || !form.email.trim()}
                onClick={() => void handleResendConfirmation()}
                type="button">
                Resend
              </button>
            </p>
          ) : null}
        </form>
      </div>
    </div>
  );
}
