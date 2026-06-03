/**
 * sessionManagement.test.js — Tests for session create/close and queue
 * ordering, status transitions, and multi-student behaviour.
 *
 * These tests cover the "real flow" a recruiter would care about:
 *   host creates session → students join → host moves them through statuses.
 */

import { randomUUID } from "node:crypto";
import { jest } from "@jest/globals";
import request from "supertest";

const SESSION_ID = randomUUID();
const HOST_USER_ID = randomUUID();
const OTHER_USER_ID = randomUUID();

const mockGetUser = jest.fn();
const mockDb = {
  // Sessions
  createSession: jest.fn(),
  getSessionById: jest.fn(),
  getSessionByIdForHost: jest.fn(),
  getSessionsByHostId: jest.fn(),
  getSessionByJoinCode: jest.fn(),
  updateSessionStatus: jest.fn(),
  closeSessionByHost: jest.fn(),
  // Queue
  addQueueEntry: jest.fn(),
  getQueueBySessionId: jest.fn(),
  getQueueEntryById: jest.fn(),
  updateQueueEntryStatus: jest.fn(),
  removeQueueEntry: jest.fn(),
  getQueueStats: jest.fn(),
  // Profile
  getProfileById: jest.fn(),
  // Classes (stubs)
  getClassById: jest.fn(),
  isUserEnrolledInClass: jest.fn()
};

jest.unstable_mockModule("../config/supabase.js", () => ({
  supabase: { auth: { getUser: mockGetUser } },
  supabaseAdmin: {}
}));
jest.unstable_mockModule("../services/db.js", () => mockDb);
jest.unstable_mockModule("../services/scheduleSync.js", () => ({
  syncScheduledSessionsForClass: jest.fn()
}));

const { default: app } = await import("../app.js");

// ── Auth helpers ──────────────────────────────────────────────────────────────

function signInAs(user) {
  mockGetUser.mockResolvedValue({ data: { user }, error: null });
}

const HOST = { id: HOST_USER_ID };
const OTHER = { id: OTHER_USER_ID };

beforeEach(() => {
  jest.clearAllMocks();
});

// ── Session creation ──────────────────────────────────────────────────────────

describe("POST /api/sessions — session creation", () => {
  test("creates a session with a title and returns 201", async () => {
    signInAs(HOST);
    mockDb.createSession.mockResolvedValue({
      id: SESSION_ID,
      host_id: HOST_USER_ID,
      join_code: "ABC123",
      title: "CSC 307 Office Hours",
      description: "Help with React and Express.",
      status: "active",
      class_id_uuid: null,
      created_at: new Date().toISOString()
    });

    const res = await request(app)
      .post("/api/sessions")
      .set("Authorization", "Bearer host-token")
      .send({
        title: "CSC 307 Office Hours",
        description: "Help with React and Express."
      });

    expect(res.status).toBe(201);
    expect(res.body.title).toBe("CSC 307 Office Hours");
    expect(res.body.join_code).toBe("ABC123");
    expect(res.body.status).toBe("active");
    expect(mockDb.createSession).toHaveBeenCalledWith(
      HOST_USER_ID,
      "CSC 307 Office Hours",
      "Help with React and Express.",
      null
    );
  });

  test("returns 400 when title is missing", async () => {
    signInAs(HOST);

    const res = await request(app)
      .post("/api/sessions")
      .set("Authorization", "Bearer host-token")
      .send({ description: "No title" });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("validation_failed");
    expect(res.body.error.details.title).toBeTruthy();
    expect(mockDb.createSession).not.toHaveBeenCalled();
  });

  test("returns 400 when title is blank whitespace", async () => {
    signInAs(HOST);

    const res = await request(app)
      .post("/api/sessions")
      .set("Authorization", "Bearer host-token")
      .send({ title: "   " });

    expect(res.status).toBe(400);
    expect(res.body.error.details.title).toBeTruthy();
    expect(mockDb.createSession).not.toHaveBeenCalled();
  });

  test("returns 401 without a bearer token", async () => {
    const res = await request(app)
      .post("/api/sessions")
      .send({ title: "Office Hours" });

    expect(res.status).toBe(401);
    expect(mockDb.createSession).not.toHaveBeenCalled();
  });
});

describe("GET /api/sessions?hostId=... — host session list", () => {
  test("returns sessions when hostId belongs to the authenticated user", async () => {
    signInAs(HOST);
    mockDb.getSessionsByHostId.mockResolvedValue([
      {
        id: SESSION_ID,
        host_id: HOST_USER_ID,
        join_code: "ABC123",
        title: "CSC 307 Office Hours",
        status: "active"
      }
    ]);

    const res = await request(app)
      .get(`/api/sessions?hostId=${HOST_USER_ID}`)
      .set("Authorization", "Bearer host-token");

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].host_id).toBe(HOST_USER_ID);
    expect(mockDb.getSessionsByHostId).toHaveBeenCalledWith(HOST_USER_ID, {
      activeOnly: true
    });
  });
});

