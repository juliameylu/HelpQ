import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Clock3, Plus, UserRound } from "lucide-react";
import DashboardLayout from "../components/DashboardLayout.jsx";
import { useApp } from "../context/useApp.js";
import {
  loadQueueSession,
  queueSessionPath
} from "../lib/queueSessionStorage.js";

function joinQueuePath(sessionCode) {
  const code = sessionCode?.trim();
  return code ? `/join?code=${encodeURIComponent(code)}` : "/join";
}

export default function HomePage() {
  const {
    user,
    isInstructor,
    liveSessions,
    enrolledClasses,
    classesLoading,
    classesError,
    sessionsHydrated,
    sessionsError,
    endLiveSession
  } = useApp();
  const [endingId, setEndingId] = useState(null);
  const [endError, setEndError] = useState("");
  const [activeQueue, setActiveQueue] = useState(null);
  const displayName =
    user?.name
      ?.normalize("NFKC")
      .trim()
      .split(/\s+/)[0]
      ?.replace(/[^A-Za-z0-9'-]/g, "") || "there";

  useEffect(() => {
    function refreshActiveQueue() {
      setActiveQueue(loadQueueSession());
    }
    refreshActiveQueue();
    window.addEventListener("storage", refreshActiveQueue);
    window.addEventListener("focus", refreshActiveQueue);
    return () => {
      window.removeEventListener("storage", refreshActiveQueue);
      window.removeEventListener("focus", refreshActiveQueue);
    };
  }, []);

  async function handleEndSession(session) {
    const confirmed = window.confirm(
      "End this live session? Students will no longer be able to join the queue."
    );
    if (!confirmed) return;

    setEndError("");
    setEndingId(session.id);
    try {
      await endLiveSession(session.id);
    } catch (err) {
      setEndError(err.message || "Could not end session.");
    } finally {
      setEndingId(null);
    }
  }

  return (
    <DashboardLayout>
      <div className="home-page">
        <header className="home-header">
          <h1 className="home-title">Welcome back, {displayName}!</h1>
          <p className="home-subtitle">
            Here&apos;s what&apos;s happening with your classes today
          </p>
        </header>

        {!isInstructor && activeQueue ? (
          <div className="card queue-resume-banner" role="status">
            <p className="queue-resume-banner-title">
              You&apos;re still in an office hours queue
            </p>
            <p className="card-description">
              Session{" "}
              <strong className="mono">{activeQueue.sessionCode}</strong>
              {activeQueue.position
                ? ` · position ${activeQueue.position}`
                : ""}
              . Return to see your live status — no need to join again.
            </p>
            <Link
              className="btn btn-gold btn-compact"
              to={queueSessionPath(activeQueue.sessionCode)}>
              Return to my queue
            </Link>
          </div>
        ) : null}

        <section className="home-section" aria-labelledby="live-oh-title">
          <div className="home-section-heading">
            <div className="home-section-title-row">
              <h2 className="home-section-title" id="live-oh-title">
                Live Office Hours
              </h2>
              {liveSessions.length > 0 ? (
                <span className="badge badge-active-pill">
                  <span className="badge-dot" aria-hidden="true" />
                  {liveSessions.length} Active
                </span>
              ) : null}
            </div>
            {isInstructor ? (
              <Link className="btn btn-gold btn-compact" to="/sessions/new">
                <Plus aria-hidden="true" size={16} />
                Quick start
              </Link>
            ) : null}
          </div>

          {sessionsError ? (
            <p className="field-message error" role="alert">
              {sessionsError}
            </p>
          ) : null}
          {endError ? (
            <p className="field-message error" role="alert">
              {endError}
            </p>
          ) : null}
          {!sessionsHydrated ? (
            <p className="field-message">Loading sessions…</p>
          ) : liveSessions.length === 0 ? (
            <p className="field-message home-empty-message">
              No live office hours right now.
            </p>
          ) : (
            <div className="live-oh-grid">
              {liveSessions.map((session) => {
                const hosting =
                  isInstructor &&
                  (!session.hostId ||
                    String(session.hostId) === String(user?.id));

                return (
                  <article className="card card-office-hour" key={session.id}>
                    <div className="card-office-hour-top">
                      <div>
                        <h3>{session.title}</h3>
                        <p className="card-course-code">{session.courseCode}</p>
                      </div>
                      <span className="badge badge-live">
                        <span className="badge-dot" aria-hidden="true" />
                        Live
                      </span>
                    </div>

                    <div className="card-meta-row">
                      <span className="card-meta">
                        <UserRound aria-hidden="true" size={16} />
                        {session.instructor}
                      </span>
                      <span className="card-meta">
                        <Clock3 aria-hidden="true" size={16} />
                        {session.queueCount ?? 0} in queue
                      </span>
                    </div>

                    <p className="card-description">{session.description}</p>

                    {hosting ? (
                      <div className="card-office-hour-actions">
                        {session.sessionCode ? (
                          <Link
                            className="btn btn-gold btn-block"
                            to={`/sessions/${session.sessionCode}/manage`}>
                            Manage Queue
                          </Link>
                        ) : null}
                        <button
                          className="btn btn-secondary btn-block"
                          disabled={endingId === session.id}
                          onClick={() => handleEndSession(session)}
                          type="button">
                          {endingId === session.id
                            ? "Ending session…"
                            : "End session"}
                        </button>
                      </div>
                    ) : (
                      <Link
                        className="btn btn-gold btn-block"
                        to={joinQueuePath(session.sessionCode)}>
                        Join Queue
                      </Link>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <section className="home-section" aria-labelledby="my-classes-title">
          <div className="home-section-heading">
            <h2 className="home-section-title" id="my-classes-title">
              My Classes
            </h2>
            <div className="page-header-actions">
              {isInstructor ? (
                <Link
                  className="btn btn-secondary btn-compact"
                  to="/classes/new">
                  Create class
                </Link>
              ) : null}
              <Link className="btn btn-gold btn-compact" to="/join-class">
                <Plus aria-hidden="true" size={16} />
                Join Class
              </Link>
            </div>
          </div>

          {classesError && enrolledClasses.length > 0 ? (
            <p className="field-message error" role="alert">
              {classesError}
            </p>
          ) : null}
          {classesLoading ? (
            <p className="field-message">Loading classes…</p>
          ) : null}
          {!classesLoading && enrolledClasses.length === 0 ? (
            <p className="field-message">
              {isInstructor
                ? "No classes yet. Create one or join with a class code."
                : "No classes yet. Join a class with a code from your instructor."}
            </p>
          ) : null}

          <div className="class-card-grid">
            {enrolledClasses.map((course) => (
              <article className="card card-class" key={course.id}>
                <div className="card-class-heading">
                  <h3>{course.title}</h3>
                  <p className="card-course-code">{course.code}</p>
                </div>

                <div className="card-class-meta">
                  <span className="card-meta">
                    <UserRound aria-hidden="true" size={16} />
                    {course.instructor}
                  </span>
                  {course.liveHours > 0 ? (
                    <span className="card-meta card-meta-live">
                      <span className="badge-dot" aria-hidden="true" />
                      {course.liveHours} live office hour
                      {course.liveHours > 1 ? "s" : ""}
                    </span>
                  ) : null}
                </div>

                <Link
                  className="card-class-footer"
                  to={`/classes/${course.id}`}>
                  View Class →
                </Link>
              </article>
            ))}
          </div>
        </section>
      </div>
    </DashboardLayout>
  );
}
