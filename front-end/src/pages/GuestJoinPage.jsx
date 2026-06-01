import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  ArrowRight,
  CheckCircle2,
  CircleOff,
  Clock3,
  GraduationCap,
  Hash,
  HelpCircle,
  Loader2,
  Radio,
  RefreshCw,
  UserRound,
  UsersRound
} from "lucide-react";
import {
  guestGetSession,
  guestGetQueue,
  guestJoinQueue,
  guestLeaveQueue
} from "../api.js";

// ── localStorage helpers ──────────────────────────────────────────────────────

const STORAGE_KEY = "helpq-guest-session-v1";

function saveGuestSession(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {}
}

function loadGuestSession() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function clearGuestSession() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {}
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function mapStatus(raw) {
  if (raw === "in_progress") return "helping";
  if (raw === "completed") return "done";
  return raw ?? "waiting";
}

// ── Main component ────────────────────────────────────────────────────────────

export default function GuestJoinPage() {
  const [searchParams] = useSearchParams();
  const codeFromUrl = (searchParams.get("code") || "").toUpperCase();

  // Session lookup state
  const [code, setCode] = useState(codeFromUrl);
  const [sessionInfo, setSessionInfo] = useState(null);
  const [sessionState, setSessionState] = useState("idle"); // idle | loading | ok | notfound | error

  // Join form state
  const [studentName, setStudentName] = useState("");
  const [question, setQuestion] = useState("");
  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Queue state
  const [submittedEntry, setSubmittedEntry] = useState(() => {
    const saved = loadGuestSession();
    if (!saved) return null;
    // If URL has a code that doesn't match saved session, start fresh
    if (codeFromUrl && codeFromUrl !== saved.sessionCode) return null;
    return saved;
  });
  const [queueEntries, setQueueEntries] = useState([]);
  const [queueError, setQueueError] = useState(null);
  const [isLeaving, setIsLeaving] = useState(false);
  const [leftQueue, setLeftQueue] = useState(false);

  const pollRef = useRef(null);

  // ── Session lookup ────────────────────────────────────────────────────────

  useEffect(() => {
    if (codeFromUrl) setCode(codeFromUrl);
  }, [codeFromUrl]);

  useEffect(() => {
    const trimmed = code.trim().toUpperCase();
    if (trimmed.length < 4) {
      setSessionInfo(null);
      setSessionState("idle");
      return;
    }

    const ac = new AbortController();
    const timer = setTimeout(async () => {
      setSessionState("loading");
      try {
        const session = await guestGetSession(trimmed, { signal: ac.signal });
        setSessionInfo(session);
        setSessionState("ok");
      } catch (err) {
        if (err.name === "AbortError") return;
        setSessionInfo(null);
        setSessionState(err.status === 404 ? "notfound" : "error");
      }
    }, 400);

    return () => {
      ac.abort();
      clearTimeout(timer);
    };
  }, [code]);

  // ── Queue polling ─────────────────────────────────────────────────────────

  const poll = useCallback(async () => {
    if (!submittedEntry?.sessionId) return;
    try {
      const { entries, sessionStatus } = await guestGetQueue(submittedEntry.sessionId);
      setQueueEntries(entries ?? []);
      setQueueError(null);
      if (sessionStatus === "closed") {
        setSessionInfo((prev) => prev ? { ...prev, status: "ended" } : prev);
      }
    } catch (err) {
      setQueueError("Couldn't refresh the queue. The page will retry shortly.");
    }
  }, [submittedEntry?.sessionId]);

  useEffect(() => {
    if (!submittedEntry?.sessionId || leftQueue) {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
      return;
    }
    poll();
    pollRef.current = setInterval(poll, 5000);
    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [poll, submittedEntry?.sessionId, leftQueue]);

  // ── Restore saved session ─────────────────────────────────────────────────

  useEffect(() => {
    const saved = loadGuestSession();
    if (!saved) return;
    if (codeFromUrl && codeFromUrl !== saved.sessionCode) return;
    // Re-hydrate session info if we have a saved entry
    if (!sessionInfo && saved.sessionId) {
      guestGetSession(saved.sessionCode).then(setSessionInfo).catch(() => {});
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Derived state ─────────────────────────────────────────────────────────

  const myEntry = useMemo(() => {
    if (!submittedEntry?.entryId) return null;
    return queueEntries.find((e) => e.id === submittedEntry.entryId) ?? null;
  }, [queueEntries, submittedEntry?.entryId]);

  const myStatus = useMemo(() => {
    if (leftQueue) return "left";
    if (!submittedEntry) return "none";
    if (sessionInfo?.status === "ended") return "session-ended";
    if (!myEntry) return submittedEntry ? "completed" : "none";
    return mapStatus(myEntry.status);
  }, [submittedEntry, myEntry, sessionInfo?.status, leftQueue]);

  const myPosition = myEntry?.position ?? submittedEntry?.position ?? null;
  const waitingCount = queueEntries.filter((e) => e.status === "waiting").length;

  // ── Persist updated state ─────────────────────────────────────────────────

  useEffect(() => {
    if (!submittedEntry || myStatus === "none" || myStatus === "left") return;
    if (myStatus === "completed" || myStatus === "session-ended") {
      clearGuestSession();
      return;
    }
    saveGuestSession({ ...submittedEntry, position: myPosition });
  }, [submittedEntry, myStatus, myPosition]);

  // ── Form validation & submit ──────────────────────────────────────────────

  function validate() {
    const errors = {};
    if (studentName.trim().length < 2) {
      errors.studentName = "Enter your name (at least 2 characters).";
    }
    if (!sessionInfo || sessionState !== "ok") {
      errors.code =
        sessionState === "loading"
          ? "Still checking that session code…"
          : sessionState === "notfound"
            ? "We couldn't find that session code. Check and try again."
            : "Enter a valid session code from your host.";
    } else if (sessionInfo.status === "ended") {
      errors.code = "This session has ended.";
    }
    if (question.trim().length < 4) {
      errors.question = "Describe what you need help with (at least 4 characters).";
    }
    return errors;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const errors = validate();
    setFormErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setIsSubmitting(true);
    try {
      const { entry, position } = await guestJoinQueue(
        sessionInfo.id,
        { studentName: studentName.trim(), question: question.trim() }
      );
      const saved = {
        entryId: entry.id,
        sessionId: sessionInfo.id,
        sessionCode: sessionInfo.sessionCode,
        studentName: entry.studentName,
        question: entry.question,
        position,
        joinedAt: new Date().toLocaleTimeString("en", { hour: "numeric", minute: "2-digit" })
      };
      setSubmittedEntry(saved);
      saveGuestSession(saved);
      // Fetch queue immediately
      const { entries } = await guestGetQueue(sessionInfo.id);
      setQueueEntries(entries ?? []);
    } catch (err) {
      const msg =
        err.status === 404
          ? "That session wasn't found. Check the code and try again."
          : err.status === 409
            ? "This session has ended — it's no longer accepting students."
            : err.message || "Something went wrong. Is the backend running?";
      setFormErrors((prev) => ({ ...prev, code: msg }));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleLeave() {
    if (!submittedEntry?.entryId) return;
    if (!window.confirm("Leave the queue? Your spot will be removed.")) return;
    setIsLeaving(true);
    try {
      await guestLeaveQueue(submittedEntry.entryId);
      clearGuestSession();
      setLeftQueue(true);
      setSubmittedEntry(null);
      setQueueEntries([]);
    } catch (err) {
      setQueueError(err.message || "Couldn't remove you from the queue.");
    } finally {
      setIsLeaving(false);
    }
  }

  function resetForm() {
    clearGuestSession();
    setSubmittedEntry(null);
    setQueueEntries([]);
    setLeftQueue(false);
    setFormErrors({});
    setStudentName("");
    setQuestion("");
  }

  // ── Session badge ─────────────────────────────────────────────────────────

  const sessionEnded = sessionInfo?.status === "ended";
  const isLive = sessionState === "ok" && !sessionEnded;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <main className="app-shell">
      <section className="session-page" aria-labelledby="page-title">

        {/* Top bar */}
        <header className="topbar">
          <div className="brand-lockup">
            <span className="brand-mark" aria-hidden="true">
              <GraduationCap size={22} />
            </span>
            <div>
              <p className="brand-name">HelpQ</p>
              <h1 id="page-title">Join a help session</h1>
            </div>
          </div>
          <div className="topbar-actions">
            <Link className="home-back-link" to="/">← Home</Link>
            {sessionEnded ? (
              <span className="ended-badge"><CircleOff size={15} aria-hidden="true" /> Ended</span>
            ) : isLive ? (
              <span className="live-badge"><Radio size={15} aria-hidden="true" /> Open</span>
            ) : null}
          </div>
        </header>

        <div className="page-grid">

          {/* Left panel — session info + queue preview */}
          <section className="session-panel" aria-labelledby="session-title">
            <div className="session-heading">
              <div>
                <p className="eyebrow">Session</p>
                <h2 id="session-title">
                  {sessionInfo?.title ??
                    (sessionState === "loading" ? "Looking up…" :
                     sessionState === "notfound" ? "Session not found" :
                     "Enter a session code")}
                </h2>
              </div>
              <span className="session-code">
                <Hash size={16} aria-hidden="true" />
                {(sessionInfo?.sessionCode ?? code.toUpperCase()) || "—"}
              </span>
            </div>

            {sessionInfo?.description ? (
              <p className="landing-feature-body">{sessionInfo.description}</p>
            ) : null}

            {sessionEnded ? (
              <p className="session-ended-banner">This session has ended. No more students can join.</p>
            ) : null}

            {queueError ? (
              <p className="field-message error" role="alert">{queueError}</p>
            ) : null}

            <div className="metrics-row">
              <Metric icon={<UsersRound size={18} aria-hidden="true" />} label="Waiting" value={waitingCount} />
              {myStatus === "waiting" && myPosition ? (
                <Metric icon={<Clock3 size={18} aria-hidden="true" />} label="Your position" value={`#${myPosition}`} />
              ) : null}
            </div>

            {/* Queue preview */}
            <section className="queue-preview" aria-labelledby="queue-preview-title">
              <div className="queue-title-row">
                <h3 id="queue-preview-title">{sessionEnded ? "Queue (closed)" : "Live queue"}</h3>
                <span>{sessionEnded ? "Closed" : `${queueEntries.length} active`}</span>
              </div>
              {!submittedEntry && queueEntries.length === 0 ? (
                <p className="field-message">
                  Enter a session code to see the queue.
                </p>
              ) : queueEntries.length === 0 ? (
                <p className="field-message">No students in the queue yet.</p>
              ) : (
                <ol>
                  {queueEntries.map((entry) => {
                    const isMe = entry.id === submittedEntry?.entryId;
                    const uiStatus = mapStatus(entry.status);
                    return (
                      <li className={isMe ? "queue-row current" : "queue-row"} key={entry.id}>
                        <span className="queue-position">{entry.position}</span>
                        <div className="queue-copy">
                          <strong>{isMe ? "You" : entry.studentName}</strong>
                          <span>{entry.question}</span>
                        </div>
                        <span className={`status-pill ${uiStatus}`}>
                          {uiStatus === "helping" ? "In progress" : uiStatus === "done" ? "Done" : "Waiting"}
                        </span>
                      </li>
                    );
                  })}
                </ol>
              )}
            </section>
          </section>

          {/* Right panel — form or status */}
          <section className="join-panel" aria-labelledby="join-heading">

            {leftQueue ? (
              <LeftStatus onReset={resetForm} />
            ) : myStatus === "session-ended" ? (
              <SessionEndedStatus entry={submittedEntry} onReset={resetForm} />
            ) : myStatus === "completed" ? (
              <CompletedStatus entry={submittedEntry} onReset={resetForm} />
            ) : myStatus === "helping" ? (
              <HelpingStatus entry={submittedEntry} />
            ) : myStatus === "waiting" ? (
              <WaitingStatus
                entry={submittedEntry}
                position={myPosition}
                onLeave={handleLeave}
                isLeaving={isLeaving}
                onRefresh={poll}
              />
            ) : (
              /* Join form */
              <>
                <div className="join-heading">
                  <p className="eyebrow">No account needed</p>
                  <h2 id="join-heading">Join the queue</h2>
                  <p className="landing-feature-body" style={{ marginTop: 4 }}>
                    Enter the session code from your professor or TA, your name, and your question.
                  </p>
                </div>

                <form className="join-form" noValidate onSubmit={handleSubmit}>
                  <FormField
                    id="code"
                    label="Session code"
                    icon={<Hash size={16} aria-hidden="true" />}
                    error={formErrors.code}
                    helper={
                      sessionState === "loading" ? "Checking…" :
                      sessionState === "ok" && !sessionEnded ? `Found: ${sessionInfo.title}` :
                      "Ask your professor or TA for the code"
                    }>
                    <input
                      autoComplete="off"
                      id="code"
                      maxLength={16}
                      onChange={(e) => {
                        setCode(e.target.value.toUpperCase());
                        setFormErrors((p) => ({ ...p, code: "" }));
                      }}
                      placeholder="DEMO01"
                      type="text"
                      value={code}
                    />
                  </FormField>

                  <FormField
                    id="name"
                    label="Your name"
                    icon={<UserRound size={16} aria-hidden="true" />}
                    error={formErrors.studentName}>
                    <input
                      autoComplete="name"
                      id="name"
                      maxLength={80}
                      onChange={(e) => {
                        setStudentName(e.target.value);
                        setFormErrors((p) => ({ ...p, studentName: "" }));
                      }}
                      placeholder="Your name"
                      type="text"
                      value={studentName}
                    />
                  </FormField>

                  <FormField
                    id="question"
                    label="Question or topic"
                    icon={<HelpCircle size={16} aria-hidden="true" />}
                    error={formErrors.question}
                    helper={`${question.trim().length}/140 characters`}>
                    <input
                      id="question"
                      maxLength={140}
                      onChange={(e) => {
                        setQuestion(e.target.value);
                        setFormErrors((p) => ({ ...p, question: "" }));
                      }}
                      placeholder="I need help with my React form"
                      type="text"
                      value={question}
                    />
                  </FormField>

                  <button className="primary-action" disabled={isSubmitting} type="submit">
                    {isSubmitting ? (
                      <><Loader2 className="spin-icon" size={18} aria-hidden="true" /> Joining…</>
                    ) : (
                      <>Join queue <ArrowRight size={18} aria-hidden="true" /></>
                    )}
                  </button>
                </form>
              </>
            )}
          </section>
        </div>
      </section>
    </main>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function FormField({ id, label, icon, error, helper, children }) {
  return (
    <div className="field-group">
      <label htmlFor={id}>
        <span>{icon}</span> {label}
      </label>
      {children}
      <p
        className={error ? "field-message error" : "field-message"}
        id={error ? `${id}-error` : `${id}-hint`}>
        {error || helper || ""}
      </p>
    </div>
  );
}

function Metric({ icon, label, value }) {
  return (
    <div className="metric">
      <span className="metric-icon">{icon}</span>
      <div><p>{label}</p><strong>{value}</strong></div>
    </div>
  );
}

function WaitingStatus({ entry, position, onLeave, isLeaving, onRefresh }) {
  return (
    <div className="status-view">
      <CheckCircle2 className="status-icon" size={40} aria-hidden="true" />
      <p className="eyebrow">You're in line</p>
      <h2 id="join-heading">
        {position ? `You're #${position} in line.` : "You're in the queue."}
      </h2>
      <p className="status-note">
        Hold tight — the host will start helping you when it's your turn. You can
        leave this page and come back; your spot is saved.
      </p>

      <dl className="status-details">
        {position ? <div><dt>Position</dt><dd>#{position}</dd></div> : null}
        <div><dt>Question</dt><dd>{entry?.question}</dd></div>
        {entry?.joinedAt ? <div><dt>Joined at</dt><dd>{entry.joinedAt}</dd></div> : null}
      </dl>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button className="secondary-action" onClick={onRefresh} type="button">
          <RefreshCw size={16} aria-hidden="true" /> Refresh
        </button>
        <button
          className="secondary-action"
          disabled={isLeaving}
          onClick={onLeave}
          type="button"
          style={{ color: "#b91c1c" }}>
          {isLeaving ? "Leaving…" : "Leave queue"}
        </button>
      </div>
    </div>
  );
}

function HelpingStatus({ entry }) {
  return (
    <div className="status-view">
      <CheckCircle2 className="status-icon" size={40} aria-hidden="true" />
      <p className="eyebrow">You're up!</p>
      <h2 id="join-heading">The host is ready for you.</h2>
      <p className="status-note">
        Head over — a host is working with you now. When they mark you done, this
        page will update.
      </p>
      <dl className="status-details">
        <div><dt>Status</dt><dd>In progress</dd></div>
        <div><dt>Question</dt><dd>{entry?.question}</dd></div>
      </dl>
    </div>
  );
}

function CompletedStatus({ entry, onReset }) {
  return (
    <div className="status-view">
      <CheckCircle2 className="status-icon" size={40} aria-hidden="true" />
      <p className="eyebrow">All done</p>
      <h2 id="join-heading">You're all set.</h2>
      <p className="status-note">
        Your question was marked done by the host. Hope that helped!
      </p>
      <dl className="status-details">
        <div><dt>Question</dt><dd>{entry?.question}</dd></div>
        {entry?.joinedAt ? <div><dt>Joined at</dt><dd>{entry.joinedAt}</dd></div> : null}
      </dl>
      <button className="secondary-action" onClick={onReset} type="button">
        Join another session
      </button>
    </div>
  );
}

function LeftStatus({ onReset }) {
  return (
    <div className="status-view">
      <CircleOff className="status-icon muted" size={40} aria-hidden="true" />
      <p className="eyebrow">Queue left</p>
      <h2 id="join-heading">You left the queue.</h2>
      <p className="status-note">
        You've been removed from the queue. Join again any time with the same
        session code.
      </p>
      <button className="secondary-action" onClick={onReset} type="button">
        Join again
      </button>
    </div>
  );
}

function SessionEndedStatus({ entry, onReset }) {
  return (
    <div className="status-view status-view-ended">
      <CircleOff className="status-icon muted" size={40} aria-hidden="true" />
      <p className="eyebrow">Session closed</p>
      <h2 id="join-heading">Office hours ended.</h2>
      <p className="status-note">
        The host ended this session. The queue is closed and no longer accepting
        students.
      </p>
      {entry?.question ? (
        <dl className="status-details">
          <div><dt>Your question</dt><dd>{entry.question}</dd></div>
        </dl>
      ) : null}
      <button className="secondary-action" onClick={onReset} type="button">
        <Link to="/">Back to home</Link>
      </button>
    </div>
  );
}
