import { Link } from "react-router-dom";
import {
  Bell,
  Calendar,
  Clock3,
  FileText,
  UserRound,
  Users
} from "lucide-react";
import {
  CLASS_ANNOUNCEMENTS,
  CLASS_ENROLLMENT_DATES,
  CLASS_RESOURCES
} from "../../data/mockData.js";
import WeeklyCalendarView from "./WeeklyCalendarView.jsx";
import {
  loadQueueSession,
  queueSessionPath
} from "../../lib/queueSessionStorage.js";

function joinQueuePath(sessionCode) {
  const code = sessionCode?.trim();
  return code ? `/join?code=${encodeURIComponent(code)}` : "/join";
}

export default function StudentClassView({
  course,
  classId,
  liveSessions,
  schedules = [],
  schedulesLoading = false,
  schedulesError = ""
}) {
  const joinedDate = CLASS_ENROLLMENT_DATES[classId] ?? "—";
  const announcements = CLASS_ANNOUNCEMENTS[classId] ?? [];
  const savedQueue = loadQueueSession();

  return (
    <>
      <article className="card card-hero">
        <div className="card-hero-top">
          <div>
            <h1 className="gradient-title">{course.title}</h1>
            <p className="card-course-code card-course-code-lg">
              {course.code}
            </p>
            <p className="card-description">{course.description}</p>
          </div>
          {liveSessions.length > 0 ? (
            <span className="badge badge-active-pill">
              <span className="badge-dot" aria-hidden="true" />
              {liveSessions.length} Live
            </span>
          ) : null}
        </div>

        <div className="card-hero-meta card-hero-meta-student">
          <span className="card-meta">
            <UserRound size={16} aria-hidden="true" />
            Instructor: {course.instructor}
          </span>
          <span className="card-meta">
            <Calendar size={16} aria-hidden="true" />
            Joined {joinedDate}
          </span>
        </div>
      </article>

      <div className="class-page-grid">
        <section
          className="class-page-main"
          aria-labelledby="student-weekly-oh">
          <h2 id="student-weekly-oh">Weekly Office Hours</h2>
          <WeeklyCalendarView
            emptyMessage="Your instructor has not posted a weekly schedule yet."
            error={schedulesError}
            loading={schedulesLoading}
            schedules={schedules}
          />
        </section>

        <section className="class-page-main" aria-labelledby="student-live-oh">
          <h2 id="student-live-oh">Live Office Hours</h2>
          {liveSessions.length === 0 ? (
            <p className="field-message">No live office hours right now.</p>
          ) : (
            <div className="class-session-stack">
              {liveSessions.map((session) => (
                <article className="card card-office-hour" key={session.id}>
                  <div className="card-office-hour-top">
                    <div>
                      <h3>{session.title}</h3>
                      <p className="card-course-code">{course.instructor}</p>
                    </div>
                    <span className="badge badge-live">
                      <span className="badge-dot" aria-hidden="true" />
                      Live Now
                    </span>
                  </div>

                  <div className="card-meta-row">
                    <span className="card-meta">
                      <Users size={16} aria-hidden="true" />
                      {session.queueCount ?? 0} in queue
                    </span>
                    <span className="card-meta">
                      <Clock3 size={16} aria-hidden="true" />~
                      {Math.max(5, (session.queueCount ?? 0) * 5)}min wait
                    </span>
                  </div>

                  <p className="card-description">{session.description}</p>

                  {savedQueue?.sessionCode === session.sessionCode ? (
                    <Link
                      className="btn btn-gold btn-block"
                      to={queueSessionPath(session.sessionCode)}>
                      Return to my queue
                    </Link>
                  ) : (
                    <Link
                      className="btn btn-gold btn-block"
                      to={joinQueuePath(session.sessionCode)}>
                      Join Queue
                    </Link>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>

        <aside className="class-page-sidebar">
          <article className="card class-sidebar-card">
            <h3>
              <FileText aria-hidden="true" size={20} />
              Resources
            </h3>
            <ul className="class-link-list">
              {CLASS_RESOURCES.map((item) => (
                <li key={item.id}>
                  <a className="class-resource-link" href="#">
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </article>

          <article className="card class-sidebar-card">
            <h3>
              <Bell aria-hidden="true" size={20} />
              Announcements
            </h3>
            {announcements.length === 0 ? (
              <p className="field-message">No announcements yet.</p>
            ) : (
              <ul className="class-announcement-list">
                {announcements.map((item) => (
                  <li className="class-announcement-item" key={item.id}>
                    <p className="class-announcement-title">{item.title}</p>
                    <span className="class-announcement-time">{item.time}</span>
                  </li>
                ))}
              </ul>
            )}
          </article>
        </aside>
      </div>
    </>
  );
}
