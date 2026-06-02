import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  GraduationCap,
  Hash,
  HelpCircle,
  Link2,
  Loader2,
  MessageSquareText,
  Radio,
  CircleOff,
  UserRound,
  UsersRound
} from "lucide-react";
import { getQueue, getSession, joinQueue } from "../api.js";
import {
  clearQueueSession,
  loadQueueSession,
  queueSessionPath,
  saveQueueSession
} from "../lib/queueSessionStorage.js";
import { useApp } from "../context/useApp.js";

const DEFAULT_AVG_HELP_MINUTES = 8;

function authErrorText(status) {
  if (status === 401) return "Please sign in again to continue.";
  if (status === 403) return "You don't have access to this session.";
  return "Something went wrong while loading the queue.";
}

function mapStatusForUi(status) {
  if (status === "helping") return "in-progress";
  if (status === "waiting") return "waiting";
  return status;
}

function mapQueueRow(entry, { currentId } = {}) {
  return {
    id: String(entry.id),
    queueEntryId: entry.id,
    name: entry.studentName,
    question: entry.question,
    status: mapStatusForUi(entry.status),
    position: entry.position,
    isCurrentStudent: currentId != null && entry.id === currentId
  };
}

function buildDisplaySession(apiSession) {
  if (!apiSession) return null;
  return {
    code: apiSession.sessionCode,
    title: apiSession.title || "Live help session",
    host:
      apiSession.description || "Your TA or instructor is hosting this queue.",
    time: "Check your course announcements for timing.",
    location: "—",
    averageHelpMinutes: DEFAULT_AVG_HELP_MINUTES
  };
}

