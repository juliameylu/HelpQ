import express from "express";
import * as db from "../services/db.js";
import { syncScheduledSessionsForClass } from "../services/scheduleSync.js";
import {
  buildScheduleOccurrenceKey,
  getScheduleNow,
  isSlotActiveNow
} from "../utils/scheduleClock.js";
import {
  requireAuth,
  requireProfessor,
  requireStudent
} from "../middleware/auth.js";
import {
  QUEUE_ENTRY_STATUSES,
  SESSION_STATUSES
} from "../constants/statuses.js";
import {
  getTrimmedString,
  validateRequiredTrimmedString,
  validateUuid,
  validationError
} from "../utils/validation.js";
import {
  badRequestError,
  forbiddenError,
  internalServerError,
  notFoundError
} from "../utils/errors.js";

const router = express.Router();

const ownsHostId = (req, hostId = req.params.hostId) =>
  String(hostId) === req.user.id;

function generateJoinCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// CLASSES

router.get("/me/classes", requireAuth, async (req, res) => {
  try {
    const [created, enrolled] = await Promise.all([
      db.getClassesCreatedBy(req.user.id),
      db.getClassesForUser(req.user.id)
    ]);

    const seen = new Set();
    const combined = [...created, ...enrolled].filter((row) => {
      if (!row?.id) return false;
      if (seen.has(row.id)) return false;
      seen.add(row.id);
      return true;
    });

    return res.json(combined);
  } catch (error) {
    console.error("Error listing classes:", error);
    return internalServerError(res, "Failed to list classes");
  }
});

router.post("/classes", requireAuth, requireProfessor, async (req, res) => {
  try {
    const { title, code, description, joinCode } = req.body;
    const details = {};

    const titleError = validateRequiredTrimmedString(title, "title", {
      maxLength: 255
    });
    if (titleError) details.title = titleError;

    const codeError = validateRequiredTrimmedString(code, "code", {
      maxLength: 64
    });
    if (codeError) details.code = codeError;

    if (description !== undefined && typeof description !== "string") {
      details.description = "description must be a string";
    }

    if (joinCode !== undefined && typeof joinCode !== "string") {
      details.joinCode = "joinCode must be a string";
    }

    if (Object.keys(details).length > 0) {
      return validationError(res, details);
    }

    const normalizedJoinCode =
      getTrimmedString(joinCode)?.toUpperCase() || generateJoinCode();

    // Ensure join code uniqueness (retry a few times if we generated one).
    let finalJoinCode = normalizedJoinCode;
    if (!getTrimmedString(joinCode)) {
      for (let i = 0; i < 5; i += 1) {
        const existing = await db.getClassByJoinCode(finalJoinCode);
        if (!existing) break;
        finalJoinCode = generateJoinCode();
      }
    } else {
      const existing = await db.getClassByJoinCode(finalJoinCode);
      if (existing) {
        return validationError(res, { joinCode: "joinCode is already in use" });
      }
    }

    const createdClass = await db.createClass({
      title: getTrimmedString(title),
      code: getTrimmedString(code),
      description: getTrimmedString(description) || "",
      joinCode: finalJoinCode,
      createdBy: req.user.id
    });

    // Auto-enroll creator.
    try {
      await db.enrollUserInClass({
        classId: createdClass.id,
        userId: req.user.id
      });
    } catch (enrollError) {
      console.warn("Failed to auto-enroll class creator:", enrollError);
    }

    return res.status(201).json(createdClass);
  } catch (error) {
    console.error("Error creating class:", error);
    return internalServerError(res, "Failed to create class");
  }
});

router.post("/classes/join", requireAuth, requireStudent, async (req, res) => {
  try {
    const { joinCode } = req.body;
    const trimmed = getTrimmedString(joinCode)?.toUpperCase();

    if (!trimmed) {
      return validationError(res, { joinCode: "joinCode is required" });
    }

    const foundClass = await db.getClassByJoinCode(trimmed);
    if (!foundClass) {
      return notFoundError(res, "Class");
    }

    const already = await db.isUserEnrolledInClass({
      classId: foundClass.id,
      userId: req.user.id
    });
    if (!already) {
      await db.enrollUserInClass({
        classId: foundClass.id,
        userId: req.user.id
      });
    }

    return res.json(foundClass);
  } catch (error) {
    console.error("Error joining class:", error);
    return internalServerError(res, "Failed to join class");
  }
});

