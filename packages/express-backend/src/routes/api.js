import express from "express";
import * as db from "../services/db.js";

const router = express.Router();

// SESSIONS

// Create a new session
router.post("/sessions", async (req, res) => {
  try {
    const { hostId, title, description } = req.body;

    if (!hostId || !title) {
      return res.status(400).json({ error: "hostId and title are required" });
    }

    const session = await db.createSession(hostId, title, description);
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
router.get("/sessions/:id", async (req, res) => {
  try {
    const session = await db.getSessionById(req.params.id);

    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }

    res.json(session);
  } catch (error) {
    console.error("Error fetching session:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get all sessions for a host
router.get("/hosts/:hostId/sessions", async (req, res) => {
  try {
    const sessions = await db.getSessionsByHostId(req.params.hostId);
    res.json(sessions);
  } catch (error) {
    console.error("Error fetching sessions:", error);
    res.status(500).json({ error: error.message });
  }
});

// Update session status
router.patch("/sessions/:id/status", async (req, res) => {
  try {
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ error: "status is required" });
    }

    const session = await db.updateSessionStatus(req.params.id, status);
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
router.patch("/queue/:entryId/status", async (req, res) => {
  try {
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ error: "status is required" });
    }

    const entry = await db.updateQueueEntryStatus(req.params.entryId, status);
    res.json(entry);
  } catch (error) {
    console.error("Error updating queue entry:", error);
    res.status(500).json({ error: error.message });
  }
});

// Remove queue entry
router.delete("/queue/:entryId", async (req, res) => {
  try {
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