// ── Session close ─────────────────────────────────────────────────────────────

describe("PATCH /api/sessions/:id/status — closing a session", () => {
  const activeSession = {
    id: SESSION_ID,
    host_id: HOST_USER_ID,
    join_code: "ABC123",
    status: "active",
    schedule_slot_id: null,
    schedule_occurrence_key: null
  };

  test("host can close their own session", async () => {
    signInAs(HOST);
    mockDb.getSessionById.mockResolvedValue(activeSession);
    mockDb.closeSessionByHost.mockResolvedValue({
      ...activeSession,
      status: "closed"
    });

    const res = await request(app)
      .patch(`/api/sessions/${SESSION_ID}/status`)
      .set("Authorization", "Bearer host-token")
      .send({ status: "closed" });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("closed");
    expect(mockDb.closeSessionByHost).toHaveBeenCalledWith(
      SESSION_ID,
      expect.any(Object)
    );
  });

  test("returns 403 when another user tries to close the session", async () => {
    signInAs(OTHER);
    mockDb.getSessionById.mockResolvedValue(activeSession); // host_id is HOST_USER_ID

    const res = await request(app)
      .patch(`/api/sessions/${SESSION_ID}/status`)
      .set("Authorization", "Bearer other-token")
      .send({ status: "closed" });

    expect(res.status).toBe(403);
    expect(mockDb.closeSessionByHost).not.toHaveBeenCalled();
  });

  test("returns 400 for an invalid status value", async () => {
    signInAs(HOST);

    const res = await request(app)
      .patch(`/api/sessions/${SESSION_ID}/status`)
      .set("Authorization", "Bearer host-token")
      .send({ status: "deleted" });

    expect(res.status).toBe(400);
    expect(res.body.error.details.status).toMatch(/active, closed/);
  });

  test("returns 404 when session does not exist", async () => {
    signInAs(HOST);
    mockDb.getSessionById.mockResolvedValue(null);

    const res = await request(app)
      .patch(`/api/sessions/${SESSION_ID}/status`)
      .set("Authorization", "Bearer host-token")
      .send({ status: "closed" });

    expect(res.status).toBe(404);
  });
});

// ── Queue ordering ────────────────────────────────────────────────────────────