async function assertClassAccess(req, res, classId) {
  const classRow = await db.getClassById(classId);
  if (!classRow) {
    notFoundError(res, "Class");
    return null;
  }

  const profile = await db.getProfileById(req.user.id);
  if (!profile) {
    forbiddenError(res);
    return null;
  }

  if (profile.role === "professor") {
    if (classRow.created_by !== req.user.id) {
      forbiddenError(res);
      return null;
    }
  } else {
    const enrolled = await db.isUserEnrolledInClass({
      classId,
      userId: req.user.id
    });
    if (!enrolled) {
      forbiddenError(res);
      return null;
    }
  }

  return classRow;
}

router.get("/classes/:classId/sessions", requireAuth, async (req, res) => {
  try {
    const classIdError = validateUuid(req.params.classId, "classId");
    if (classIdError) return validationError(res, { classId: classIdError });

    const classRow = await assertClassAccess(req, res, req.params.classId);
    if (!classRow) return;

    try {
      await syncScheduledSessionsForClass(req.params.classId);
    } catch (syncError) {
      console.error("Schedule sync failed (class sessions):", syncError);
    }
    const sessions = await db.getSessionsByClassId(req.params.classId);
    return res.json(sessions);
  } catch (error) {
    console.error("Error listing class sessions:", error);
    return internalServerError(res, "Failed to list class sessions");
  }
});

router.get("/classes/:classId/roster", requireAuth, async (req, res) => {
  try {
    const classIdError = validateUuid(req.params.classId, "classId");
    if (classIdError) return validationError(res, { classId: classIdError });

    const classRow = await assertClassAccess(req, res, req.params.classId);
    if (!classRow) return;

    const roster = await db.getClassRoster(req.params.classId);
    return res.json(roster);
  } catch (error) {
    console.error("Error listing class roster:", error);
    return internalServerError(res, "Failed to list class roster");
  }
});

router.get(
  "/classes/:classId/schedules/sync-status",
  requireAuth,
  requireProfessor,
  async (req, res) => {
    try {
      const classIdError = validateUuid(req.params.classId, "classId");
      if (classIdError) return validationError(res, { classId: classIdError });

      const clock = getScheduleNow();
      const schedules = await db.getOfficeHoursSchedulesForClass(
        req.params.classId
      );
      const slots = schedules.flatMap((schedule) =>
        (schedule.slots || []).map((slot) => ({
          slotId: slot.id,
          dayOfWeek: slot.day_of_week,
          start: String(slot.start_time).slice(0, 5),
          end: String(slot.end_time).slice(0, 5),
          activeNow: isSlotActiveNow(slot, clock)
        }))
      );

      return res.json({
        timeZone: clock.timeZone,
        now: clock.timeLabel,
        dayOfWeek: clock.dayOfWeek,
        dateKey: clock.dateKey,
        slots
      });
    } catch (error) {
      console.error("Error reading schedule sync status:", error);
      return internalServerError(res, "Failed to read schedule sync status");
    }
  }
);

router.get("/classes/:classId/schedules", requireAuth, async (req, res) => {
  try {
    const classIdError = validateUuid(req.params.classId, "classId");
    if (classIdError) return validationError(res, { classId: classIdError });

    const classRow = await assertClassAccess(req, res, req.params.classId);
    if (!classRow) return;

    try {
      await syncScheduledSessionsForClass(req.params.classId);
    } catch (syncError) {
      console.error("Schedule sync failed (schedules):", syncError);
    }

    const schedules = await db.getOfficeHoursSchedulesForClass(
      req.params.classId
    );
    return res.json(schedules);
  } catch (error) {
    console.error("Error listing office hours schedules:", error);
    return internalServerError(res, "Failed to list office hours schedules");
  }
});

