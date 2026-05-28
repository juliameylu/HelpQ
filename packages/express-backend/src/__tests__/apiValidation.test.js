import { randomUUID } from "node:crypto";
import { jest } from "@jest/globals";
import request from "supertest";

const mockGetUser = jest.fn();
const mockDb = {
  createSession: jest.fn(),
  getProfileById: jest.fn(),
  getQueueEntryById: jest.fn(),
  updateQueueEntryStatus: jest.fn()
};

// validation tests should fail before changing anything in the database
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

const user = { id: randomUUID() };
const sessionId = randomUUID();
const queueEntryId = randomUUID();

function signIn() {
  mockGetUser.mockResolvedValue({
    data: { user },
    error: null
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  signIn();
});

test("POST /api/sessions returns 400 when title is missing", async () => {
  const response = await request(app)
    .post("/api/sessions")
    .set("Authorization", "Bearer real-token")
    .send({
      description: "No title here"
    });

  expect(response.status).toBe(400);
  expect(response.body.error.code).toBe("validation_failed");
  expect(response.body.error.details.title).toBe("title must be a string");
  expect(mockDb.createSession).not.toHaveBeenCalled();
});

test("POST /api/sessions/:sessionId/queue returns 400 when question is blank", async () => {
  mockDb.getProfileById.mockResolvedValue({
    id: user.id,
    email: "student@helpq.test",
    full_name: "Student User",
    role: "student"
  });

  const response = await request(app)
    .post(`/api/sessions/${sessionId}/queue`)
    .set("Authorization", "Bearer student-token")
    .send({
      question: "   "
    });

  expect(response.status).toBe(400);
  expect(response.body.error.details.question).toBe("question is required");
});

test("PATCH /api/queue/:entryId/status returns 400 for an invalid status", async () => {
  const response = await request(app)
    .patch(`/api/queue/${queueEntryId}/status`)
    .set("Authorization", "Bearer real-token")
    .send({
      status: "helping"
    });

  expect(response.status).toBe(400);
  expect(response.body.error.details.status).toContain(
    "waiting, in_progress, completed"
  );
  expect(mockDb.updateQueueEntryStatus).not.toHaveBeenCalled();
});

test("PATCH /api/queue/:entryId/status returns 400 when entry id is not a uuid", async () => {
  const response = await request(app)
    .patch("/api/queue/not-a-real-id/status")
    .set("Authorization", "Bearer real-token")
    .send({
      status: "in_progress"
    });

  expect(response.status).toBe(400);
  expect(response.body.error.details.entryId).toBe(
    "entryId must be a valid UUID"
  );
  expect(mockDb.getQueueEntryById).not.toHaveBeenCalled();
});
