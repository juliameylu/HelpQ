import { useState } from "react";
import { Link } from "react-router-dom";
import {
  BarChart3,
  BookOpen,
  Calendar,
  Clock3,
  Copy,
  LayoutGrid,
  Megaphone,
  Plus,
  Settings,
  Users,
  UsersRound
} from "lucide-react";
import { CLASS_ANNOUNCEMENTS } from "../../data/mockData.js";
import WeeklyCalendarView from "./WeeklyCalendarView.jsx";

function rosterInitials(fullName, email) {
  const source = (fullName || email || "?").trim();
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  return source.slice(0, 2).toUpperCase();
}

function formatEnrolledDate(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}

function roleLabel(role) {
  if (role === "professor") return "Instructor";
  if (role === "student") return "Student";
  return role || "Member";
}

const INSTRUCTOR_TABS = [
  { id: "overview", label: "Overview", icon: LayoutGrid },
  { id: "sessions", label: "Sessions", icon: Calendar },
  { id: "roster", label: "Roster", icon: UsersRound },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
  { id: "settings", label: "Settings", icon: Settings }
];

export default function InstructorClassView({
  course,
  classId,
  liveSessions,
  copied,
  onCopyJoinCode,
  roster = [],
  rosterLoading = false,
  rosterError = "",
  schedules = [],
  schedulesLoading = false,
  schedulesError = "",
  onDeleteScheduleSlot
}) {
  const [tab, setTab] = useState("overview");
  const announcements = CLASS_ANNOUNCEMENTS[classId] ?? [];
  const students = roster.filter((member) => member.role === "student");
  const instructors = roster.filter((member) => member.role === "professor");
  const studentCount = students.length;
  const totalRequests = liveSessions.reduce(
    (sum, s) => sum + (s.queueCount ?? 0),
    0
  );

  return (
    <>
      <article className="card card-hero card-hero-instructor">
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
              {liveSessions.length} Live Session
              {liveSessions.length > 1 ? "s" : ""}
            </span>
          ) : null}
        </div>

        <div className="card-hero-meta card-hero-meta-instructor">
          <div className="join-code-pill">
            <span>Join Code:</span>
            <strong>{course.joinCode}</strong>
            <button
              className="icon-btn"
              type="button"
              aria-label="Copy join code"
              onClick={onCopyJoinCode}>
              <Copy size={16} />
            </button>
            {copied ? <span className="copy-ok">Copied</span> : null}
          </div>
          <span className="card-meta">
            <Users size={16} aria-hidden="true" />
            {studentCount} Student{studentCount === 1 ? "" : "s"}
          </span>
          <span className="card-meta">
            <Calendar size={16} aria-hidden="true" />
            {liveSessions.length} Live session
            {liveSessions.length === 1 ? "" : "s"}
          </span>
          <Link
            className="btn btn-gold btn-compact"
            to={`/classes/${classId}/sessions/new`}>
            <Plus size={16} aria-hidden="true" />
            Create Office Hours
          </Link>
        </div>
      </article>

      <article className="card card-tabs card-tabs-instructor">
        <div className="tab-bar tab-bar-icons" role="tablist">
          {INSTRUCTOR_TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              className={`tab-btn${tab === id ? " active" : ""}`}
              onClick={() => setTab(id)}
              role="tab"
              type="button"
              aria-selected={tab === id}>
              <Icon aria-hidden="true" size={20} />
              {label}
            </button>
          ))}
        </div>

        <div className="tab-panel">
          {tab === "overview" ? (
            <>
              <section className="instructor-section">
                <h2>Quick Stats</h2>
                <div className="quick-stats-grid">
                  <div className="quick-stat-card">
                    <Users aria-hidden="true" size={24} />
                    <strong>{studentCount}</strong>
                    <span>Enrolled Students</span>
                  </div>
                  <div className="quick-stat-card">
                    <Calendar aria-hidden="true" size={24} />
                    <strong>{liveSessions.length}</strong>
                    <span>Live Sessions</span>
                  </div>
                  <div className="quick-stat-card">
                    <Clock3 aria-hidden="true" size={24} />
                    <strong>{totalRequests || liveSessions.length}</strong>
                    <span>Total Requests</span>
                  </div>
                </div>
              </section>

              <section className="instructor-section">
                <h2>Live Sessions</h2>
                {liveSessions.length === 0 ? (
                  <p className="field-message">
                    No live sessions. Create office hours to open a queue.
                  </p>
                ) : (
                  <ul className="instructor-live-list">
                    {liveSessions.map((session) => (
                      <li className="instructor-live-row" key={session.id}>
                        <div>
                          <div className="instructor-live-title">
                            <h3>{session.title}</h3>
                            <span className="badge badge-live">
                              <span className="badge-dot" aria-hidden="true" />
                              Live
                            </span>
                          </div>
                          <p className="card-description">
                            {session.queueCount ?? 0} student
                            {(session.queueCount ?? 0) === 1 ? "" : "s"} waiting
                          </p>
                        </div>
                        {session.sessionCode ? (
                          <Link
                            className="btn btn-gold btn-compact"
                            to={`/sessions/${session.sessionCode}/manage`}>
                            Manage Queue
                          </Link>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section className="instructor-section">
                <div className="instructor-section-heading">
                  <h2>Recent Announcements</h2>
                  <button
                    className="btn btn-secondary btn-compact"
                    type="button">
                    <Megaphone size={16} aria-hidden="true" />
                    New Announcement
                  </button>
                </div>
                {announcements.length === 0 ? (
                  <p className="field-message">No announcements posted yet.</p>
                ) : (
                  <ul className="instructor-announcement-list">
                    {announcements.map((item) => (
                      <li
                        className="instructor-announcement-item"
                        key={item.id}>
                        <div className="instructor-announcement-header">
                          <h3>{item.title}</h3>
                          <span className="class-announcement-time">
                            {item.time}
                          </span>
                        </div>
                        <p>{item.body}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </>
          ) : null}

          {tab === "sessions" ? (
            <>
              <section className="instructor-section instructor-section-flush">
                <h2>Weekly schedule</h2>
                <WeeklyCalendarView
                  canDelete
                  emptyMessage="No recurring schedule yet. Use Create Office Hours to add weekly times."
                  error={schedulesError}
                  loading={schedulesLoading}
                  onDeleteSlot={onDeleteScheduleSlot}
                  schedules={schedules}
                />
              </section>

              <section className="instructor-section">
                <h2>Live sessions</h2>
                {liveSessions.length === 0 ? (
                  <p className="field-message">
                    No live queue open. Start a session from Create Office Hours
                    when you are ready to take students.
                  </p>
                ) : (
                <ul className="session-list">
                  {liveSessions.map((session) => (
                    <li className="session-list-item" key={session.id}>
                      <div>
                        <div className="session-list-title">
                          <h3>{session.title}</h3>
                          <span className="badge badge-live">
                            <span className="badge-dot" aria-hidden="true" />
                            Live Now
                          </span>
                        </div>
                        <p className="card-description">
                          {session.description}
                        </p>
                      </div>
                      <div className="session-list-actions">
                        {session.sessionCode ? (
                          <Link
                            className="btn btn-gold btn-compact"
                            to={`/sessions/${session.sessionCode}/manage`}>
                            Manage Queue
                          </Link>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ul>
                )}
              </section>
            </>
          ) : null}

          {tab === "roster" ? (
            <section className="instructor-section instructor-section-flush">
              <h2>Class Roster</h2>
              {rosterLoading ? (
                <p className="field-message">Loading roster…</p>
              ) : rosterError ? (
                <p className="field-message error">{rosterError}</p>
              ) : roster.length === 0 ? (
                <p className="field-message">
                  No one is enrolled yet. Share join code{" "}
                  <strong>{course.joinCode}</strong> so students can join.
                </p>
              ) : (
                <>
                  {instructors.length > 0 ? (
                    <>
                      <h3 className="roster-group-title">Instructors</h3>
                      <ul className="roster-list">
                        {instructors.map((member) => (
                          <li className="roster-list-item" key={member.userId}>
                            <span
                              className="roster-avatar"
                              aria-hidden="true">
                              {rosterInitials(member.fullName, member.email)}
                            </span>
                            <div className="roster-list-body">
                              <div className="roster-list-heading">
                                <strong>
                                  {member.fullName || member.email}
                                </strong>
                                <span className="badge badge-instructor">
                                  {roleLabel(member.role)}
                                </span>
                              </div>
                              <p className="card-description">{member.email}</p>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </>
                  ) : null}

                  <h3 className="roster-group-title">
                    Students ({studentCount})
                  </h3>
                  {students.length === 0 ? (
                    <p className="field-message">
                      No students enrolled yet. Students join with code{" "}
                      <strong>{course.joinCode}</strong>.
                    </p>
                  ) : (
                    <ul className="roster-list">
                      {students.map((member) => (
                        <li className="roster-list-item" key={member.userId}>
                          <span className="roster-avatar" aria-hidden="true">
                            {rosterInitials(member.fullName, member.email)}
                          </span>
                          <div className="roster-list-body">
                            <div className="roster-list-heading">
                              <strong>
                                {member.fullName || member.email}
                              </strong>
                              <span className="badge badge-student">
                                Student
                              </span>
                            </div>
                            <p className="card-description">{member.email}</p>
                            {member.enrolledAt ? (
                              <p className="roster-enrolled">
                                Joined {formatEnrolledDate(member.enrolledAt)}
                              </p>
                            ) : null}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              )}
            </section>
          ) : null}

          {tab !== "overview" &&
          tab !== "sessions" &&
          tab !== "roster" ? (
            <p className="field-message">
              <BookOpen aria-hidden="true" size={18} />{" "}
              {tab.charAt(0).toUpperCase() + tab.slice(1)} is coming soon in
              this prototype.
            </p>
          ) : null}
        </div>
      </article>
    </>
  );
}