router.post(
  "/classes/:classId/schedules",
  requireAuth,
  requireProfessor,
  async (req, res) => {
    try {
      const classIdError = validateUuid(req.params.classId, "classId");
      if (classIdError) return validationError(res, { classId: classIdError });

      const classRow = await db.getClassById(req.params.classId);
      if (!classRow) return notFoundError(res, "Class");
      if (classRow.created_by !== req.user.id) {
        return forbiddenError(res);
      }

      const { title, description, slots } = req.body;
      const details = {};

      const titleError = validateRequiredTrimmedString(title, "title", {
        maxLength: 255
      });
      if (titleError) details.title = titleError;

      if (description !== undefined && typeof description !== "string") {
        details.description = "description must be a string";
      }

      if (!Array.isArray(slots) || slots.length === 0) {
        details.slots = "At least one weekly time slot is required";
      }

      const normalizedSlots = [];
      if (Array.isArray(slots)) {
        slots.forEach((slot, index) => {
          const day =
            typeof slot.dayOfWeek === "number"
              ? slot.dayOfWeek
              : Number(slot.day_of_week);
          const start = getTrimmedString(slot.startTime ?? slot.start_time);
          const end = getTrimmedString(slot.endTime ?? slot.end_time);

          if (!Number.isInteger(day) || day < 0 || day > 6) {
            details[`slots.${index}.dayOfWeek`] =
              "dayOfWeek must be 0 (Sunday) through 6 (Saturday)";
            return;
          }

          if (!start || !/^\d{2}:\d{2}$/.test(start)) {
            details[`slots.${index}.startTime`] =
              "startTime must be HH:MM (24-hour)";
            return;
          }

          if (!end || !/^\d{2}:\d{2}$/.test(end)) {
            details[`slots.${index}.endTime`] =
              "endTime must be HH:MM (24-hour)";
            return;
          }

          if (end <= start) {
            details[`slots.${index}.endTime`] =
              "endTime must be after startTime";
            return;
          }

          normalizedSlots.push({
            dayOfWeek: day,
            startTime: start,
            endTime: end
          });
        });
      }

      if (Object.keys(details).length > 0) {
        return validationError(res, details);
      }

      const schedule = await db.replaceOfficeHoursSchedule({
        classId: req.params.classId,
        hostId: req.user.id,
        title: getTrimmedString(title),
        description: getTrimmedString(description) || "",
        slots: normalizedSlots
      });

      return res.status(201).json(schedule);
    } catch (error) {
      console.error("Error creating office hours schedule:", error);
      return internalServerError(res, "Failed to create office hours schedule");
    }
  }
);

router.delete(
  "/classes/:classId/schedules/slots/:slotId",
  requireAuth,
  requireProfessor,
  async (req, res) => {
    try {
      const classIdError = validateUuid(req.params.classId, "classId");
      if (classIdError) return validationError(res, { classId: classIdError });

      const slotIdError = validateUuid(req.params.slotId, "slotId");
      if (slotIdError) return validationError(res, { slotId: slotIdError });

      const classRow = await db.getClassById(req.params.classId);
      if (!classRow) return notFoundError(res, "Class");
      if (classRow.created_by !== req.user.id) {
        return forbiddenError(res);
      }

      const result = await db.deleteScheduleSlot({
        classId: req.params.classId,
        slotId: req.params.slotId
      });

      if (!result) return notFoundError(res, "Schedule slot");

      return res.json({ success: true });
    } catch (error) {
      console.error("Error deleting schedule slot:", error);
      return internalServerError(res, "Failed to delete schedule slot");
    }
  }
);

// SESSIONS

// Create a new session
router.post("/sessions", requireAuth, async (req, res) => {
  try {
    const { title, description, classId } = req.body;
    const details = {};
    const titleError = validateRequiredTrimmedString(title, "title", {
      maxLength: 255
    });

    if (titleError) {
      details.title = titleError;
    }

    if (description !== undefined && typeof description !== "string") {
      details.description = "description must be a string";
    }

    if (Object.keys(details).length > 0) {
      return validationError(res, details);
    }

    const session = await db.createSession(
      req.user.id,
      getTrimmedString(title),
      getTrimmedString(description) || "",
      classId ?? null
    );
    res.status(201).json(session);
  } catch (error) {
    console.error("Error creating session:", error);
    return internalServerError(res, "Failed to create session");
  }
});