describe("GET /api/sessions/:id/queue — queue ordering", () => {
  function makeEntry(n, status = "waiting") {
    return {
      id: randomUUID(),
      session_id: SESSION_ID,
      student_name: `Student ${n}`,
      question: `Question from student ${n}`,
      status,
      created_at: new Date(Date.now() + n * 1000).toISOString()
    };
  }

  test("returns entries in creation order (ascending joined_at)", async () => {
    signInAs(HOST);
    const entries = [makeEntry(1), makeEntry(2), makeEntry(3)];
    mockDb.getSessionById.mockResolvedValue({
      id: SESSION_ID,
      host_id: HOST_USER_ID,
      class_id_uuid: null
    });
    mockDb.getQueueBySessionId.mockResolvedValue(entries);

    const res = await request(app)
      .get(`/api/sessions/${SESSION_ID}/queue`)
      .set("Authorization", "Bearer host-token");

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(3);
    expect(res.body[0].student_name).toBe("Student 1");
    expect(res.body[1].student_name).toBe("Student 2");
    expect(res.body[2].student_name).toBe("Student 3");
  });

  test("returns empty array when queue is empty", async () => {
    signInAs(HOST);
    mockDb.getSessionById.mockResolvedValue({
      id: SESSION_ID,
      host_id: HOST_USER_ID,
      class_id_uuid: null
    });
    mockDb.getQueueBySessionId.mockResolvedValue([]);

    const res = await request(app)
      .get(`/api/sessions/${SESSION_ID}/queue`)
      .set("Authorization", "Bearer host-token");

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  test("returns 12 students preserving insertion order", async () => {
    signInAs(HOST);
    const entries = Array.from({ length: 12 }, (_, i) => makeEntry(i + 1));
    mockDb.getSessionById.mockResolvedValue({
      id: SESSION_ID,
      host_id: HOST_USER_ID,
      class_id_uuid: null
    });
    mockDb.getQueueBySessionId.mockResolvedValue(entries);

    const res = await request(app)
      .get(`/api/sessions/${SESSION_ID}/queue`)
      .set("Authorization", "Bearer host-token");

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(12);
    res.body.forEach((entry, i) => {
      expect(entry.student_name).toBe(`Student ${i + 1}`);
    });
  });

  test("returns 404 when session does not exist", async () => {
    signInAs(HOST);
    mockDb.getSessionById.mockResolvedValue(null);

    const res = await request(app)
      .get(`/api/sessions/${SESSION_ID}/queue`)
      .set("Authorization", "Bearer host-token");

    expect(res.status).toBe(404);
  });

  test("allows the host to view queue when the linked class row is missing", async () => {
    signInAs(HOST);
    const entries = [makeEntry(1), makeEntry(2)];
    mockDb.getSessionById.mockResolvedValue({
      id: SESSION_ID,
      host_id: HOST_USER_ID,
      class_id_uuid: randomUUID()
    });
    mockDb.getQueueBySessionId.mockResolvedValue(entries);

    const res = await request(app)
      .get(`/api/sessions/${SESSION_ID}/queue`)
      .set("Authorization", "Bearer host-token");

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(mockDb.getQueueBySessionId).toHaveBeenCalledWith(SESSION_ID);
  });
});

// ── Status transitions ────────────────────────────────────────────────────────

describe("PATCH /api/queue/:entryId/status — status transitions", () => {
  const ENTRY_ID = randomUUID();

  function waitingEntry() {
    return { id: ENTRY_ID, session_id: SESSION_ID, status: "waiting" };
  }

  function ownedSession() {
    return { id: SESSION_ID, host_id: HOST_USER_ID };
  }

  test("host moves entry from waiting → in_progress", async () => {
    signInAs(HOST);
    mockDb.getQueueEntryById.mockResolvedValue(waitingEntry());
    mockDb.getSessionByIdForHost.mockResolvedValue(ownedSession());
    mockDb.updateQueueEntryStatus.mockResolvedValue({
      ...waitingEntry(),
      status: "in_progress"
    });

    const res = await request(app)
      .patch(`/api/queue/${ENTRY_ID}/status`)
      .set("Authorization", "Bearer host-token")
      .send({ status: "in_progress" });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("in_progress");
    expect(mockDb.updateQueueEntryStatus).toHaveBeenCalledWith(
      ENTRY_ID,
      "in_progress"
    );
  });

  test("host moves entry from in_progress → completed", async () => {
    signInAs(HOST);
    mockDb.getQueueEntryById.mockResolvedValue({
      ...waitingEntry(),
      status: "in_progress"
    });
    mockDb.getSessionByIdForHost.mockResolvedValue(ownedSession());
    mockDb.updateQueueEntryStatus.mockResolvedValue({
      ...waitingEntry(),
      status: "completed"
    });

    const res = await request(app)
      .patch(`/api/queue/${ENTRY_ID}/status`)
      .set("Authorization", "Bearer host-token")
      .send({ status: "completed" });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("completed");
  });

  test("returns 400 for invalid status (unrecognised value)", async () => {
    signInAs(HOST);

    const res = await request(app)
      .patch(`/api/queue/${ENTRY_ID}/status`)
      .set("Authorization", "Bearer host-token")
      .send({ status: "helping" });

    expect(res.status).toBe(400);
    expect(res.body.error.details.status).toMatch(
      /waiting, in_progress, completed/
    );
    expect(mockDb.updateQueueEntryStatus).not.toHaveBeenCalled();
  });

  test("returns 400 when status field is missing", async () => {
    signInAs(HOST);

    const res = await request(app)
      .patch(`/api/queue/${ENTRY_ID}/status`)
      .set("Authorization", "Bearer host-token")
      .send({});

    expect(res.status).toBe(400);
    expect(mockDb.updateQueueEntryStatus).not.toHaveBeenCalled();
  });

  test("returns 403 when a non-host tries to update entry status", async () => {
    signInAs(OTHER);
    mockDb.getQueueEntryById.mockResolvedValue(waitingEntry());
    mockDb.getSessionByIdForHost.mockResolvedValue(null); // not the host

    const res = await request(app)
      .patch(`/api/queue/${ENTRY_ID}/status`)
      .set("Authorization", "Bearer other-token")
      .send({ status: "in_progress" });

    expect(res.status).toBe(403);
    expect(mockDb.updateQueueEntryStatus).not.toHaveBeenCalled();
  });

  test("returns 404 when queue entry does not exist", async () => {
    signInAs(HOST);
    mockDb.getQueueEntryById.mockResolvedValue(null);

    const res = await request(app)
      .patch(`/api/queue/${ENTRY_ID}/status`)
      .set("Authorization", "Bearer host-token")
      .send({ status: "in_progress" });

    expect(res.status).toBe(404);
    expect(mockDb.updateQueueEntryStatus).not.toHaveBeenCalled();
  });
});

// ── Session lookup by join code ───────────────────────────────────────────────

describe("GET /api/sessions/join/:code — session lookup", () => {
  test("returns session info for a valid join code", async () => {
    mockDb.getSessionByJoinCode.mockResolvedValue({
      id: SESSION_ID,
      join_code: "DEMO01",
      title: "CSC 307 Office Hours",
      status: "active"
    });

    const res = await request(app).get("/api/sessions/join/DEMO01");

    expect(res.status).toBe(200);
    expect(res.body.join_code).toBe("DEMO01");
    expect(res.body.title).toBe("CSC 307 Office Hours");
  });

  test("returns 404 for an unknown join code", async () => {
    mockDb.getSessionByJoinCode.mockResolvedValue(null);

    const res = await request(app).get("/api/sessions/join/BADCODE");

    expect(res.status).toBe(404);
  });
});
