import { randomUUID } from "node:crypto";
import { jest } from "@jest/globals";
import request from "supertest";

const mockGetUser = jest.fn();
const mockDb = {
  addQueueEntry: jest.fn(),
  createSession: jest.fn(),
  getProfileById: jest.fn(),
  getQueueEntryById: jest.fn(),
  getSessionById: jest.fn(),
  getSessionByIdForHost: jest.fn(),
  removeQueueEntry: jest.fn(),
  updateQueueEntryStatus: jest.fn()
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

const user = { id: randomUUID() };
const sessionId = randomUUID();
const queueEntryId = randomUUID();

function signIn() {
  mockGetUser.mockResolvedValue({ data: { user }, error: null });
}

beforeEach(() => {
  jest.clearAllMocks();
  signIn();
});

// ── Health endpoint ───────────────────────────────────────────────────────────

test("GET /health returns 200 with status ok", async () => {
  const response = await request(app).get("/health");
  expect(response.status).toBe(200);
  expect(response.body.status).toBe("ok");
});

// ── 404 — session not found ───────────────────────────────────────────────────

test("GET /api/sessions/:id returns 404 when session does not exist", async () => {
  mockDb.getSessionByIdForHost.mockResolvedValue(null);

  const response = await request(app)
    .get(`/api/sessions/${sessionId}`)
    .set("Authorization", "Bearer token");

  expect(response.status).toBe(404);
});

// ── 404 — queue entry not found ───────────────────────────────────────────────

test("PATCH /api/queue/:entryId/status returns 404 when entry does not exist", async () => {
  mockDb.getQueueEntryById.mockResolvedValue(null);

  const response = await request(app)
    .patch(`/api/queue/${queueEntryId}/status`)
    .set("Authorization", "Bearer token")
    .send({ status: "in_progress" });

  expect(response.status).toBe(404);
});

test("DELETE /api/queue/:entryId returns 404 when entry does not exist", async () => {
  mockDb.getQueueEntryById.mockResolvedValue(null);

  const response = await request(app)
    .delete(`/api/queue/${queueEntryId}`)
    .set("Authorization", "Bearer token");

  expect(response.status).toBe(404);
});

// ── Validation — missing question field ──────────────────────────────────────

test("POST /api/sessions/:id/queue returns 400 when question field is absent", async () => {
  mockDb.getProfileById.mockResolvedValue({
    id: user.id,
    email: "student@helpq.test",
    full_name: "Student",
    role: "student"
  });

  const response = await request(app)
    .post(`/api/sessions/${sessionId}/queue`)
    .set("Authorization", "Bearer token")
    .send({ studentName: "Student" }); // no question field at all

  expect(response.status).toBe(400);
  expect(mockDb.addQueueEntry).not.toHaveBeenCalled();
});