// List sessions (filter by classId or hostId)
router.get("/sessions", requireAuth, async (req, res) => {
  try {
    const { classId, hostId } = req.query;

    if (classId) {
      const classRow = await assertClassAccess(req, res, String(classId));
      if (!classRow) return;
      try {
        await syncScheduledSessionsForClass(String(classId));
      } catch (syncError) {
        console.error("Schedule sync failed (sessions by class):", syncError);
      }
      const sessions = await db.getSessionsByClassId(String(classId));
      return res.json(sessions);
    }

    if (hostId) {
      const hostIdError = validateUuid(String(hostId), "hostId");
      if (hostIdError) return validationError(res, { hostId: hostIdError });
      if (!ownsHostId(req, hostId)) return forbiddenError(res);
      const sessions = await db.getSessionsByHostId(String(hostId), {
        activeOnly: true
      });
      return res.json(sessions);
    }

    return res
      .status(400)
      .json({ error: "Query parameter classId or hostId is required" });
  } catch (error) {
    console.error("Error listing sessions:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get session by join code — public (no auth required; read-only lookup)
router.get("/sessions/join/:joinCode", async (req, res) => {
  try {
    const joinCode = getTrimmedString(req.params.joinCode);

    if (!joinCode) {
      return validationError(res, {
        joinCode: "joinCode is required"
      });
    }

    const session = await db.getSessionByJoinCode(joinCode, {
      activeOnly: true
    });

    if (!session) {
      return notFoundError(res, "Session");
    }

    res.json(session);
  } catch (error) {
    console.error("Error fetching session:", error);
    return internalServerError(res, "Failed to fetch session");
  }
});

// Get session by ID
router.get("/sessions/:id", requireAuth, async (req, res) => {
  try {
    const sessionIdError = validateUuid(req.params.id, "id");

    if (sessionIdError) {
      return validationError(res, { id: sessionIdError });
    }

    const session = await db.getSessionByIdForHost(req.params.id, req.user.id);

    if (!session) {
      const existingSession = await db.getSessionById(req.params.id);

      if (!existingSession) {
        return notFoundError(res, "Session");
      }

      return forbiddenError(res);
    }

    res.json(session);
  } catch (error) {
    console.error("Error fetching session:", error);
    return internalServerError(res, "Failed to fetch session");
  }
});

// Get all sessions for a host
router.get("/hosts/:hostId/sessions", requireAuth, async (req, res) => {
  try {
    const hostIdError = validateUuid(req.params.hostId, "hostId");

    if (hostIdError) {
      return validationError(res, { hostId: hostIdError });
    }

    if (!ownsHostId(req)) {
      return forbiddenError(res);
    }

    const sessions = await db.getSessionsByHostId(req.user.id);
    res.json(sessions);
  } catch (error) {
    console.error("Error fetching sessions:", error);
    return internalServerError(res, "Failed to fetch sessions");
  }
});

// Update session status
router.patch("/sessions/:id/status", requireAuth, async (req, res) => {
  try {
    const { status } = req.body;
    const details = {};
    const sessionIdError = validateUuid(req.params.id, "id");

    if (sessionIdError) {
      details.id = sessionIdError;
    }

    if (typeof status !== "string" || !status.trim()) {
      details.status = "status is required";
    }

    const normalizedStatus = getTrimmedString(status);

    if (normalizedStatus && !SESSION_STATUSES.includes(normalizedStatus)) {
      details.status = "status must be one of: active, closed";
    }

    if (Object.keys(details).length > 0) {
      return validationError(res, details);
    }

    const existingSession = await db.getSessionById(req.params.id);

    if (!existingSession) {
      return notFoundError(res, "Session");
    }

    if (String(existingSession.host_id) !== String(req.user.id)) {
      return forbiddenError(res);
    }

    let session;
    if (normalizedStatus === "closed") {
      let occurrenceKey = existingSession.schedule_occurrence_key;
      if (existingSession.schedule_slot_id && !occurrenceKey) {
        const clock = getScheduleNow();
        occurrenceKey = buildScheduleOccurrenceKey(
          existingSession.schedule_slot_id,
          clock.dateKey
        );
      }
      session = await db.closeSessionByHost(req.params.id, { occurrenceKey });
    } else {
      session = await db.updateSessionStatus(req.params.id, normalizedStatus);
    }

    if (!session) {
      return notFoundError(res, "Session");
    }

    res.json(session);
  } catch (error) {
    console.error("Error updating session:", error);
    return internalServerError(res, "Failed to update session");
  }
});

// QUEUE ENTRIES

// Add entry to queue
router.post(
  "/sessions/:sessionId/queue",
  requireAuth,
  requireStudent,
  async (req, res) => {
    try {
      const { studentName, question } = req.body;
      const details = {};
      const sessionIdError = validateUuid(req.params.sessionId, "sessionId");
      const questionError = validateRequiredTrimmedString(
        question,
        "question",
        {
          maxLength: 2000
        }
      );

      if (sessionIdError) {
        details.sessionId = sessionIdError;
      }

      if (questionError) {
        details.question = questionError;
      }

      const resolvedStudentName =
        getTrimmedString(req.profile.full_name) ||
        getTrimmedString(studentName) ||
        getTrimmedString(req.profile.email);

      const studentNameError = validateRequiredTrimmedString(
        resolvedStudentName,
        "studentName",
        { maxLength: 255 }
      );

      if (studentNameError) {
        details.studentName = studentNameError;
      }

      if (Object.keys(details).length > 0) {
        return validationError(res, details);
      }

      const session = await db.getSessionById(req.params.sessionId);

      if (!session) {
        return notFoundError(res, "Session");
      }

      if (session.status !== "active") {
        return badRequestError(
          res,
          "Session is closed. Ask your host for an active session."
        );
      }

      const entry = await db.addQueueEntry(
        req.params.sessionId,
        resolvedStudentName,
        getTrimmedString(question)
      );
      res.status(201).json(entry);
    } catch (error) {
      console.error("Error adding queue entry:", error);
      return internalServerError(res, "Failed to add queue entry");
    }
  }
);

// Get queue for a session
router.get("/sessions/:sessionId/queue", requireAuth, async (req, res) => {
  try {
    const sessionIdError = validateUuid(req.params.sessionId, "sessionId");

    if (sessionIdError) {
      return validationError(res, { sessionId: sessionIdError });
    }

    const session = await db.getSessionById(req.params.sessionId);
    if (!session) return notFoundError(res, "Session");
    if (session.class_id_uuid) {
      const classRow = await assertClassAccess(req, res, session.class_id_uuid);
      if (!classRow) return;
    }

    const queue = await db.getQueueBySessionId(req.params.sessionId);
    res.json(queue);
  } catch (error) {
    console.error("Error fetching queue:", error);
    return internalServerError(res, "Failed to fetch queue");
  }
});

// Update queue entry status
router.patch("/queue/:entryId/status", requireAuth, async (req, res) => {
  try {
    const { status } = req.body;
    const details = {};
    const entryIdError = validateUuid(req.params.entryId, "entryId");

    if (entryIdError) {
      details.entryId = entryIdError;
    }

    if (typeof status !== "string" || !status.trim()) {
      details.status = "status is required";
    }

    const normalizedStatus = getTrimmedString(status);

    if (normalizedStatus && !QUEUE_ENTRY_STATUSES.includes(normalizedStatus)) {
      details.status = "status must be one of: waiting, in_progress, completed";
    }

    if (Object.keys(details).length > 0) {
      return validationError(res, details);
    }

    const entry = await db.getQueueEntryById(req.params.entryId);

    if (!entry) {
      return notFoundError(res, "Queue entry");
    }

    const ownedSession = await db.getSessionByIdForHost(
      entry.session_id,
      req.user.id
    );

    if (!ownedSession) {
      return forbiddenError(res);
    }

    const updatedEntry = await db.updateQueueEntryStatus(
      req.params.entryId,
      normalizedStatus
    );
    res.json(updatedEntry);
  } catch (error) {
    console.error("Error updating queue entry:", error);
    return internalServerError(res, "Failed to update queue entry");
  }
});

// Remove queue entry
router.delete("/queue/:entryId", requireAuth, async (req, res) => {
  try {
    const entryIdError = validateUuid(req.params.entryId, "entryId");

    if (entryIdError) {
      return validationError(res, { entryId: entryIdError });
    }

    const entry = await db.getQueueEntryById(req.params.entryId);

    if (!entry) {
      return notFoundError(res, "Queue entry");
    }

    const ownedSession = await db.getSessionByIdForHost(
      entry.session_id,
      req.user.id
    );

    if (!ownedSession) {
      return forbiddenError(res);
    }

    await db.removeQueueEntry(req.params.entryId);
    res.json({ success: true });
  } catch (error) {
    console.error("Error removing queue entry:", error);
    return internalServerError(res, "Failed to remove queue entry");
  }
});

// Get queue stats for a session
router.get("/sessions/:sessionId/stats", requireAuth, async (req, res) => {
  try {
    const sessionIdError = validateUuid(req.params.sessionId, "sessionId");

    if (sessionIdError) {
      return validationError(res, { sessionId: sessionIdError });
    }

    const session = await db.getSessionById(req.params.sessionId);
    if (!session) return notFoundError(res, "Session");
    if (session.class_id_uuid) {
      const classRow = await assertClassAccess(req, res, session.class_id_uuid);
      if (!classRow) return;
    }

    const stats = await db.getQueueStats(req.params.sessionId);
    res.json(stats);
  } catch (error) {
    console.error("Error fetching queue stats:", error);
    return internalServerError(res, "Failed to fetch queue stats");
  }
});

export default router;
