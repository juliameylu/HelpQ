/**
 * guestFlow.test.js — Tests for the public /api/guest/* routes.
 *
 * These routes allow unauthenticated students to join, view, and leave a
 * session queue. No bearer token is needed.
 */

import { randomUUID } from "node:crypto";
import { jest } from "@jest/globals";
import request from "supertest";

const SESSION_ID = randomUUID();
const ENTRY_ID = randomUUID();
const JOIN_CODE = "DEMO01";

// Mock Supabase config (required by app bootstrap)
jest.unstable_mockModule("../config/supabase.js", () => ({
  supabase: { auth: { getUser: jest.fn() } },
  supabaseAdmin: {}
}));

// Mock DB service — controls what each guest route "sees" from the database
const mockDb = {
  getSessionByJoinCode: jest.fn(),
  getSessionById: jest.fn(),
  addQueueEntry: jest.fn(),
  getQueueBySessionId: jest.fn(),
  getQueueEntryById: jest.fn(),
  removeQueueEntry: jest.fn(),
  // Stubs needed by api.js (not used by guest routes)
  getProfileById: jest.fn(),
  createSession: jest.fn(),
  getQueueStats: jest.fn(),
  updateQueueEntryStatus: jest.fn(),
  getSessionByIdForHost: jest.fn()
};

jest.unstable_mockModule("../services/db.js", () => mockDb);
jest.unstable_mockModule("../services/scheduleSync.js", () => ({
  syncScheduledSessionsForClass: jest.fn()
}));

const { default: app } = await import("../app.js");

// ── Fixtures ──────────────────────────────────────────────────────────────────

const activeSession = {
  id: SESSION_ID,
  join_code: JOIN_CODE,
  title: "CSC 307 Office Hours",
  description: "Help with React and Express.",
  status: "active"
};

const closedSession = { ...activeSession, status: "closed" };

