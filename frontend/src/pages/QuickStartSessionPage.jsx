import { useState } from "react";
import { Link } from "react-router-dom";
import {
  CheckCircle2,
  ClipboardCopy,
  GraduationCap,
  Loader2,
  Radio
} from "lucide-react";
import DashboardLayout from "../components/DashboardLayout.jsx";
import { createSession } from "../api.js";
export default function QuickStartSessionPage() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [created, setCreated] = useState(null); // { session, joinUrl }
  const [copied, setCopied] = useState(false);

  function validate() {
    const errs = {};
    if (title.trim().length < 2) {
      errs.title = "Session title is required (at least 2 characters).";
    }
    return errs;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setIsSubmitting(true);
    try {
      const { session } = await createSession({
        title: title.trim(),
        description: description.trim()
      });
      const joinUrl = `${window.location.origin}/join?code=${session.sessionCode}`;
      setCreated({ session, joinUrl });
    } catch (err) {
      setErrors({
        submit:
          err.message ||
          "Could not create session. Make sure you are signed in."
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleCopy() {
    if (!created?.joinUrl) return;
    try {
      await navigator.clipboard.writeText(created.joinUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard unavailable — user can copy manually
    }
  }

  if (created) {
    return (
      <DashboardLayout>
        <div className="page-stack standalone-page">
          <div className="card" style={{ maxWidth: 560, margin: "0 auto" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                marginBottom: 4
              }}>
              <CheckCircle2 size={28} color="#154734" aria-hidden="true" />
              <h1 style={{ margin: 0, fontSize: "1.45rem" }}>
                Session created!
              </h1>
            </div>
            <p style={{ color: "#4a6358", marginBottom: 20 }}>
              Share the join code or link below. Students can join without
              creating an account.
            </p>

            <dl className="status-details" style={{ marginBottom: 20 }}>
              <div>
                <dt>Session title</dt>
                <dd>
                  <strong>{created.session.title}</strong>
                </dd>
              </div>
              <div>
                <dt>Session code</dt>
                <dd>
                  <span
                    className="session-code"
                    style={{
                      fontSize: "1.4rem",
                      fontWeight: 800,
                      letterSpacing: 2
                    }}>
                    {created.session.sessionCode}
                  </span>
                </dd>
              </div>
              <div>
                <dt>Student join link</dt>
                <dd style={{ wordBreak: "break-all" }}>
                  <a
                    className="text-link"
                    href={created.joinUrl}
                    target="_blank"
                    rel="noopener noreferrer">
                    {created.joinUrl}
                  </a>
                </dd>
              </div>
            </dl>

            <div
              style={{
                display: "flex",
                gap: 10,
                flexWrap: "wrap",
                marginBottom: 16
              }}>
              <button
                className="btn btn-secondary btn-compact"
                onClick={handleCopy}
                type="button">
                <ClipboardCopy size={16} aria-hidden="true" />
                {copied ? "Copied!" : "Copy join link"}
              </button>
              <Link
                className="btn btn-gold btn-compact"
                to={`/sessions/${created.session.sessionCode}/manage`}>
                <Radio size={16} aria-hidden="true" />
                Open host dashboard
              </Link>
            </div>

            <p className="field-message">
              You can also find this session on your{" "}
              <Link className="text-link" to="/">
                home dashboard
              </Link>
              .
            </p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="page-stack standalone-page">
        <div className="card" style={{ maxWidth: 520, margin: "0 auto" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              marginBottom: 4
            }}>
            <span className="brand-mark" aria-hidden="true">
              <GraduationCap size={20} />
            </span>
            <h1 style={{ margin: 0, fontSize: "1.45rem" }}>
              Start a help session
            </h1>
          </div>
          <p style={{ color: "#4a6358", marginBottom: 24 }}>
            Create a live office-hours queue. Students join with the session
            code — no account required.
          </p>

          <form
            noValidate
            onSubmit={handleSubmit}
            style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div className="field-group">
              <label htmlFor="session-title">Session title</label>
              <input
                id="session-title"
                autoComplete="off"
                autoFocus
                maxLength={120}
                onChange={(e) => {
                  setTitle(e.target.value);
                  setErrors((p) => ({ ...p, title: "" }));
                }}
                placeholder="CSC 307 Office Hours"
                type="text"
                value={title}
                aria-describedby={errors.title ? "title-error" : undefined}
                aria-invalid={Boolean(errors.title)}
              />
              {errors.title ? (
                <p
                  className="field-message error"
                  id="title-error"
                  role="alert">
                  {errors.title}
                </p>
              ) : null}
            </div>

            <div className="field-group">
              <label htmlFor="session-desc">
                Description{" "}
                <span style={{ fontWeight: 400, color: "#7a9a8e" }}>
                  (optional)
                </span>
              </label>
              <textarea
                id="session-desc"
                maxLength={300}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Help with React, Express, Supabase, and testing."
                rows={3}
                value={description}
              />
            </div>

            {errors.submit ? (
              <p className="field-message error" role="alert">
                {errors.submit}
              </p>
            ) : null}

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button
                className="btn btn-gold"
                disabled={isSubmitting}
                style={{ flex: 1 }}
                type="submit">
                {isSubmitting ? (
                  <>
                    <Loader2
                      className="spin-icon"
                      size={18}
                      aria-hidden="true"
                    />{" "}
                    Creating…
                  </>
                ) : (
                  "Create session"
                )}
              </button>
              <Link
                className="btn btn-secondary"
                to="/"
                style={{ flex: "0 0 auto" }}>
                Cancel
              </Link>
            </div>
          </form>
        </div>
      </div>
    </DashboardLayout>
  );
}
