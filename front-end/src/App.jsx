import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Clock3,
  GraduationCap,
  Hash,
  HelpCircle,
  Link2,
  Loader2,
  LockKeyhole,
  LogOut,
  Mail,
  MessageSquareText,
  UserRound,
  UsersRound
} from "lucide-react";
import { apiFetch } from "./lib/api";
import { isSupabaseConfigured, supabase } from "./lib/supabaseClient";

const initialAuthForm = {
  email: "",
  password: "",
  fullName: ""
};

function App() {
  const [student, setStudent] = useState(null);
  const [authStatus, setAuthStatus] = useState(
    isSupabaseConfigured ? "checking" : "signed-out"
  );
  const [authError, setAuthError] = useState("");
  const [isAuthSubmitting, setIsAuthSubmitting] = useState(false);
  const [authMode, setAuthMode] = useState("sign-in");

  useEffect(() => {
    if (!isSupabaseConfigured) {
      return undefined;
    }

    let isMounted = true;

    async function loadCurrentSession() {
      const { data, error } = await supabase.auth.getSession();

      if (!isMounted) {
        return;
      }

      if (error) {
        setAuthError("We could not check your current login session.");
        setAuthStatus("signed-out");
        return;
      }

      if (!data.session?.user) {
        setAuthStatus("signed-out");
        return;
      }

      await syncSupabaseStudent(data.session.user, {
        onError: setAuthError,
        onStatus: setAuthStatus,
        onStudent: setStudent
      });
    }

    loadCurrentSession();

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, sessionData) => {
      if (!sessionData?.user) {
        setStudent(null);
        setAuthStatus("signed-out");
        return;
      }

      syncSupabaseStudent(sessionData.user, {
        onError: setAuthError,
        onStatus: setAuthStatus,
        onStudent: setStudent
      });
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  async function handleAuthSubmit(form) {
    setAuthError("");

    if (!isSupabaseConfigured) {
      setAuthError(
        "Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY."
      );
      return;
    }

    setIsAuthSubmitting(true);

    try {
      if (authMode === "sign-up") {
        const { error } = await supabase.auth.signUp({
          email: form.email,
          password: form.password,
          options: {
            data: {
              full_name: form.fullName,
              role: "student"
            }
          }
        });

        if (error) {
          throw error;
        }

        setAuthError(
          "Account created. If email confirmation is enabled, verify your inbox before signing in."
        );
        setAuthMode("sign-in");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: form.email,
          password: form.password
        });

        if (error) {
          throw error;
        }
      }
    } catch (error) {
      setAuthError(error.message || "Authentication failed.");
    } finally {
      setIsAuthSubmitting(false);
    }
  }

  async function handleLogout() {
    if (isSupabaseConfigured) {
      await supabase.auth.signOut();
    }

    setStudent(null);
    setAuthStatus("signed-out");
  }

  return student ? (
    <SessionPage student={student} onLogout={handleLogout} />
  ) : (
    <LoginPage
      authError={authError}
      authMode={authMode}
      authStatus={authStatus}
      isAuthSubmitting={isAuthSubmitting}
      onAuthModeChange={setAuthMode}
      onAuthSubmit={handleAuthSubmit}
    />
  );
}