function makeEntry(overrides = {}) {
  return {
    id: ENTRY_ID,
    session_id: SESSION_ID,
    student_name: "Alex R.",
    question: "Help with React state.",
    status: "waiting",
    created_at: new Date().toISOString(),
    ...overrides
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

// ── GET /api/guest/sessions/join/:code ────────────────────────────────────────

describe("GET /api/guest/sessions/join/:code", () => {
  test("returns session info for a valid join code", async () => {
    mockDb.getSessionByJoinCode.mockResolvedValue(activeSession);

    const res = await request(app).get(`/api/guest/sessions/join/${JOIN_CODE}`);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(SESSION_ID);
    expect(res.body.title).toBe("CSC 307 Office Hours");
    expect(res.body.status).toBe("active");
    expect(res.body.joinCode).toBe(JOIN_CODE);
  });

  test("returns 404 for unknown session code", async () => {
    mockDb.getSessionByJoinCode.mockResolvedValue(null);

    const res = await request(app).get("/api/guest/sessions/join/BADCODE");

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("not_found");
  });

  test("returns 400 when join code is empty", async () => {
    const res = await request(app).get("/api/guest/sessions/join/%20");

    expect(res.status).toBe(400);
  });
});

// ── POST /api/guest/sessions/:id/join ─────────────────────────────────────────

describe("POST /api/guest/sessions/:id/join", () => {
  test("successfully joins an active session and returns entry with position", async () => {
    const entry = makeEntry();
    mockDb.getSessionById.mockResolvedValue(activeSession);
    mockDb.addQueueEntry.mockResolvedValue(entry);
    mockDb.getQueueBySessionId.mockResolvedValue([entry]);

    const res = await request(app)
      .post(`/api/guest/sessions/${SESSION_ID}/join`)
      .send({ studentName: "Alex R.", question: "Help with React state." });

    expect(res.status).toBe(201);
    expect(res.body.entry.id).toBe(ENTRY_ID);
    expect(res.body.entry.studentName).toBe("Alex R.");
    expect(res.body.entry.status).toBe("waiting");
    expect(res.body.position).toBe(1);
  });

  test("queue position is 1-indexed and reflects order", async () => {
    const firstEntry = makeEntry({ id: randomUUID() });
    const myEntry = makeEntry();
    mockDb.getSessionById.mockResolvedValue(activeSession);
    mockDb.addQueueEntry.mockResolvedValue(myEntry);
    mockDb.getQueueBySessionId.mockResolvedValue([firstEntry, myEntry]);

    const res = await request(app)
      .post(`/api/guest/sessions/${SESSION_ID}/join`)
      .send({ studentName: "New Student", question: "Another question." });

    expect(res.status).toBe(201);
    expect(res.body.position).toBe(2); // second in queue
  });

  test("returns 400 when studentName is missing", async () => {
    mockDb.getSessionById.mockResolvedValue(activeSession);

    const res = await request(app)
      .post(`/api/guest/sessions/${SESSION_ID}/join`)
      .send({ question: "A question?" });

    expect(res.status).toBe(400);
    expect(res.body.error.details.studentName).toBeTruthy();
    expect(mockDb.addQueueEntry).not.toHaveBeenCalled();
  });

  test("returns 400 when question is missing", async () => {
    const res = await request(app)
      .post(`/api/guest/sessions/${SESSION_ID}/join`)
      .send({ studentName: "Julia" });

    expect(res.status).toBe(400);
    expect(res.body.error.details.question).toBeTruthy();
    expect(mockDb.addQueueEntry).not.toHaveBeenCalled();
  });

  test("returns 400 when both fields are missing", async () => {
    const res = await request(app)
      .post(`/api/guest/sessions/${SESSION_ID}/join`)
      .send({});

    expect(res.status).toBe(400);
    expect(mockDb.addQueueEntry).not.toHaveBeenCalled();
  });

  test("returns 400 when sessionId is not a valid UUID", async () => {
    const res = await request(app)
      .post("/api/guest/sessions/not-a-uuid/join")
      .send({ studentName: "Alex", question: "Help?" });

    expect(res.status).toBe(400);
    expect(res.body.error.details.sessionId).toBeTruthy();
  });

  test("returns 404 when session does not exist", async () => {
    mockDb.getSessionById.mockResolvedValue(null);

    const res = await request(app)
      .post(`/api/guest/sessions/${SESSION_ID}/join`)
      .send({ studentName: "Alex", question: "Help with React." });

    expect(res.status).toBe(404);
    expect(mockDb.addQueueEntry).not.toHaveBeenCalled();
  });

  test("returns 409 when session is closed", async () => {
    mockDb.getSessionById.mockResolvedValue(closedSession);

    const res = await request(app)
      .post(`/api/guest/sessions/${SESSION_ID}/join`)
      .send({ studentName: "Alex", question: "Help?" });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("session_closed");
    expect(mockDb.addQueueEntry).not.toHaveBeenCalled();
  });
});

// ── GET /api/guest/sessions/:id/queue ─────────────────────────────────────────

describe("GET /api/guest/sessions/:id/queue", () => {
  test("returns queue entries with 1-indexed positions", async () => {
    const entries = [
      makeEntry({ id: randomUUID(), student_name: "First Student" }),
      makeEntry({ id: randomUUID(), student_name: "Second Student" })
    ];
    mockDb.getSessionById.mockResolvedValue(activeSession);
    mockDb.getQueueBySessionId.mockResolvedValue(entries);

    const res = await request(app).get(
      `/api/guest/sessions/${SESSION_ID}/queue`
    );

    expect(res.status).toBe(200);
    expect(res.body.entries).toHaveLength(2);
    expect(res.body.entries[0].position).toBe(1);
    expect(res.body.entries[1].position).toBe(2);
    expect(res.body.sessionId).toBe(SESSION_ID);
  });

  test("returns empty entries array when queue is empty", async () => {
    mockDb.getSessionById.mockResolvedValue(activeSession);
    mockDb.getQueueBySessionId.mockResolvedValue([]);

    const res = await request(app).get(
      `/api/guest/sessions/${SESSION_ID}/queue`
    );

    expect(res.status).toBe(200);
    expect(res.body.entries).toHaveLength(0);
  });

  test("returns 404 when session does not exist", async () => {
    mockDb.getSessionById.mockResolvedValue(null);

    const res = await request(app).get(
      `/api/guest/sessions/${SESSION_ID}/queue`
    );

    expect(res.status).toBe(404);
  });

  test("returns 400 when sessionId is not a valid UUID", async () => {
    const res = await request(app).get("/api/guest/sessions/invalid/queue");

    expect(res.status).toBe(400);
  });
});

// ── GET /api/guest/queue/:entryId ─────────────────────────────────────────────

describe("GET /api/guest/queue/:entryId", () => {
  test("returns entry status for a known entry ID", async () => {
    mockDb.getQueueEntryById.mockResolvedValue({
      id: ENTRY_ID,
      session_id: SESSION_ID,
      status: "waiting"
    });

    const res = await request(app).get(`/api/guest/queue/${ENTRY_ID}`);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(ENTRY_ID);
    expect(res.body.status).toBe("waiting");
  });

  test("returns 404 for unknown entry ID", async () => {
    mockDb.getQueueEntryById.mockResolvedValue(null);

    const res = await request(app).get(`/api/guest/queue/${ENTRY_ID}`);

    expect(res.status).toBe(404);
  });

  test("returns 400 for non-UUID entry ID", async () => {
    const res = await request(app).get("/api/guest/queue/not-a-uuid");

    expect(res.status).toBe(400);
  });
});

// ── DELETE /api/guest/queue/:entryId ─────────────────────────────────────────

describe("DELETE /api/guest/queue/:entryId (leave queue)", () => {
  test("successfully removes a queue entry", async () => {
    mockDb.getQueueEntryById.mockResolvedValue(makeEntry());
    mockDb.removeQueueEntry.mockResolvedValue(makeEntry());

    const res = await request(app).delete(`/api/guest/queue/${ENTRY_ID}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(mockDb.removeQueueEntry).toHaveBeenCalledWith(ENTRY_ID);
  });

  test("returns 404 when entry does not exist", async () => {
    mockDb.getQueueEntryById.mockResolvedValue(null);

    const res = await request(app).delete(`/api/guest/queue/${ENTRY_ID}`);

    expect(res.status).toBe(404);
    expect(mockDb.removeQueueEntry).not.toHaveBeenCalled();
  });

  test("returns 400 for non-UUID entry ID", async () => {
    const res = await request(app).delete("/api/guest/queue/bad-id");

    expect(res.status).toBe(400);
    expect(mockDb.removeQueueEntry).not.toHaveBeenCalled();
  });
});

// ── Multi-student ordering ────────────────────────────────────────────────────

describe("Multi-student queue ordering", () => {
  test("12 students joining preserve insertion order in queue listing", async () => {
    const entries = Array.from({ length: 12 }, (_, i) =>
      makeEntry({ id: randomUUID(), student_name: `Student ${i + 1}` })
    );
    mockDb.getSessionById.mockResolvedValue(activeSession);
    mockDb.getQueueBySessionId.mockResolvedValue(entries);

    const res = await request(app).get(
      `/api/guest/sessions/${SESSION_ID}/queue`
    );

    expect(res.status).toBe(200);
    expect(res.body.entries).toHaveLength(12);
    res.body.entries.forEach((entry, index) => {
      expect(entry.position).toBe(index + 1);
    });
  });
});
