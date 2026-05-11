import { useMemo, useState } from "react";
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
  UserRound,
  UsersRound
} from "lucide-react";

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

const initialForm = {
  studentName: "",
  sessionCode: getInitialSessionCode(),
  question: "",
  details: ""
};

function App() {
  const [form, setForm] = useState(initialForm);
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

    if (form.studentName.trim().length < 2) {
      nextErrors.studentName = "Enter your name before joining the queue.";
    }

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
        ...form,
        sessionCode: form.sessionCode.trim().toUpperCase(),
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
    setForm({
      ...initialForm,
      sessionCode: form.sessionCode.trim().toUpperCase()
    });
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
              <h1 id="page-title">Join a live help session</h1>
            </div>
          </div>
          <div className="live-badge" aria-label="Session is open">
            <Radio aria-hidden="true" size={17} />
            Open now
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
                      placeholder="CS307"
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

export default App;