function LoginPage({
  authError,
  authMode,
  authStatus,
  isAuthSubmitting,
  onAuthModeChange,
  onAuthSubmit
}) {
  const [form, setForm] = useState(initialAuthForm);
  const [errors, setErrors] = useState({});

  function updateField(field, value) {
    setForm((currentForm) => ({ ...currentForm, [field]: value }));
    setErrors((currentErrors) => ({ ...currentErrors, [field]: "" }));
  }

  function validateAuthForm() {
    const nextErrors = {};

    if (!form.email.trim()) {
      nextErrors.email = "Enter your email.";
    }

    if (!form.password.trim()) {
      nextErrors.password = "Enter your password.";
    } else if (form.password.length < 6) {
      nextErrors.password = "Password must be at least 6 characters.";
    }

    if (authMode === "sign-up" && !form.fullName.trim()) {
      nextErrors.fullName = "Enter your name.";
    }

    return nextErrors;
  }

  function handleSubmit(event) {
    event.preventDefault();
    const nextErrors = validateAuthForm();
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    onAuthSubmit({
      email: form.email.trim().toLowerCase(),
      password: form.password,
      fullName: form.fullName.trim()
    });
  }

  const submitLabel =
    authMode === "sign-up" ? "Create student account" : "Sign in";

  return (
    <main className="app-shell login-shell">
      <section className="login-page" aria-labelledby="login-title">
        <header className="topbar login-topbar">
          <div className="brand-lockup">
            <span className="brand-mark">
              <GraduationCap aria-hidden="true" size={24} />
            </span>
            <div>
              <p className="brand-name">HelpQ</p>
              <h1 id="login-title">Student access</h1>
            </div>
          </div>
          <div className="live-badge" aria-label="Login is protected">
            <LockKeyhole aria-hidden="true" size={17} />
            Secure access
          </div>
        </header>

        <div className="login-grid">
          <section className="login-panel" aria-labelledby="form-title">
            <div className="join-heading">
              <p className="eyebrow">Welcome</p>
              <h2 id="form-title">
                {authMode === "sign-up" ? "Create an account" : "Sign in"}
              </h2>
            </div>

            {authError ? (
              <div className="auth-alert" role="alert">
                <AlertCircle aria-hidden="true" size={20} />
                <p>{authError}</p>
              </div>
            ) : null}

            {!isSupabaseConfigured ? (
              <div className="config-note">
                <AlertCircle aria-hidden="true" size={20} />
                <p>
                  Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to enable
                  login.
                </p>
              </div>
            ) : null}

            <form className="join-form demo-login-form" noValidate onSubmit={handleSubmit}>
              {authMode === "sign-up" ? (
                <Field
                  error={errors.fullName}
                  icon={<UserRound aria-hidden="true" size={18} />}
                  id="fullName"
                  label="Full name">
                  <input
                    aria-describedby={
                      errors.fullName ? "fullName-message" : undefined
                    }
                    aria-invalid={Boolean(errors.fullName)}
                    autoComplete="name"
                    id="fullName"
                    name="fullName"
                    onChange={(event) =>
                      updateField("fullName", event.target.value)
                    }
                    placeholder="Julia Lu"
                    type="text"
                    value={form.fullName}
                  />
                </Field>
              ) : null}

              <Field
                error={errors.email}
                icon={<Mail aria-hidden="true" size={18} />}
                id="email"
                label="Email">
                <input
                  aria-describedby={errors.email ? "email-message" : undefined}
                  aria-invalid={Boolean(errors.email)}
                  autoComplete="email"
                  id="email"
                  name="email"
                  onChange={(event) => updateField("email", event.target.value)}
                  placeholder="julia.lu@calpoly.edu"
                  type="email"
                  value={form.email}
                />
              </Field>

              <Field
                error={errors.password}
                icon={<LockKeyhole aria-hidden="true" size={18} />}
                id="password"
                label="Password">
                <input
                  aria-describedby={
                    errors.password ? "password-message" : undefined
                  }
                  aria-invalid={Boolean(errors.password)}
                  autoComplete={
                    authMode === "sign-up" ? "new-password" : "current-password"
                  }
                  id="password"
                  name="password"
                  onChange={(event) =>
                    updateField("password", event.target.value)
                  }
                  placeholder="Enter your password"
                  type="password"
                  value={form.password}
                />
              </Field>

              <button
                className="primary-action"
                disabled={
                  !isSupabaseConfigured ||
                  authStatus === "checking" ||
                  isAuthSubmitting
                }
                type="submit">
                {authStatus === "checking" || isAuthSubmitting ? (
                  <>
                    <Loader2 aria-hidden="true" className="spin-icon" size={19} />
                    Processing
                  </>
                ) : (
                  <>
                    {submitLabel}
                    <ArrowRight aria-hidden="true" size={19} />
                  </>
                )}
              </button>
            </form>

            <button
              className="secondary-action"
              onClick={() =>
                onAuthModeChange(authMode === "sign-up" ? "sign-in" : "sign-up")
              }
              type="button">
              {authMode === "sign-up"
                ? "Already have an account?"
                : "Need an account?"}
            </button>
          </section>

          <aside className="login-context" aria-label="HelpQ session preview">
            <p className="eyebrow">How it works</p>
            <h2>Join live office-hours queues</h2>
            <dl className="login-summary">
              <div>
                <dt>Step 1</dt>
                <dd>Sign in with your student account.</dd>
              </div>
              <div>
                <dt>Step 2</dt>
                <dd>Enter the host session code.</dd>
              </div>
              <div>
                <dt>Step 3</dt>
                <dd>Submit your question and track the live queue.</dd>
              </div>
            </dl>
          </aside>
        </div>
      </section>
    </main>
  );
}

