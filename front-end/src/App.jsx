import { useMemo, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  GraduationCap,
  Hash,
  HelpCircle,
  Loader2,
  MessageSquareText,
  UserRound
} from "lucide-react";

const initialForm = {
  studentName: "",
  sessionCode: "",
  question: "",
  details: ""
};

const sampleQueue = [
  {
    name: "Maya C.",
    topic: "Project setup",
    status: "being helped"
  },
  {
    name: "Alex R.",
    topic: "React state bug",
    status: "waiting"
  },
  {
    name: "Priya S.",
    topic: "Express route test",
    status: "waiting"
  }
];

function App() {
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [submittedEntry, setSubmittedEntry] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const questionLength = form.question.trim().length;

  const waitEstimate = useMemo(() => {
    const visibleQueueLength = submittedEntry ? sampleQueue.length + 1 : sampleQueue.length;
    return `${visibleQueueLength * 7}-${visibleQueueLength * 9} min`;
  }, [submittedEntry]);

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: "" }));
  }

  function validateForm() {
    const nextErrors = {};

    if (!form.studentName.trim()) {
      nextErrors.studentName = "Enter your name so the host knows who to call.";
    }

    if (!form.sessionCode.trim()) {
      nextErrors.sessionCode = "Enter the session code your host shared.";
    } else if (form.sessionCode.trim().length < 4) {
      nextErrors.sessionCode = "Session codes should be at least 4 characters.";
    }

    if (!form.question.trim()) {
      nextErrors.question = "Summarize what you need help with.";
    } else if (form.question.trim().length < 8) {
      nextErrors.question = "Add a little more detail so the host can prepare.";
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
      const entry = {
        ...form,
        id: crypto.randomUUID(),
        position: sampleQueue.length + 1,
        submittedAt: new Intl.DateTimeFormat("en", {
          hour: "numeric",
          minute: "2-digit"
        }).format(new Date())
      };

      setSubmittedEntry(entry);
      setIsSubmitting(false);
    }, 450);
  }

  function resetForm() {
    setForm(initialForm);
    setErrors({});
    setSubmittedEntry(null);
  }

  return (
    <main className="min-h-screen bg-page text-ink">
      <section className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-5 sm:px-6 lg:px-8">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-coast-sage/70 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-poly-green text-stadium-gold">
              <GraduationCap aria-hidden="true" size={24} />
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-gold-deep">
                HelpQ
              </p>
              <h1 className="text-xl font-semibold sm:text-2xl">
                Join the office-hours queue
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-coast-sage bg-sage-soft px-3 py-2 text-sm font-medium text-poly-green">
            <span className="h-2.5 w-2.5 rounded-full bg-poly-green" />
            Queue open
          </div>
        </header>

        <div className="grid flex-1 items-center gap-6 py-6 lg:grid-cols-[minmax(0,1fr)_380px]">
          <section className="rounded-lg border border-coast-sage/50 bg-panel p-5 shadow-soft sm:p-7 lg:p-8">
            <div className="mb-6 max-w-2xl">
              <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-gold-deep">
                Student check-in
              </p>
              <h2 className="text-2xl font-semibold sm:text-3xl">
                Submit a question for help
              </h2>
              <p className="mt-3 max-w-xl text-base leading-7 text-seal">
                Add your session code, name, and a clear question. HelpQ keeps
                your place in line and gives the host enough context before
                they call you.
              </p>
            </div>

            {submittedEntry ? (
              <Confirmation entry={submittedEntry} onReset={resetForm} />
            ) : (
              <form className="grid gap-5" noValidate onSubmit={handleSubmit}>
                <div className="grid gap-5 md:grid-cols-2">
                  <Field
                    error={errors.studentName}
                    icon={<UserRound aria-hidden="true" size={18} />}
                    id="studentName"
                    label="Your name"
                  >
                    <input
                      className={inputClass(errors.studentName)}
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
                    error={errors.sessionCode}
                    icon={<Hash aria-hidden="true" size={18} />}
                    id="sessionCode"
                    label="Session code"
                  >
                    <input
                      className={inputClass(errors.sessionCode)}
                      id="sessionCode"
                      name="sessionCode"
                      onChange={(event) =>
                        updateField("sessionCode", event.target.value.toUpperCase())
                      }
                      placeholder="CS307"
                      type="text"
                      value={form.sessionCode}
                    />
                  </Field>
                </div>

                <Field
                  error={errors.question}
                  helper={`${questionLength}/140 characters`}
                  icon={<HelpCircle aria-hidden="true" size={18} />}
                  id="question"
                  label="Question summary"
                >
                  <input
                    className={inputClass(errors.question)}
                    id="question"
                    maxLength={140}
                    name="question"
                    onChange={(event) => updateField("question", event.target.value)}
                    placeholder="I need help debugging my React form validation"
                    type="text"
                    value={form.question}
                  />
                </Field>

                <Field
                  helper="Optional, but useful if you already know what you tried."
                  icon={<MessageSquareText aria-hidden="true" size={18} />}
                  id="details"
                  label="Extra details"
                >
                  <textarea
                    className="min-h-32 w-full resize-y rounded-lg border border-coast-sage bg-white px-4 py-3 text-base text-ink transition placeholder:text-seal/60 focus:border-mustang-gold"
                    id="details"
                    name="details"
                    onChange={(event) => updateField("details", event.target.value)}
                    placeholder="Example: I checked the console and the state updates, but the error message does not clear."
                    value={form.details}
                  />
                </Field>

                <div className="flex justify-end border-t border-coast-sage/60 pt-5">
                  <button
                    className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-poly-green px-5 py-3 text-base font-semibold text-white transition hover:bg-[#0f3527] disabled:cursor-not-allowed disabled:bg-coast-sage disabled:text-poly-green"
                    disabled={isSubmitting}
                    type="submit"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2
                          aria-hidden="true"
                          className="animate-spin"
                          size={18}
                        />
                        Submitting
                      </>
                    ) : (
                      <>
                        Submit question
                        <ArrowRight aria-hidden="true" size={18} />
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </section>

          <aside className="grid gap-4">
            <section className="rounded-lg bg-poly-green p-5 text-white shadow-soft">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-coast-sage">
                    CSC 307 Office Hours
                  </p>
                  <h2 className="mt-1 text-2xl font-semibold">Today, 2-4 PM</h2>
                </div>
                <div className="rounded-lg bg-stadium-gold/20 px-3 py-2 text-center">
                  <p className="text-xs uppercase tracking-wide text-stadium-gold">
                    Code
                  </p>
                  <p className="font-semibold">CS307</p>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-3">
                <Metric label="Waiting" value={submittedEntry ? "4" : "3"} />
                <Metric label="Est. wait" value={waitEstimate} />
              </div>
            </section>

            <section className="rounded-lg border border-coast-sage/50 bg-panel p-5 shadow-soft">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold">Queue preview</h2>
                <Clock3 className="text-gold-deep" aria-hidden="true" size={20} />
              </div>
              <ol className="grid gap-3">
                {sampleQueue.map((entry, index) => (
                  <li
                    className="flex items-center gap-3 rounded-lg border border-coast-sage/60 bg-sky-soft p-3"
                    key={entry.name}
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-poly-green text-sm font-semibold text-stadium-gold">
                      {index + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{entry.name}</p>
                      <p className="truncate text-sm text-seal">
                        {entry.topic}
                      </p>
                    </div>
                    <span className="rounded-full bg-green-soft px-2.5 py-1 text-xs font-medium capitalize text-poly-green">
                      {entry.status}
                    </span>
                  </li>
                ))}

                {submittedEntry ? (
                  <li className="flex items-center gap-3 rounded-lg border border-mustang-gold bg-gold-soft p-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-mustang-gold text-sm font-semibold text-white">
                      {submittedEntry.position}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">
                        {submittedEntry.studentName}
                      </p>
                      <p className="truncate text-sm text-seal">
                        {submittedEntry.question}
                      </p>
                    </div>
                    <span className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-gold-deep">
                      you
                    </span>
                  </li>
                ) : null}
              </ol>
            </section>
          </aside>
        </div>
      </section>
    </main>
  );
}

function Field({ children, error, helper, icon, id, label }) {
  return (
    <div className="grid gap-2">
      <label className="flex items-center gap-2 font-semibold" htmlFor={id}>
        <span className="text-gold-deep">{icon}</span>
        {label}
      </label>
      {children}
      <div className="min-h-5">
        {error ? (
          <p className="text-sm font-medium text-red-600">{error}</p>
        ) : helper ? (
          <p className="text-sm text-seal">{helper}</p>
        ) : null}
      </div>
    </div>
  );
}

function Confirmation({ entry, onReset }) {
  return (
    <div className="rounded-lg border border-coast-sage bg-green-soft p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <CheckCircle2
          aria-hidden="true"
          className="shrink-0 text-poly-green"
          size={34}
        />
        <div className="flex-1">
          <p className="text-sm font-semibold uppercase tracking-wide text-gold-deep">
            Added to queue
          </p>
          <h3 className="mt-1 text-2xl font-semibold">
            You are number {entry.position}
          </h3>
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="font-semibold text-poly-green">Name</dt>
              <dd className="mt-1 text-seal">{entry.studentName}</dd>
            </div>
            <div>
              <dt className="font-semibold text-poly-green">Submitted</dt>
              <dd className="mt-1 text-seal">{entry.submittedAt}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="font-semibold text-poly-green">Question</dt>
              <dd className="mt-1 text-seal">{entry.question}</dd>
            </div>
          </dl>
          <button
            className="mt-5 inline-flex min-h-11 items-center justify-center rounded-lg border border-poly-green px-4 py-2 font-semibold text-poly-green transition hover:bg-sage-soft"
            onClick={onReset}
            type="button"
          >
            Submit another question
          </button>
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value }) {
  return (
    <div className="rounded-lg bg-white/10 p-4">
      <p className="text-sm text-coast-sage">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </div>
  );
}

function inputClass(hasError) {
  const base =
    "min-h-12 w-full rounded-lg border bg-white px-4 text-base text-ink transition placeholder:text-seal/60 focus:border-mustang-gold";

  return hasError
    ? `${base} border-red-400`
    : `${base} border-coast-sage`;
}

export default App;
