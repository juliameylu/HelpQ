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
  LogIn,
  LogOut,
  Mail,
  MessageSquareText,
  UserRound,
  UsersRound
} from "lucide-react";
import { isSupabaseConfigured, supabase } from "./lib/supabaseClient";

const session = {
  code: "CS307",
  title: "CSC 307 Office Hours",
  host: "Professor Lin and TA team",
  time: "Today, 2:00 PM - 4:00 PM",
  location: "Building 14, Room 232",
  averageHelpMinutes: 8
};

const queueEntries = [
  {
    id: "maya",
    name: "Maya C.",
    question: "Project setup keeps failing on npm install",
    status: "in-progress"
  },
  {
    id: "alex",
    name: "Alex R.",
    question: "React state is not updating after submit",
    status: "waiting"
  },
  {
    id: "priya",
    name: "Priya S.",
    question: "Need help testing an Express route",
    status: "waiting"
  }
];

const initialDemoForm = {
  demoEmail: "julia.lu@calpoly.edu"
};

function App() {
  const [student, setStudent] = useState(null);
  const [authStatus, setAuthStatus] = useState(
    isSupabaseConfigured ? "checking" : "signed-out"
  );
  const [authError, setAuthError] = useState("");
  const [isOAuthSubmitting, setIsOAuthSubmitting] = useState(false);

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

  function handleDemoLogin(nextStudent) {
    setAuthError("");
    setAuthStatus("signed-in");
    setStudent(nextStudent);
  }

  async function handleOAuthLogin() {
    setAuthError("");

    if (!isSupabaseConfigured) {
      setAuthError(
        "Supabase is not configured locally yet. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY, or use demo access."
      );
      return;
    }

    setIsOAuthSubmitting(true);

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.href
      }
    });

    if (error) {
      setAuthError("We could not start Supabase login. Try again.");
      setIsOAuthSubmitting(false);
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
      authStatus={authStatus}
      isOAuthSubmitting={isOAuthSubmitting}
      onDemoLogin={handleDemoLogin}
      onOAuthLogin={handleOAuthLogin}
    />
  );
}

