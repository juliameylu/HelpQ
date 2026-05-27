import { randomUUID } from "node:crypto";
import { jest } from "@jest/globals";
import request from "supertest";

const mockGetUser = jest.fn();
const mockDb = {
  addQueueEntry: jest.fn(),
  createSession: jest.fn(),
  getQueueEntryById: jest.fn(),
  getSessionById: jest.fn(),
  getSessionByIdForHost: jest.fn(),
  removeQueueEntry: jest.fn(),
  updateQueueEntryStatus: jest.fn()
};

// mock supabase and the db so these tests can run in ci without a real database
jest.unstable_mockModule("../config/supabase.js", () => ({
  supabase: {
    auth: {
      getUser: mockGetUser
    }
  },
  supabaseAdmin: {}
}));

jest.unstable_mockModule("../services/db.js", () => mockDb);
jest.unstable_mockModule("../services/scheduleSync.js", () => ({
  syncScheduledSessionsForClass: jest.fn()
}));

const { default: app } = await import("../app.js");

const ownerUser = { id: randomUUID() };
const otherUser = { id: randomUUID() };
const sessionId = randomUUID();
const queueEntryId = randomUUID();

function authenticateAs(user) {
  mockGetUser.mockResolvedValue({
    data: { user },
    error: null
  });
}

beforeEach(() => {
  jest.clearAllMocks();
});

test("POST /api/sessions returns 401 when no bearer token is provided", async () => {
  const response = await request(app).post("/api/sessions").send({
    title: "Office Hours"
  });

  expect(response.status).toBe(401);
  expect(response.body).toEqual({
    error: {
      code: "unauthorized",
      message: "Missing bearer token"
    }
  });
  expect(mockDb.createSession).not.toHaveBeenCalled();
});

test("POST /api/sessions returns 401 when bearer token is invalid", async () => {
  mockGetUser.mockResolvedValue({
    data: { user: null },
    error: new Error("invalid token")
  });

  const response = await request(app)
    .post("/api/sessions")
    .set("Authorization", "Bearer fake-token")
    .send({
      title: "Office Hours"
    });

  expect(response.status).toBe(401);
  expect(response.body).toEqual({
    error: {
      code: "unauthorized",
      message: "Invalid token"
    }
  });
  expect(mockDb.createSession).not.toHaveBeenCalled();
});

test("POST /api/sessions creates a session with a valid bearer token", async () => {
  authenticateAs(ownerUser);
  mockDb.createSession.mockResolvedValue({
    id: sessionId,
    host_id: ownerUser.id,
    title: "Office Hours",
    status: "active"
  });

  const response = await request(app)
    .post("/api/sessions")
    .set("Authorization", "Bearer real-token")
    .send({
      title: "Office Hours",
      description: "React testing help"
    });

  expect(response.status).toBe(201);
  expect(response.body).toMatchObject({
    id: sessionId,
    host_id: ownerUser.id,
    title: "Office Hours"
  });
  expect(mockDb.createSession).toHaveBeenCalledWith(
    ownerUser.id,
    "Office Hours",
    "React testing help",
    null
  );
});

test("PATCH /api/queue/:entryId/status returns 401 when no bearer token is provided", async () => {
  const response = await request(app)
    .patch(`/api/queue/${queueEntryId}/status`)
    .send({
      status: "in_progress"
    });

  expect(response.status).toBe(401);
  expect(response.body.error.message).toBe("Missing bearer token");
  expect(mockDb.updateQueueEntryStatus).not.toHaveBeenCalled();
});

test("PATCH /api/queue/:entryId/status returns 403 when another user owns the session", async () => {
  authenticateAs(otherUser);
  mockDb.getQueueEntryById.mockResolvedValue({
    id: queueEntryId,
    session_id: sessionId,
    status: "waiting"
  });
  mockDb.getSessionByIdForHost.mockResolvedValue(null);

  const response = await request(app)
    .patch(`/api/queue/${queueEntryId}/status`)
    .set("Authorization", "Bearer other-token")
    .send({
      status: "in_progress"
    });

  expect(response.status).toBe(403);
  expect(response.body).toEqual({
    error: {
      code: "forbidden",
      message: "Forbidden"
    }
  });
  expect(mockDb.updateQueueEntryStatus).not.toHaveBeenCalled();
});

test("PATCH /api/queue/:entryId/status updates status when the authenticated user owns the session", async () => {
  authenticateAs(ownerUser);
  mockDb.getQueueEntryById.mockResolvedValue({
    id: queueEntryId,
    session_id: sessionId,
    status: "waiting"
  });
  mockDb.getSessionByIdForHost.mockResolvedValue({
    id: sessionId,
    host_id: ownerUser.id
  });
  mockDb.updateQueueEntryStatus.mockResolvedValue({
    id: queueEntryId,
    session_id: sessionId,
    status: "in_progress"
  });

  const response = await request(app)
    .patch(`/api/queue/${queueEntryId}/status`)
    .set("Authorization", "Bearer owner-token")
    .send({
      status: "in_progress"
    });

  expect(response.status).toBe(200);
  expect(response.body.status).toBe("in_progress");
  expect(mockDb.updateQueueEntryStatus).toHaveBeenCalledWith(
    queueEntryId,
    "in_progress"
  );
});

test("DELETE /api/queue/:entryId returns 403 when another user owns the session", async () => {
  authenticateAs(otherUser);
  mockDb.getQueueEntryById.mockResolvedValue({
    id: queueEntryId,
    session_id: sessionId,
    status: "waiting"
  });
  mockDb.getSessionByIdForHost.mockResolvedValue(null);

  const response = await request(app)
    .delete(`/api/queue/${queueEntryId}`)
    .set("Authorization", "Bearer other-token");

  expect(response.status).toBe(403);
  expect(response.body.error.message).toBe("Forbidden");
  expect(mockDb.removeQueueEntry).not.toHaveBeenCalled();
});

test("DELETE /api/queue/:entryId removes an entry when the authenticated user owns the session", async () => {
  authenticateAs(ownerUser);
  mockDb.getQueueEntryById.mockResolvedValue({
    id: queueEntryId,
    session_id: sessionId,
    status: "waiting"
  });
  mockDb.getSessionByIdForHost.mockResolvedValue({
    id: sessionId,
    host_id: ownerUser.id
  });
  mockDb.removeQueueEntry.mockResolvedValue({
    id: queueEntryId,
    session_id: sessionId
  });

  const response = await request(app)
    .delete(`/api/queue/${queueEntryId}`)
    .set("Authorization", "Bearer owner-token");

  expect(response.status).toBe(200);
  expect(response.body).toEqual({ success: true });
  expect(mockDb.removeQueueEntry).toHaveBeenCalledWith(queueEntryId);
});
