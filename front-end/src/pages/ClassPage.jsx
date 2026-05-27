import { useCallback, useEffect, useMemo, useState } from "react";
import { Navigate, useParams } from "react-router-dom";
import BackLink from "../components/BackLink.jsx";
import DashboardLayout from "../components/DashboardLayout.jsx";
import InstructorClassView from "../components/class/InstructorClassView.jsx";
import StudentClassView from "../components/class/StudentClassView.jsx";
import {
  deleteScheduleSlot,
  getClassRoster,
  getOfficeHoursSchedules
} from "../api.js";
import { useApp } from "../context/useApp.js";

export default function ClassPage() {
  const { classId } = useParams();
  const { getClassById, sessions, isInstructor, refreshSessions } = useApp();
  const [copied, setCopied] = useState(false);
  const [roster, setRoster] = useState([]);
  const [rosterLoading, setRosterLoading] = useState(false);
  const [rosterError, setRosterError] = useState("");
  const [schedules, setSchedules] = useState([]);
  const [schedulesLoading, setSchedulesLoading] = useState(false);
  const [schedulesError, setSchedulesError] = useState("");

  const course = getClassById(classId);
  const liveSessions = useMemo(
    () => sessions.filter((s) => s.classId === classId && s.status === "live"),
    [sessions, classId]
  );

  useEffect(() => {
    if (!classId || !isInstructor) return undefined;

    const controller = new AbortController();
    setRosterLoading(true);
    setRosterError("");

    getClassRoster(classId, { signal: controller.signal })
      .then((members) => setRoster(members))
      .catch((err) => {
        if (err.name === "AbortError") return;
        setRoster([]);
        setRosterError(err.message || "Could not load roster.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setRosterLoading(false);
      });

    return () => controller.abort();
  }, [classId, isInstructor]);

  const loadSchedules = useCallback(() => {
    if (!classId) return Promise.resolve();

    setSchedulesLoading(true);
    setSchedulesError("");

    return getOfficeHoursSchedules(classId)
      .then((rows) => {
        setSchedules(rows);
        return refreshSessions();
      })
      .catch((err) => {
        setSchedules([]);
        setSchedulesError(err.message || "Could not load weekly schedule.");
      })
      .finally(() => setSchedulesLoading(false));
  }, [classId, refreshSessions]);

  useEffect(() => {
    loadSchedules();
  }, [loadSchedules]);

  const handleDeleteScheduleSlot = useCallback(
    async (slotId) => {
      await deleteScheduleSlot(classId, slotId);
      await loadSchedules();
    },
    [classId, loadSchedules]
  );

  if (!course) {
    return <Navigate replace to="/" />;
  }

  function copyJoinCode() {
    navigator.clipboard?.writeText(course.joinCode);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  return (
    <DashboardLayout>
      <div className="standalone-page class-page">
        <BackLink />

        {isInstructor ? (
          <InstructorClassView
            classId={classId}
            copied={copied}
            course={course}
            liveSessions={liveSessions}
            onCopyJoinCode={copyJoinCode}
            roster={roster}
            rosterError={rosterError}
            rosterLoading={rosterLoading}
            schedules={schedules}
            schedulesError={schedulesError}
            schedulesLoading={schedulesLoading}
            onDeleteScheduleSlot={handleDeleteScheduleSlot}
          />
        ) : (
          <StudentClassView
            classId={classId}
            course={course}
            liveSessions={liveSessions}
            schedules={schedules}
            schedulesError={schedulesError}
            schedulesLoading={schedulesLoading}
          />
        )}
      </div>
    </DashboardLayout>
  );
}