export default function JoinQueuePage() {
  const { user } = useApp();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const codeFromUrl = (searchParams.get("code") || "").toUpperCase();
  const restoredRef = useRef(false);

  const [form, setForm] = useState(() => {
    const saved = loadQueueSession();
    const code = codeFromUrl || saved?.sessionCode || "";
    return {
      studentName: saved?.studentName ?? "",
      sessionCode: code,
      question: saved?.question ?? "",
      details: ""
    };
  });

  // Once user loads (async), backfill name if the field is still empty.
  // Deferred via setTimeout so it doesn't synchronously setState in an effect.
  useEffect(() => {
    if (!user?.name) return;
    const id = window.setTimeout(() => {
      setForm((prev) =>
        prev.studentName ? prev : { ...prev, studentName: user.name }
      );
    }, 0);
    return () => window.clearTimeout(id);
  }, [user?.name]);
  const [errors, setErrors] = useState({});
  const [submittedEntry, setSubmittedEntry] = useState(() => {
    const saved = loadQueueSession();
    if (!saved) return null;
    if (codeFromUrl && codeFromUrl !== saved.sessionCode) return null;
    return {
      queueEntryId: saved.queueEntryId,
      studentName: saved.studentName,
      question: saved.question,
      position: saved.position,
      status: "waiting",
      submittedAt: saved.submittedAt,
      sessionCode: saved.sessionCode
    };
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [apiSession, setApiSession] = useState(null);
  const [sessionLoadState, setSessionLoadState] = useState("idle");
  const [queueRaw, setQueueRaw] = useState([]);
  const [queueLoadError, setQueueLoadError] = useState(null);

  useEffect(() => {
    if (restoredRef.current) return;
    const saved = loadQueueSession();
    if (!saved) return;
    if (codeFromUrl && codeFromUrl !== saved.sessionCode) return;

    restoredRef.current = true;
    if (!codeFromUrl) {
      navigate(queueSessionPath(saved.sessionCode), { replace: true });
    }
  }, [codeFromUrl, navigate]);

  useEffect(() => {
    if (!codeFromUrl) return;
    const id = window.setTimeout(() => {
      setForm((prev) =>
        prev.sessionCode === codeFromUrl
          ? prev
          : { ...prev, sessionCode: codeFromUrl }
      );
    }, 0);
    return () => window.clearTimeout(id);
  }, [codeFromUrl]);

  const displaySession = useMemo(
    () => buildDisplaySession(apiSession),
    [apiSession]
  );

  useEffect(() => {
    const code = form.sessionCode.trim().toUpperCase();
    if (code.length < 4) {
      const resetId = window.setTimeout(() => {
        setApiSession(null);
        setSessionLoadState("idle");
        setQueueRaw([]);
      }, 0);
      return () => window.clearTimeout(resetId);
    }

    const ac = new AbortController();
    const timer = window.setTimeout(async () => {
      setSessionLoadState("loading");
      try {
        const { session } = await getSession(code, { signal: ac.signal });
        setApiSession(session);
        setSessionLoadState("ok");
      } catch (err) {
        if (err.name === "AbortError") return;
        setApiSession(null);
        setQueueRaw([]);
        setQueueLoadError(
          err.status === 401 || err.status === 403
            ? authErrorText(err.status)
            : null
        );
        setSessionLoadState(
          err.status === 404
            ? "notfound"
            : err.status === 401
              ? "unauthorized"
              : err.status === 403
                ? "forbidden"
                : "error"
        );
      }
    }, 400);

    return () => {
      ac.abort();
      window.clearTimeout(timer);
    };
  }, [form.sessionCode]);

  const sessionEnded = apiSession?.status === "ended";
  const authDenied =
    sessionLoadState === "unauthorized" || sessionLoadState === "forbidden";

  useEffect(() => {
    if (!apiSession || sessionLoadState !== "ok") return;
    const code = apiSession.sessionCode;
    let cancelled = false;

    async function poll() {
      try {
        const [{ session }, { queue }] = await Promise.all([
          getSession(code),
          getQueue(code)
        ]);
        if (!cancelled) {
          setApiSession(session);
          setQueueRaw(Array.isArray(queue) ? queue : []);
          setQueueLoadError(null);
        }
      } catch (err) {
        if (!cancelled)
          setQueueLoadError(
            err?.status === 401 || err?.status === 403
              ? authErrorText(err.status)
              : "Could not refresh the queue."
          );
      }
    }

    poll();
    const id = window.setInterval(poll, 2500);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [apiSession, sessionLoadState]);

  useEffect(() => {
    if (!sessionEnded) return;
    clearQueueSession();
  }, [sessionEnded]);

  const liveQueueRow = useMemo(() => {
    if (!submittedEntry?.queueEntryId) return null;
    return queueRaw.find((e) => e.id === submittedEntry.queueEntryId) ?? null;
  }, [queueRaw, submittedEntry]);

  const studentQueuePhase = useMemo(() => {
    if (sessionEnded) return "session-ended";
    if (!submittedEntry) return "none";
    if (liveQueueRow) {
      const uiStatus = mapStatusForUi(liveQueueRow.status);
      if (uiStatus === "in-progress") return "helping";
      return "waiting";
    }
    return "completed";
  }, [submittedEntry, liveQueueRow, sessionEnded]);

  const submittedEntryDisplay = useMemo(() => {
    if (!submittedEntry) return null;
    if (liveQueueRow) {
      return {
        ...submittedEntry,
        position: liveQueueRow.position,
        status: mapStatusForUi(liveQueueRow.status)
      };
    }
    return {
      ...submittedEntry,
      status: "done"
    };
  }, [submittedEntry, liveQueueRow]);

  const sessionCodeForLinks =
    submittedEntry?.sessionCode ??
    apiSession?.sessionCode ??
    form.sessionCode.trim().toUpperCase();

  useEffect(() => {
    if (!submittedEntry || studentQueuePhase === "none") return;

    if (
      studentQueuePhase === "completed" ||
      studentQueuePhase === "session-ended"
    ) {
      clearQueueSession();
      return;
    }

    saveQueueSession({
      sessionCode: sessionCodeForLinks,
      queueEntryId: submittedEntry.queueEntryId,
      studentName: submittedEntry.studentName,
      question: submittedEntry.question,
      position: submittedEntryDisplay?.position ?? submittedEntry.position,
      submittedAt: submittedEntry.submittedAt
    });
  }, [
    submittedEntry,
    studentQueuePhase,
    sessionCodeForLinks,
    submittedEntryDisplay?.position
  ]);

  const waitingAhead = useMemo(
    () => queueRaw.filter((entry) => entry.status === "waiting").length,
    [queueRaw]
  );

  const currentPosition = submittedEntryDisplay?.position ?? null;

  const waitEstimate = useMemo(() => {
    if (studentQueuePhase !== "waiting" || !currentPosition) {
      return "—";
    }
    const minutes =
      (displaySession?.averageHelpMinutes ?? DEFAULT_AVG_HELP_MINUTES) *
      currentPosition;
    return `${minutes}-${minutes + 5} min`;
  }, [studentQueuePhase, currentPosition, displaySession?.averageHelpMinutes]);

  const visibleQueue = useMemo(() => {
    const currentId = submittedEntry?.queueEntryId;
    return queueRaw.map((entry) => mapQueueRow(entry, { currentId }));
  }, [queueRaw, submittedEntry?.queueEntryId]);

  function updateField(field, value) {
    setForm((currentForm) => ({ ...currentForm, [field]: value }));
    setErrors((currentErrors) => ({ ...currentErrors, [field]: "" }));
  }

  function triggerSubmit() {
    void handleSubmit({ preventDefault() {} });
  }

  function validateForm() {
    const nextErrors = {};
    const sessionCode = form.sessionCode.trim().toUpperCase();

    if (studentQueuePhase === "waiting" || studentQueuePhase === "helping") {
      nextErrors.sessionCode =
        "You are already in this queue. Use the status view below or return from the home page.";
      return nextErrors;
    }

    if (apiSession?.status === "ended") {
      nextErrors.sessionCode = "This office hours session has ended.";
      return nextErrors;
    }

    if (form.studentName.trim().length < 2) {
      nextErrors.studentName = "Enter your name before joining the queue.";
    }

    if (!sessionCode) {
      nextErrors.sessionCode = "Enter the session code from your host.";
    } else if (!apiSession || apiSession.sessionCode !== sessionCode) {
      nextErrors.sessionCode =
        sessionLoadState === "loading"
          ? "Still checking that session code…"
          : "No open session found for that code. Ask your host for the code.";
    }

    if (form.question.trim().length < 4) {
      nextErrors.question = "Add a short summary of what you need help with.";
    }

    return nextErrors;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const nextErrors = validateForm();
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    const sessionCode = form.sessionCode.trim().toUpperCase();
    const questionBody = [form.question.trim(), form.details.trim()]
      .filter(Boolean)
      .join("\n\n")
      .slice(0, 500);

    setIsSubmitting(true);
    try {
      const { queueEntry, position } = await joinQueue(sessionCode, {
        studentName: form.studentName.trim(),
        question: questionBody
      });
      const submittedAt = new Intl.DateTimeFormat("en", {
        hour: "numeric",
        minute: "2-digit"
      }).format(new Date());
      const entry = {
        queueEntryId: queueEntry.id,
        studentName: queueEntry.studentName,
        question: form.question.trim(),
        position,
        status: mapStatusForUi(queueEntry.status),
        submittedAt,
        sessionCode
      };
      setSubmittedEntry(entry);
      saveQueueSession(entry);
      const { queue } = await getQueue(sessionCode);
      setQueueRaw(Array.isArray(queue) ? queue : []);
    } catch (err) {
      const msg =
        err.status === 404
          ? "That session is no longer available."
          : err.status === 400
            ? err.message || "Could not join the queue."
            : err.status === 401 || err.status === 403
              ? authErrorText(err.status)
              : "Something went wrong. Is the backend running?";
      setErrors((prev) => ({ ...prev, sessionCode: msg }));
    } finally {
      setIsSubmitting(false);
    }
  }

  function resetEntry() {
    clearQueueSession();
    setForm({
      studentName: "",
      sessionCode: form.sessionCode.trim().toUpperCase(),
      question: "",
      details: ""
    });
    setErrors({});
    setSubmittedEntry(null);
  }

  const sessionTitle =
    displaySession?.title ??
    (sessionLoadState === "loading"
      ? "Looking up session…"
      : sessionLoadState === "unauthorized"
        ? "Sign in required"
        : sessionLoadState === "forbidden"
          ? "Access denied"
          : sessionLoadState === "notfound"
            ? "Session not found"
            : "Live help session");
  const sessionCodeLabel =
    (displaySession?.code ?? form.sessionCode.trim().toUpperCase()) || "—";

  return (
    <main className="app-shell">
      <section className="session-page" aria-labelledby="page-title">
        <header className="topbar">
          <div className="brand-lockup">
            <span className="brand-mark">
              <GraduationCap aria-hidden="true" size={24} />
            </span>
            <div>
              <p className="brand-name">HelpQ</p>
              <h1 id="page-title">Join a live help session</h1>
            </div>
          </div>
          <div className="topbar-actions">
            <Link className="home-back-link" to="/">
              Back to home
            </Link>
            {authDenied ? (
              <div className="ended-badge" aria-label="Access required">
                <CircleOff aria-hidden="true" size={17} />
                Access required
              </div>
            ) : sessionEnded ? (
              <div className="ended-badge" aria-label="Session has ended">
                <CircleOff aria-hidden="true" size={17} />
                Ended
              </div>
            ) : (
              <div className="live-badge" aria-label="Session is open">
                <Radio aria-hidden="true" size={17} />
                Open now
              </div>
            )}
          </div>
        </header>

        <div className="page-grid">
          <section className="session-panel" aria-labelledby="session-title">
            <div className="session-heading">
              <div>
                <p className="eyebrow">Session</p>
                <h2 id="session-title">{sessionTitle}</h2>
              </div>
              <span className="session-code">
                <Hash aria-hidden="true" size={18} />
                {sessionCodeLabel}
              </span>
            </div>

            <dl className="session-details">
              <div>
                <dt>Host</dt>
                <dd>
                  {displaySession?.host ??
                    "Enter a valid session code to connect to your class queue."}
                </dd>
              </div>
              <div>
                <dt>Time</dt>
                <dd>{displaySession?.time ?? "—"}</dd>
              </div>
              <div>
                <dt>Location</dt>
                <dd>{displaySession?.location ?? "—"}</dd>
              </div>
            </dl>

            {sessionEnded ? (
              <p className="session-ended-banner" role="status">
                This office hours session has ended. The queue is closed.
              </p>
            ) : null}

            {queueLoadError ? (
              <p className="field-message error" role="status">
                {queueLoadError}
              </p>
            ) : null}

            <div className="metrics-row" aria-label="Current queue summary">
              <Metric
                icon={<UsersRound aria-hidden="true" size={20} />}
                label="Waiting"
                value={waitingAhead}
              />
              {studentQueuePhase === "waiting" ? (
                <Metric
                  icon={<Clock3 aria-hidden="true" size={20} />}
                  label="Your estimate"
                  value={waitEstimate}
                />
              ) : null}
            </div>

            <QueuePreview
              entries={visibleQueue}
              emptyHint={!apiSession}
              sessionEnded={sessionEnded}
            />
          </section>

          <section className="join-panel" aria-labelledby="join-title">
            {authDenied ? (
              <AuthDeniedStatus status={sessionLoadState} />
            ) : studentQueuePhase === "session-ended" ? (
              <SessionEndedStatus entry={submittedEntryDisplay} />
            ) : studentQueuePhase !== "none" ? (
              <QueueStatus
                entry={submittedEntryDisplay}
                estimate={waitEstimate}
                onReset={resetEntry}
                phase={studentQueuePhase}
              />
            ) : (
              <>
                <div className="join-heading">
                  <p className="eyebrow">Student entry</p>
                  <h2 id="join-title">Enter the queue</h2>
                </div>

                <form className="join-form" noValidate onSubmit={handleSubmit}>
                  <Field
                    error={errors.sessionCode}
                    icon={<Hash aria-hidden="true" size={18} />}
                    id="sessionCode"
                    label="Session code">
                    <input
                      aria-describedby={
                        errors.sessionCode ? "sessionCode-message" : undefined
                      }
                      aria-invalid={Boolean(errors.sessionCode)}
                      autoComplete="off"
                      id="sessionCode"
                      name="sessionCode"
                      onChange={(event) =>
                        updateField(
                          "sessionCode",
                          event.target.value.toUpperCase()
                        )
                      }
                      placeholder="ABCD12"
                      type="text"
                      value={form.sessionCode}
                    />
                  </Field>

                  <Field
                    error={errors.studentName}
                    icon={<UserRound aria-hidden="true" size={18} />}
                    id="studentName"
                    label="Your name">
                    <input
                      aria-describedby={
                        errors.studentName ? "studentName-message" : undefined
                      }
                      aria-invalid={Boolean(errors.studentName)}
                      autoComplete="name"
                      id="studentName"
                      name="studentName"
                      onChange={(event) =>
                        updateField("studentName", event.target.value)
                      }
                      placeholder="Julia Lu"
                      type="text"
                      value={form.studentName}
                    />
                  </Field>

                  <Field
                    error={errors.question}
                    helper={`${form.question.trim().length}/140 characters`}
                    icon={<HelpCircle aria-hidden="true" size={18} />}
                    id="question"
                    label="Question summary">
                    <input
                      aria-describedby={
                        errors.question ? "question-message" : "question-helper"
                      }
                      aria-invalid={Boolean(errors.question)}
                      id="question"
                      maxLength={140}
                      name="question"
                      onChange={(event) =>
                        updateField("question", event.target.value)
                      }
                      placeholder="I need help with my React form"
                      type="text"
                      value={form.question}
                    />
                  </Field>

                  <Field
                    helper="Optional"
                    icon={<MessageSquareText aria-hidden="true" size={18} />}
                    id="details"
                    label="Extra details">
                    <textarea
                      aria-describedby="details-helper"
                      id="details"
                      name="details"
                      onChange={(event) =>
                        updateField("details", event.target.value)
                      }
                      placeholder="Share what you tried or where you are stuck."
                      value={form.details}
                    />
                  </Field>

                  <button
                    className="primary-action"
                    disabled={isSubmitting}
                    onClick={triggerSubmit}
                    type="button">
                    {isSubmitting ? (
                      <>
                        <Loader2
                          aria-hidden="true"
                          className="spin-icon"
                          size={19}
                        />
                        Joining queue
                      </>
                    ) : (
                      <>
                        Join queue
                        <ArrowRight aria-hidden="true" size={19} />
                      </>
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

function Field({ children, error, helper, icon, id, label }) {
  return (
    <div className="field-group">
      <label htmlFor={id}>
        <span>{icon}</span>
        {label}
      </label>
      {children}
      <p
        className={error ? "field-message error" : "field-message"}
        id={error ? `${id}-message` : `${id}-helper`}>
        {error || helper || ""}
      </p>
    </div>
  );
}

function Metric({ icon, label, value }) {
  return (
    <div className="metric">
      <span className="metric-icon">{icon}</span>
      <div>
        <p>{label}</p>
        <strong>{value}</strong>
      </div>
    </div>
  );
}

function SessionEndedStatus({ entry }) {
  return (
    <div className="status-view status-view-ended">
      <CircleOff aria-hidden="true" className="status-icon muted" size={40} />
      <p className="eyebrow">Session closed</p>
      <h2 id="join-title">Office hours ended</h2>
      <p className="status-note">
        The host ended this session. The queue is closed and this session code
        no longer accepts new entries.
      </p>

      {entry ? (
        <dl className="status-details">
          <div>
            <dt>Your last question</dt>
            <dd>{entry.question}</dd>
          </div>
          <div>
            <dt>Submitted</dt>
            <dd>{entry.submittedAt}</dd>
          </div>
        </dl>
      ) : null}

      <button
        className="primary-action queue-resume-home-link"
        type="button"
        onClick={() => {
          clearQueueSession();
          window.location.assign("/");
        }}>
        Back to home
      </button>
    </div>
  );
}

function AuthDeniedStatus({ status }) {
  const heading = status === "forbidden" ? "Access denied" : "Sign in required";
  const note =
    status === "forbidden"
      ? "Your account doesn’t have permission to view or join this session."
      : "Please sign in again to continue.";

  return (
    <div className="status-view status-view-ended">
      <CircleOff aria-hidden="true" className="status-icon muted" size={40} />
      <p className="eyebrow">Authorization</p>
      <h2 id="join-title">{heading}</h2>
      <p className="status-note">{note}</p>

      <Link className="home-back-link queue-resume-home-link" to="/login">
        Back to sign in
      </Link>
      <p className="field-message">
        {status === "forbidden"
          ? "If you believe this is a mistake, ask your instructor."
          : "If you were already signed in, your session may have expired."}
      </p>
    </div>
  );
}

function QueuePreview({ entries, emptyHint, sessionEnded = false }) {
  return (
    <section className="queue-preview" aria-labelledby="queue-title">
      <div className="queue-title-row">
        <h3 id="queue-title">{sessionEnded ? "Queue" : "Live queue"}</h3>
        <span>{sessionEnded ? "Closed" : `${entries.length} active`}</span>
      </div>
      {sessionEnded ? (
        <p className="field-message">No longer accepting students.</p>
      ) : null}
      {emptyHint && entries.length === 0 && !sessionEnded ? (
        <p className="field-message">
          Enter a session code your host shared. The list updates every few
          seconds.
        </p>
      ) : null}
      <ol>
        {entries.map((entry, index) => (
          <li
            className={
              entry.isCurrentStudent ? "queue-row current" : "queue-row"
            }
            key={entry.id}>
            <span className="queue-position">
              {entry.position ?? index + 1}
            </span>
            <div className="queue-copy">
              <strong>{entry.isCurrentStudent ? "You" : entry.name}</strong>
              <span>{entry.question}</span>
            </div>
            <StatusPill status={entry.status} />
          </li>
        ))}
      </ol>
    </section>
  );
}

function QueueStatus({ entry, estimate, onReset, phase }) {
  if (phase === "completed") {
    return (
      <div className="status-view">
        <CheckCircle2 aria-hidden="true" className="status-icon" size={40} />
        <p className="eyebrow">All set</p>
        <h2 id="join-title">You&apos;re done</h2>
        <p className="status-note">
          The host marked your question as complete. You&apos;re no longer in
          the queue.
        </p>

        <dl className="status-details">
          <div>
            <dt>Status</dt>
            <dd>Done</dd>
          </div>
          <div>
            <dt>Submitted</dt>
            <dd>{entry.submittedAt}</dd>
          </div>
          <div>
            <dt>Question</dt>
            <dd>{entry.question}</dd>
          </div>
        </dl>

        <button className="secondary-action" onClick={onReset} type="button">
          <Link2 aria-hidden="true" size={18} />
          Join another session
        </button>
      </div>
    );
  }

  if (phase === "helping") {
    return (
      <div className="status-view">
        <CheckCircle2 aria-hidden="true" className="status-icon" size={40} />
        <p className="eyebrow">You&apos;re up</p>
        <h2 id="join-title">Host is helping you</h2>
        <p className="status-note">
          A host is working with you now. You can leave this page — your spot
          stays saved. Use <strong>Back to home</strong> or your class page to
          return without joining again.
        </p>

        <dl className="status-details">
          <div>
            <dt>Status</dt>
            <dd>In progress</dd>
          </div>
          <div>
            <dt>Submitted</dt>
            <dd>{entry.submittedAt}</dd>
          </div>
          <div>
            <dt>Question</dt>
            <dd>{entry.question}</dd>
          </div>
        </dl>

        <Link className="home-back-link queue-resume-home-link" to="/">
          Back to home
        </Link>
      </div>
    );
  }

  return (
    <div className="status-view">
      <CheckCircle2 aria-hidden="true" className="status-icon" size={40} />
      <p className="eyebrow">You are in line</p>
      <h2 id="join-title">Position {entry.position}</h2>
      <p className="status-note">
        You can leave this page — your spot is saved. Use the banner on home or
        your class page to pick up where you left off without joining again.
      </p>

      <dl className="status-details">
        <div>
          <dt>Status</dt>
          <dd>Waiting</dd>
        </div>
        <div>
          <dt>Estimated wait</dt>
          <dd>{estimate}</dd>
        </div>
        <div>
          <dt>Submitted</dt>
          <dd>{entry.submittedAt}</dd>
        </div>
        <div>
          <dt>Question</dt>
          <dd>{entry.question}</dd>
        </div>
      </dl>

      <Link className="home-back-link queue-resume-home-link" to="/">
        Back to home
      </Link>
    </div>
  );
}

function StatusPill({ status }) {
  const label =
    status === "in-progress"
      ? "In progress"
      : status === "done"
        ? "Done"
        : "Waiting";
  return <span className={`status-pill ${status}`}>{label}</span>;
}
