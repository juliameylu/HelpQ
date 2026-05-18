import express from "express";
import * as db from "../services/db.js";
import { requireAuth } from "../middleware/auth.js";
import {
  QUEUE_ENTRY_STATUSES,
  SESSION_STATUSES
} from "../constants/statuses.js";

const router = express.Router();

const ownsHostId = (req) => req.params.hostId === req.user.id;

// SESSIONS

// Create a new session
router.post("/sessions", requireAuth, async (req, res) => {
  try {
    const { title, description } = req.body;

    if (!title) {
      return res.status(400).json({ error: "title is required" });
    }

    const session = await db.createSession(req.user.id, title, description);
    res.status(201).json(session);
  } catch (error) {
    console.error("Error creating session:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get session by join code
router.get("/sessions/join/:joinCode", async (req, res) => {
  try {
    const session = await db.getSessionByJoinCode(req.params.joinCode);

    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }

    res.json(session);
  } catch (error) {
    console.error("Error fetching session:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get session by ID
router.get("/sessions/:id", requireAuth, async (req, res) => {
  try {
    const session = await db.getSessionByIdForHost(req.params.id, req.user.id);

    if (!session) {
      const existingSession = await db.getSessionById(req.params.id);

      if (!existingSession) {
        return res.status(404).json({ error: "Session not found" });
      }

      return res.status(403).json({ error: "Forbidden" });
    }

    res.json(session);
  } catch (error) {
    console.error("Error fetching session:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get all sessions for a host
router.get("/hosts/:hostId/sessions", requireAuth, async (req, res) => {
  try {
    if (!ownsHostId(req)) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const sessions = await db.getSessionsByHostId(req.user.id);
    res.json(sessions);
  } catch (error) {
    console.error("Error fetching sessions:", error);
    res.status(500).json({ error: error.message });
  }
});

// Update session status
router.patch("/sessions/:id/status", requireAuth, async (req, res) => {
  try {
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ error: "status is required" });
    }

    if (!SESSION_STATUSES.includes(status)) {
      return res.status(400).json({ error: "Invalid session status" });
    }

    const ownedSession = await db.getSessionByIdForHost(req.params.id, req.user.id);

    if (!ownedSession) {
      const existingSession = await db.getSessionById(req.params.id);

      if (!existingSession) {
        return res.status(404).json({ error: "Session not found" });
      }

      return res.status(403).json({ error: "Forbidden" });
    }

    const session = await db.updateSessionStatus(req.params.id, status);

    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }

    res.json(session);
  } catch (error) {
    console.error("Error updating session:", error);
    res.status(500).json({ error: error.message });
  }
});

// QUEUE ENTRIES

// Add entry to queue
router.post("/sessions/:sessionId/queue", async (req, res) => {
  try {
    const { studentName, question } = req.body;

    if (!studentName || !question) {
      return res
        .status(400)
        .json({ error: "studentName and question are required" });
    }

    const entry = await db.addQueueEntry(
      req.params.sessionId,
      studentName,
      question
    );
    res.status(201).json(entry);
  } catch (error) {
    console.error("Error adding queue entry:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get queue for a session
router.get("/sessions/:sessionId/queue", async (req, res) => {
  try {
    const queue = await db.getQueueBySessionId(req.params.sessionId);
    res.json(queue);
  } catch (error) {
    console.error("Error fetching queue:", error);
    res.status(500).json({ error: error.message });
  }
});

// Update queue entry status
router.patch("/queue/:entryId/status", requireAuth, async (req, res) => {
  try {
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ error: "status is required" });
    }

    if (!QUEUE_ENTRY_STATUSES.includes(status)) {
      return res.status(400).json({ error: "Invalid queue entry status" });
    }

    const entry = await db.getQueueEntryById(req.params.entryId);

    if (!entry) {
      return res.status(404).json({ error: "Queue entry not found" });
    }

    const ownedSession = await db.getSessionByIdForHost(entry.session_id, req.user.id);

    if (!ownedSession) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const updatedEntry = await db.updateQueueEntryStatus(req.params.entryId, status);
    res.json(updatedEntry);
  } catch (error) {
    console.error("Error updating queue entry:", error);
    res.status(500).json({ error: error.message });
  }
});

// Remove queue entry
router.delete("/queue/:entryId", requireAuth, async (req, res) => {
  try {
    const entry = await db.getQueueEntryById(req.params.entryId);

    if (!entry) {
      return res.status(404).json({ error: "Queue entry not found" });
    }

    const ownedSession = await db.getSessionByIdForHost(entry.session_id, req.user.id);

    if (!ownedSession) {
      return res.status(403).json({ error: "Forbidden" });
    }

    await db.removeQueueEntry(req.params.entryId);
    res.json({ success: true });
  } catch (error) {
    console.error("Error removing queue entry:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get queue stats for a session
router.get("/sessions/:sessionId/stats", async (req, res) => {
  try {
    const stats = await db.getQueueStats(req.params.sessionId);
    res.json(stats);
  } catch (error) {
    console.error("Error fetching queue stats:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