function SessionPage({ onLogout, student }) {
  const [form, setForm] = useState(() => createInitialJoinForm());
  const [errors, setErrors] = useState({});
  const [submittedEntry, setSubmittedEntry] = useState(null);
  const [sessionData, setSessionData] = useState(null);
  const [queueEntries, setQueueEntries] = useState([]);
  const [stats, setStats] = useState(null);
  const [lookupError, setLookupError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingSession, setIsLoadingSession] = useState(false);

  useEffect(() => {
    const sessionCode = form.sessionCode.trim().toUpperCase();

    if (!sessionCode) {
      return undefined;
    }

    async function loadSessionPreview() {
      setIsLoadingSession(true);
      setLookupError("");

      try {
        const nextSession = await apiFetch(`/api/sessions/join/${sessionCode}`);
        setSessionData(nextSession);

        const [nextQueue, nextStats] = await Promise.all([
          apiFetch(`/api/sessions/${nextSession.id}/queue`),
          apiFetch(`/api/sessions/${nextSession.id}/stats`)
        ]);

        setQueueEntries(nextQueue);
        setStats(nextStats);

        if (submittedEntry?.id) {
          const updatedPosition = findQueuePosition(nextQueue, submittedEntry.id);

          if (updatedPosition) {
            setSubmittedEntry((currentEntry) =>
              currentEntry
                ? {
                    ...currentEntry,
                    position: updatedPosition
                  }
                : currentEntry
            );
          }
        }
      } catch (error) {
        setSessionData(null);
        setQueueEntries([]);
        setStats(null);
        setLookupError(
          error.status === 404
            ? `No open session found for ${sessionCode}.`
            : error.message || "Could not load session."
        );
      } finally {
        setIsLoadingSession(false);
      }
    }

    const timeoutId = window.setTimeout(() => {
      void loadSessionPreview();
    }, 250);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [form.sessionCode, submittedEntry?.id]);

  const waitingAhead = stats?.waiting ?? queueEntries.length;
  const currentPosition = submittedEntry?.position || waitingAhead + 1;

  const waitEstimate = useMemo(() => {
    const minutesPerStudent = 8;
    const lowEstimate = currentPosition * minutesPerStudent;
    return `${lowEstimate}-${lowEstimate + 5} min`;
  }, [currentPosition]);

  const visibleQueue = useMemo(
    () =>
      queueEntries.map((entry) => ({
        id: entry.id,
        name: entry.student_name,
        question: entry.question,
        status: entry.status.replace("_", "-"),
        isCurrentStudent: entry.id === submittedEntry?.id
      })),
    [queueEntries, submittedEntry]
  );

  function updateField(field, value) {
    if (field === "sessionCode" && !value.trim()) {
      setSessionData(null);
      setQueueEntries([]);
      setStats(null);
      setLookupError("");
      setSubmittedEntry(null);
    }

    setForm((currentForm) => ({ ...currentForm, [field]: value }));
    setErrors((currentErrors) => ({ ...currentErrors, [field]: "" }));
    setSubmitError("");
  }

  function validateForm() {
    const nextErrors = {};

    if (!form.sessionCode.trim()) {
      nextErrors.sessionCode = "Enter the session code from your host.";
    } else if (!sessionData) {
      nextErrors.sessionCode = "Enter a valid open session code.";
    }

    if (form.question.trim().length < 8) {
      nextErrors.question = "Add a short summary of what you need help with.";
    }

    return nextErrors;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const nextErrors = validateForm();
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0 || !sessionData) {
      return;
    }

    setIsSubmitting(true);
    setSubmitError("");

    try {
      const entry = await apiFetch(`/api/sessions/${sessionData.id}/queue`, {
        method: "POST",
        body: JSON.stringify({
          studentName: student.name,
          question: form.question.trim()
        })
      });

      const [nextQueue, nextStats] = await Promise.all([
        apiFetch(`/api/sessions/${sessionData.id}/queue`),
        apiFetch(`/api/sessions/${sessionData.id}/stats`)
      ]);

      setQueueEntries(nextQueue);
      setStats(nextStats);

      const position = findQueuePosition(nextQueue, entry.id) || nextStats?.waiting;

      setSubmittedEntry({
        id: entry.id,
        question: entry.question,
        position: position || 1,
        submittedAt: new Intl.DateTimeFormat("en", {
          hour: "numeric",
          minute: "2-digit"
        }).format(new Date(entry.created_at || Date.now()))
      });
    } catch (error) {
      if (error.status === 401) {
        setSubmitError("You must be signed in to join the queue.");
      } else if (error.status === 403) {
        setSubmitError("Only student accounts can submit queue questions.");
      } else {
        setSubmitError(error.message || "Could not join the queue.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  function resetEntry() {
    setForm(createInitialJoinForm(form.sessionCode));
    setErrors({});
    setSubmittedEntry(null);
    setSubmitError("");
  }

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
              <h1 id="page-title">{sessionData?.title || "Join a session"}</h1>
            </div>
          </div>
          <div className="session-actions">
            <div className="student-chip">
              <UserRound aria-hidden="true" size={17} />
              {student.name}
            </div>
            <button className="icon-action" onClick={onLogout} type="button">
              <LogOut aria-hidden="true" size={18} />
              <span>Sign out</span>
            </button>
          </div>
        </header>

        <div className="page-grid">
          <section className="session-panel" aria-labelledby="session-title">
            <div className="session-heading">
              <div>
                <p className="eyebrow">Session</p>
                <h2 id="session-title">{sessionData?.title || "Waiting for code"}</h2>
              </div>
              <span className="session-code">
                <Hash aria-hidden="true" size={18} />
                {sessionData?.join_code || form.sessionCode || "----"}
              </span>
            </div>

            <dl className="session-details">
              <div>
                <dt>Status</dt>
                <dd>{sessionData?.status || "Enter a code"}</dd>
              </div>
              <div>
                <dt>Notes</dt>
                <dd>{sessionData?.description || "No session notes provided."}</dd>
              </div>
              <div>
                <dt>Queue</dt>
                <dd>{stats ? `${stats.waiting} waiting` : "No queue data yet"}</dd>
              </div>
            </dl>

            <div className="metrics-row" aria-label="Current queue summary">
              <Metric
                icon={<UsersRound aria-hidden="true" size={20} />}
                label="Waiting"
                value={stats?.waiting ?? 0}
              />
              <Metric
                icon={<Clock3 aria-hidden="true" size={20} />}
                label="Your estimate"
                value={waitEstimate}
              />
            </div>

            <QueuePreview entries={visibleQueue} />
          </section>

          <section className="join-panel" aria-labelledby="join-title">
            {submittedEntry ? (
              <QueueStatus
                entry={submittedEntry}
                estimate={waitEstimate}
                onReset={resetEntry}
              />
            ) : (
              <>
                <div className="join-heading">
                  <p className="eyebrow">Queue request</p>
                  <h2 id="join-title">Ask for help</h2>
                </div>

                <div className="identity-note" aria-label="Signed in student">
                  <UserRound aria-hidden="true" size={18} />
                  <div>
                    <span>Signed in as</span>
                    <strong>{student.name}</strong>
                  </div>
                </div>

                {lookupError ? (
                  <div className="auth-alert" role="alert">
                    <AlertCircle aria-hidden="true" size={20} />
                    <p>{lookupError}</p>
                  </div>
                ) : null}

                {submitError ? (
                  <div className="auth-alert" role="alert">
                    <AlertCircle aria-hidden="true" size={20} />
                    <p>{submitError}</p>
                  </div>
                ) : null}

                <form className="join-form" noValidate onSubmit={handleSubmit}>
                  <Field
                    error={errors.sessionCode}
                    helper={
                      isLoadingSession
                        ? "Checking session code..."
                        : sessionData
                          ? "Session found."
                          : ""
                    }
                    icon={<Hash aria-hidden="true" size={18} />}
                    id="sessionCode"
                    label="Session code">
                    <input
                      aria-describedby={
                        errors.sessionCode ? "sessionCode-message" : "sessionCode-helper"
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
                      placeholder="CS307"
                      type="text"
                      value={form.sessionCode}
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
                    helper="Optional for now. Backend does not store this field yet."
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
                    disabled={isSubmitting || isLoadingSession || !sessionData}
                    type="submit">
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

function QueuePreview({ entries }) {
  return (
    <section className="queue-preview" aria-labelledby="queue-title">
      <div className="queue-title-row">
        <h3 id="queue-title">Live queue</h3>
        <span>{entries.length} active</span>
      </div>
      <ol>
        {entries.map((entry, index) => (
          <li
            className={
              entry.isCurrentStudent ? "queue-row current" : "queue-row"
            }
            key={entry.id}>
            <span className="queue-position">{index + 1}</span>
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

function QueueStatus({ entry, estimate, onReset }) {
  return (
    <div className="status-view">
      <CheckCircle2 aria-hidden="true" className="status-icon" size={40} />
      <p className="eyebrow">You are in line</p>
      <h2 id="join-title">Position {entry.position}</h2>
      <p className="status-note">
        Your request is waiting. Keep this page open so you can see when the
        host starts helping you.
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

      <button className="secondary-action" onClick={onReset} type="button">
        <Link2 aria-hidden="true" size={18} />
        Join another session
      </button>
    </div>
  );
}

function StatusPill({ status }) {
  const label = status === "in-progress" ? "In progress" : "Waiting";
  return <span className={`status-pill ${status}`}>{label}</span>;
}

function createInitialJoinForm(sessionCode = getInitialSessionCode()) {
  return {
    sessionCode,
    question: "",
    details: ""
  };
}

function getInitialSessionCode() {
  const params = new URLSearchParams(window.location.search);
  return (params.get("code") || "").toUpperCase();
}

function getStudentName(email) {
  const namePart = email.trim().split("@")[0] || "Student";
  const namePieces = namePart
    .replace(/[._-]+/g, " ")
    .split(" ")
    .filter(Boolean);

  return namePieces
    .map((piece) => piece.charAt(0).toUpperCase() + piece.slice(1))
    .join(" ");
}

function findQueuePosition(queueEntries, entryId) {
  const position = queueEntries.findIndex((entry) => entry.id === entryId);
  return position === -1 ? null : position + 1;
}

async function syncSupabaseStudent(user, handlers) {
  handlers.onStatus("checking");

  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, email, full_name, role, avatar_url")
      .eq("id", user.id)
      .maybeSingle();

    if (error) {
      throw error;
    }

    const student = createStudentFromSupabaseUser(user, data);

    if (student.role !== "student") {
      throw new Error("Only student accounts can use the student login page.");
    }

    handlers.onStudent(student);
    handlers.onError("");
    handlers.onStatus("signed-in");
  } catch (error) {
    handlers.onStudent(null);
    handlers.onError(
      error.message || "Your account profile is not ready for student access."
    );
    handlers.onStatus("signed-out");
  }
}

function createStudentFromSupabaseUser(user, profile) {
  const metadata = user.user_metadata || {};
  const email = profile?.email || user.email || "";

  return {
    avatarUrl: profile?.avatar_url || metadata.avatar_url || "",
    email,
    id: user.id,
    name:
      profile?.full_name ||
      metadata.full_name ||
      metadata.name ||
      getStudentName(email),
    role: profile?.role || metadata.role || "student"
  };
}

export default App;
