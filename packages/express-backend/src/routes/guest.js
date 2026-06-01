/**
 * guest.js — Public (no-auth) routes for student queue participation.
 *
 * These routes are intentionally unauthenticated so students can join an
 * office-hours queue without creating a HelpQ account. They are appropriate
 * for a class demo. For a production deployment, you would add rate limiting
 * and/or a lightweight token-based ownership check.
 *
 * Mounted at /api/guest/* in app.js.
 */

import express from "express";
import * as db from "../services/db.js";
import {
  getTrimmedString,
  validateRequiredTrimmedString,
  validateUuid,
  validationError
} from "../utils/validation.js";
import { internalServerError, notFoundError } from "../utils/errors.js";

const router = express.Router();

// ── Session lookup ────────────────────────────────────────────────────────────

/**
 * GET /api/guest/sessions/join/:joinCode
 * Public session lookup by join code.
 * Returns session data needed to render the join form.
 */
router.get("/sessions/join/:joinCode", async (req, res) => {
  try {
    const joinCode = getTrimmedString(req.params.joinCode)?.toUpperCase();
    if (!joinCode) {
      return validationError(res, { joinCode: "Session code is required" });
    }

    const session = await db.getSessionByJoinCode(joinCode);
    if (!session) {
      return res.status(404).json({
        error: { code: "not_found", message: "No session found for that code. Check the code and try again." }
      });
    }

    return res.json({
      id: session.id,
      title: session.title,
      description: session.description ?? "",
      joinCode: (session.join_code ?? joinCode).toUpperCase(),
      status: session.status
    });
  } catch (err) {
    console.error("Guest session lookup error:", err);
    return internalServerError(res, "Failed to look up session");
  }
});

// ── Join queue ─────────────────────────────────────────────────────────────────

/**
 * POST /api/guest/sessions/:sessionId/join
 * Body: { studentName, question }
 * Adds a student to the queue without requiring a HelpQ account.
 * Returns the new queue entry and its position.
 */
router.post("/sessions/:sessionId/join", async (req, res) => {
  try {
    const { studentName, question } = req.body ?? {};
    const details = {};

    const sessionIdError = validateUuid(req.params.sessionId, "sessionId");
    if (sessionIdError) details.sessionId = sessionIdError;

    const nameError = validateRequiredTrimmedString(studentName, "studentName", { maxLength: 255 });
    if (nameError) details.studentName = nameError;

    const questionError = validateRequiredTrimmedString(question, "question", { maxLength: 2000 });
    if (questionError) details.question = questionError;

    if (Object.keys(details).length > 0) {
      return validationError(res, details);
    }

    const session = await db.getSessionById(req.params.sessionId);
    if (!session) {
      return notFoundError(res, "Session");
    }

    if (session.status === "closed") {
      return res.status(409).json({
        error: { code: "session_closed", message: "This session has ended and is no longer accepting students." }
      });
    }

    const entry = await db.addQueueEntry(
      req.params.sessionId,
      getTrimmedString(studentName),
      getTrimmedString(question)
    );

    // Compute position from the current queue length
    const queue = await db.getQueueBySessionId(req.params.sessionId);
    const position = queue.findIndex((e) => e.id === entry.id) + 1;

    return res.status(201).json({
      entry: {
        id: entry.id,
        sessionId: entry.session_id,
        studentName: entry.student_name,
        question: entry.question,
        status: entry.status,
        joinedAt: entry.created_at
      },
      position: position > 0 ? position : queue.length
    });
  } catch (err) {
    console.error("Guest join queue error:", err);
    return internalServerError(res, "Failed to join queue");
  }
});

// ── Queue view ────────────────────────────────────────────────────────────────

/**
 * GET /api/guest/sessions/:sessionId/queue
 * Returns the active queue for a session without requiring auth.
 * Only returns waiting and in_progress entries.
 */
router.get("/sessions/:sessionId/queue", async (req, res) => {
  try {
    const sessionIdError = validateUuid(req.params.sessionId, "sessionId");
    if (sessionIdError) {
      return validationError(res, { sessionId: sessionIdError });
    }

    const session = await db.getSessionById(req.params.sessionId);
    if (!session) return notFoundError(res, "Session");

    const queue = await db.getQueueBySessionId(req.params.sessionId);

    const entries = (queue || []).map((entry, index) => ({
      id: entry.id,
      studentName: entry.student_name,
      question: entry.question,
      status: entry.status,
      joinedAt: entry.created_at,
      position: index + 1
    }));

    return res.json({
      sessionId: req.params.sessionId,
      sessionStatus: session.status,
      entries
    });
  } catch (err) {
    console.error("Guest queue fetch error:", err);
    return internalServerError(res, "Failed to fetch queue");
  }
});

// ── Entry status ──────────────────────────────────────────────────────────────

/**
 * GET /api/guest/queue/:entryId
 * Returns status of a single queue entry by ID.
 * The entryId is treated as a capability token — whoever knows it can view it.
 */
router.get("/queue/:entryId", async (req, res) => {
  try {
    const entryIdError = validateUuid(req.params.entryId, "entryId");
    if (entryIdError) {
      return validationError(res, { entryId: entryIdError });
    }

    const entry = await db.getQueueEntryById(req.params.entryId);
    if (!entry) return notFoundError(res, "Queue entry");

    return res.json({
      id: entry.id,
      sessionId: entry.session_id,
      status: entry.status
    });
  } catch (err) {
    console.error("Guest entry fetch error:", err);
    return internalServerError(res, "Failed to fetch queue entry");
  }
});

// ── Leave queue ───────────────────────────────────────────────────────────────

/**
 * DELETE /api/guest/queue/:entryId
 * Removes a student from the queue by entry ID.
 * The entryId is returned when joining; the student stores it in localStorage.
 * No auth check — the entryId itself is the capability.
 */
router.delete("/queue/:entryId", async (req, res) => {
  try {
    const entryIdError = validateUuid(req.params.entryId, "entryId");
    if (entryIdError) {
      return validationError(res, { entryId: entryIdError });
    }

    const entry = await db.getQueueEntryById(req.params.entryId);
    if (!entry) return notFoundError(res, "Queue entry");

    await db.removeQueueEntry(req.params.entryId);
    return res.json({ success: true, message: "You left the queue." });
  } catch (err) {
    console.error("Guest leave queue error:", err);
    return internalServerError(res, "Failed to leave queue");
  }
});

export default router;
