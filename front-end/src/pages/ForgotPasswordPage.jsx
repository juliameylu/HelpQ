import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, GraduationCap, Mail } from "lucide-react";
import { useApp } from "../context/useApp.js";

export default function ForgotPasswordPage() {
  const { user, requestPasswordReset } = useApp();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (user) {
    return (
      <div className="login-shell">
        <div className="login-panel">
          <p className="login-subtitle">You are already signed in.</p>
          <Link className="btn btn-gold btn-block" to="/">
            Go to dashboard
          </Link>
        </div>
      </div>
    );
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSuccess("");
    setIsSubmitting(true);

    try {
      const result = await requestPasswordReset(email);
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
      <div className="login-panel">
        <div className="login-brand">
          <span className="sidebar-brand-icon" aria-hidden="true">
            <GraduationCap size={24} />
          </span>
          <span className="sidebar-brand-text">HelpQ</span>
        </div>
        <h1>Reset password</h1>
        <p className="login-subtitle">
          Enter your email and we&apos;ll send you a link to choose a new
          password.
        </p>

        <form className="login-card" noValidate onSubmit={handleSubmit}>
          <label className="form-label" htmlFor="email">
            Email address
          </label>
          <input
            autoComplete="email"
            className="form-input"
            id="email"
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@calpoly.edu"
            required
            type="email"
            value={email}
          />

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
            <Mail aria-hidden="true" size={20} />
            {isSubmitting ? "Sending…" : "Send reset link"}
          </button>

          <p className="login-footer-text">
            <Link className="text-link auth-back-link" to="/login">
              <ArrowLeft aria-hidden="true" size={16} />
              Back to sign in
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
