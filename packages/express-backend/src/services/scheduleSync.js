import {
  buildScheduleOccurrenceKey,
  getScheduleNow,
  isSlotActiveNow
} from "../utils/scheduleClock.js";
import {
  createSession,
  getActiveSessionForScheduleSlot,
  getClassIdsWithSchedulesForHost,
  getOfficeHoursSchedulesForClass,
  getSessionByOccurrenceKey,
  listActiveScheduledSessionsForClass,
  updateSessionStatus
} from "./db.js";

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
        // Never reopen or duplicate after host manual end or sync close.
        if (!activeSession && !existingOccurrence) {
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
        await updateSessionStatus(activeSession.id, "closed");
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
      await updateSessionStatus(session.id, "closed");
    }
  }
}

export async function syncScheduledSessionsForHost(hostId) {
  const classIds = await getClassIdsWithSchedulesForHost(hostId);
  await Promise.all(
    classIds.map((classId) => syncScheduledSessionsForClass(classId))
  );
}