function LoginPage({
  authError,
  authStatus,
  isOAuthSubmitting,
  onDemoLogin,
  onOAuthLogin
}) {
  const [form, setForm] = useState(initialDemoForm);
  const [errors, setErrors] = useState({});

  function updateField(field, value) {
    setForm((currentForm) => ({ ...currentForm, [field]: value }));
    setErrors((currentErrors) => ({ ...currentErrors, [field]: "" }));
  }

  function validateDemoAccess() {
    const nextErrors = {};

    if (!form.demoEmail.trim()) {
      nextErrors.demoEmail = "Enter a demo student email.";
    }

    return nextErrors;
  }

  function handleDemoSubmit(event) {
    event.preventDefault();
    const nextErrors = validateDemoAccess();
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    onDemoLogin({
      email: form.demoEmail.trim().toLowerCase(),
      id: "demo-student",
      name: getStudentName(form.demoEmail),
      role: "student"
    });
  }

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
              <h1 id="login-title">Student login</h1>
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
              <p className="eyebrow">Welcome back</p>
              <h2 id="form-title">Sign in with Supabase</h2>
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
                  Add Supabase frontend env vars to use OAuth. Demo access is
                  available for local UI work.
                </p>
              </div>
            ) : null}

            <button
              className="primary-action"
              disabled={authStatus === "checking" || isOAuthSubmitting}
              onClick={onOAuthLogin}
              type="button">
              {authStatus === "checking" || isOAuthSubmitting ? (
                <>
                  <Loader2 aria-hidden="true" className="spin-icon" size={19} />
                  Checking session
                </>
              ) : (
                <>
                  Continue with Google
                  <LogIn aria-hidden="true" size={19} />
                </>
              )}
            </button>

            <div className="login-divider">
              <span>Local demo</span>
            </div>

            <form
              className="join-form demo-login-form"
              noValidate
              onSubmit={handleDemoSubmit}>
              <Field
                error={errors.demoEmail}
                icon={<Mail aria-hidden="true" size={18} />}
                id="demoEmail"
                label="Demo student email">
                <input
                  aria-describedby={
                    errors.demoEmail ? "demoEmail-message" : undefined
                  }
                  aria-invalid={Boolean(errors.demoEmail)}
                  autoComplete="email"
                  id="demoEmail"
                  name="demoEmail"
                  onChange={(event) =>
                    updateField("demoEmail", event.target.value)
                  }
                  placeholder="julia.lu@calpoly.edu"
                  type="email"
                  value={form.demoEmail}
                />
              </Field>

              <button className="secondary-action" type="submit">
                Use demo student
                <ArrowRight aria-hidden="true" size={18} />
              </button>
            </form>
          </section>

          <aside className="login-context" aria-label="HelpQ session preview">
            <p className="eyebrow">Next session</p>
            <h2>{session.title}</h2>
            <dl className="login-summary">
              <div>
                <dt>Time</dt>
                <dd>{session.time}</dd>
              </div>
              <div>
                <dt>Queue</dt>
                <dd>{queueEntries.length} active requests</dd>
              </div>
              <div>
                <dt>Session code</dt>
                <dd>{session.code}</dd>
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
  const [isSubmitting, setIsSubmitting] = useState(false);

  const waitingAhead = queueEntries.filter(
    (entry) => entry.status === "waiting"
  ).length;

  const currentPosition = submittedEntry
    ? submittedEntry.position
    : waitingAhead + 1;

  const waitEstimate = useMemo(() => {
    const lowEstimate = currentPosition * session.averageHelpMinutes;
    return `${lowEstimate}-${lowEstimate + 5} min`;
  }, [currentPosition]);

  const visibleQueue = useMemo(() => {
    if (!submittedEntry) {
      return queueEntries;
    }

    return [
      ...queueEntries,
      {
        id: submittedEntry.id,
        name: submittedEntry.studentName,
        question: submittedEntry.question,
        status: "waiting",
        isCurrentStudent: true
      }
    ];
  }, [submittedEntry]);

  function updateField(field, value) {
    setForm((currentForm) => ({ ...currentForm, [field]: value }));
    setErrors((currentErrors) => ({ ...currentErrors, [field]: "" }));
  }

  function validateForm() {
    const nextErrors = {};
    const sessionCode = form.sessionCode.trim().toUpperCase();

    if (!sessionCode) {
      nextErrors.sessionCode = "Enter the session code from your host.";
    } else if (sessionCode !== session.code) {
      nextErrors.sessionCode = `No open session found for ${sessionCode}.`;
    }

    if (form.question.trim().length < 8) {
      nextErrors.question = "Add a short summary of what you need help with.";
    }

    return nextErrors;
  }

  function handleSubmit(event) {
    event.preventDefault();
    const nextErrors = validateForm();
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setIsSubmitting(true);

    window.setTimeout(() => {
      setSubmittedEntry({
        id: createEntryId(),
        details: form.details.trim(),
        question: form.question.trim(),
        sessionCode: form.sessionCode.trim().toUpperCase(),
        studentName: student.name,
        position: waitingAhead + 1,
        status: "waiting",
        submittedAt: new Intl.DateTimeFormat("en", {
          hour: "numeric",
          minute: "2-digit"
        }).format(new Date())
      });
      setIsSubmitting(false);
    }, 400);
  }

  function resetEntry() {
    setForm(createInitialJoinForm(form.sessionCode));
    setErrors({});
    setSubmittedEntry(null);
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
              <h1 id="page-title">{session.title}</h1>
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
                <h2 id="session-title">{session.title}</h2>
              </div>
              <span className="session-code">
                <Hash aria-hidden="true" size={18} />
                {session.code}
              </span>
            </div>

            <dl className="session-details">
              <div>
                <dt>Host</dt>
                <dd>{session.host}</dd>
              </div>
              <div>
                <dt>Time</dt>
                <dd>{session.time}</dd>
              </div>
              <div>
                <dt>Location</dt>
                <dd>{session.location}</dd>
              </div>
            </dl>

            <div className="metrics-row" aria-label="Current queue summary">
              <Metric
                icon={<UsersRound aria-hidden="true" size={20} />}
                label="Waiting"
                value={submittedEntry ? waitingAhead + 1 : waitingAhead}
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

function createEntryId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return `entry-${Date.now()}`;
}

function getInitialSessionCode() {
  const params = new URLSearchParams(window.location.search);
  return (params.get("code") || session.code).toUpperCase();
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
  } catch {
    handlers.onStudent(null);
    handlers.onError("Your account profile is not ready for student access.");
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
