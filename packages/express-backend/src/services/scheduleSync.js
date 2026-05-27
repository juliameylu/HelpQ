import {
  buildScheduleOccurrenceKey,
  getScheduleNow,
  isSlotActiveNow
} from "../utils/scheduleClock.js";
import {
  closeSessionByHost,
  createSession,
  getActiveSessionForScheduleSlot,
  getClassIdsWithSchedulesForHost,
  getOfficeHoursSchedulesForClass,
  getSessionByOccurrenceKey,
  listActiveScheduledSessionsForClass
} from "./db.js";

function wasHostEnded(session) {
  if (!session) return false;
  // host_ended_at is set when the host manually closes a scheduled session
  if (session.host_ended_at) return true;
  // fallback for sessions closed before the column existed:
  // a closed session that already carries an occurrence key was host-ended
  return session.status === "closed" && Boolean(session.schedule_occurrence_key);
}

export async function syncScheduledSessionsForClass(classId) {
  const schedules = await getOfficeHoursSchedulesForClass(classId);
  if (!schedules.length) return;

  const clock = getScheduleNow();

  for (const schedule of schedules) {
    const hostId = schedule.host_id ?? schedule.created_by;
    if (!hostId) continue;

    for (const slot of schedule.slots || []) {
      const occurrenceKey = buildScheduleOccurrenceKey(slot.id, clock.dateKey);
      const inWindow = isSlotActiveNow(slot, clock);
      const activeSession = await getActiveSessionForScheduleSlot(slot.id);
      const existingOccurrence = await getSessionByOccurrenceKey(occurrenceKey);

      if (inWindow) {
        // Auto-start only when no session exists yet for this slot/day.
        // If the host already ended today's occurrence, leave it closed.
        if (!activeSession && !wasHostEnded(existingOccurrence)) {
          await createSession(
            hostId,
            schedule.title || "Office Hours",
            schedule.description || "",
            classId,
            {
              scheduleSlotId: slot.id,
              scheduleOccurrenceKey: occurrenceKey
            }
          );
        }
        continue;
      }

      if (activeSession) {
        const occurrenceKey =
          activeSession.schedule_occurrence_key ||
          buildScheduleOccurrenceKey(slot.id, clock.dateKey);
        await closeSessionByHost(activeSession.id, { occurrenceKey });
      }
    }
  }

  const activeScheduled = await listActiveScheduledSessionsForClass(classId);
  for (const session of activeScheduled) {
    if (!session.schedule_slot_id) continue;

    const slot = schedules
      .flatMap((schedule) => schedule.slots || [])
      .find((row) => row.id === session.schedule_slot_id);

    if (!slot || !isSlotActiveNow(slot, clock)) {
      const occurrenceKey =
        session.schedule_occurrence_key ||
        buildScheduleOccurrenceKey(session.schedule_slot_id, clock.dateKey);
      await closeSessionByHost(session.id, { occurrenceKey });
    }
  }
}

export async function syncScheduledSessionsForHost(hostId) {
  const classIds = await getClassIdsWithSchedulesForHost(hostId);
  await Promise.all(
    classIds.map((classId) => syncScheduledSessionsForClass(classId))
  );
}
