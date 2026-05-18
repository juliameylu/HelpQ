import express from "express";
import * as db from "../services/db.js";
import { requireAuth } from "../middleware/auth.js";
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
  forbiddenError,
  internalServerError,
  notFoundError
} from "../utils/errors.js";

const router = express.Router();

const ownsHostId = (req) => req.params.hostId === req.user.id;

// SESSIONS

// Create a new session
router.post("/sessions", requireAuth, async (req, res) => {
  try {
    const { title, description } = req.body;
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
      getTrimmedString(description) || ""
    );
    res.status(201).json(session);
  } catch (error) {
    console.error("Error creating session:", error);
    return internalServerError(res, "Failed to create session");
  }
});

// Get session by join code
router.get("/sessions/join/:joinCode", async (req, res) => {
  try {
    const joinCode = getTrimmedString(req.params.joinCode);

    if (!joinCode) {
      return validationError(res, {
        joinCode: "joinCode is required"
      });
    }

    const session = await db.getSessionByJoinCode(joinCode);

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

    const ownedSession = await db.getSessionByIdForHost(req.params.id, req.user.id);

    if (!ownedSession) {
      const existingSession = await db.getSessionById(req.params.id);

      if (!existingSession) {
        return notFoundError(res, "Session");
      }

      return forbiddenError(res);
    }

    const session = await db.updateSessionStatus(req.params.id, normalizedStatus);

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
router.post("/sessions/:sessionId/queue", async (req, res) => {
  try {
    const { studentName, question } = req.body;
    const details = {};
    const sessionIdError = validateUuid(req.params.sessionId, "sessionId");
    const studentNameError = validateRequiredTrimmedString(
      studentName,
      "studentName",
      { maxLength: 255 }
    );
    const questionError = validateRequiredTrimmedString(question, "question", {
      maxLength: 2000
    });

    if (sessionIdError) {
      details.sessionId = sessionIdError;
    }

    if (studentNameError) {
      details.studentName = studentNameError;
    }

    if (questionError) {
      details.question = questionError;
    }

    if (Object.keys(details).length > 0) {
      return validationError(res, details);
    }

    const entry = await db.addQueueEntry(
      req.params.sessionId,
      getTrimmedString(studentName),
      getTrimmedString(question)
    );
    res.status(201).json(entry);
  } catch (error) {
    console.error("Error adding queue entry:", error);
    return internalServerError(res, "Failed to add queue entry");
  }
});

// Get queue for a session
router.get("/sessions/:sessionId/queue", async (req, res) => {
  try {
    const sessionIdError = validateUuid(req.params.sessionId, "sessionId");

    if (sessionIdError) {
      return validationError(res, { sessionId: sessionIdError });
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

    const ownedSession = await db.getSessionByIdForHost(entry.session_id, req.user.id);

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

    const ownedSession = await db.getSessionByIdForHost(entry.session_id, req.user.id);

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
router.get("/sessions/:sessionId/stats", async (req, res) => {
  try {
    const sessionIdError = validateUuid(req.params.sessionId, "sessionId");

    if (sessionIdError) {
      return validationError(res, { sessionId: sessionIdError });
    }

    const stats = await db.getQueueStats(req.params.sessionId);
    res.json(stats);
  } catch (error) {
    console.error("Error fetching queue stats:", error);
    return internalServerError(res, "Failed to fetch queue stats");
  }
});

export default router;
