import { randomUUID } from "node:crypto";
import { jest } from "@jest/globals";
import request from "supertest";

const mockGetUser = jest.fn();
const mockDb = {
  addQueueEntry: jest.fn(),
  getProfileById: jest.fn()
};

// focused on role checks only
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

const studentUser = { id: randomUUID() };
const professorUser = { id: randomUUID() };
const sessionId = randomUUID();

function signInAs(user) {
  mockGetUser.mockResolvedValue({
    data: { user },
    error: null
  });
}

beforeEach(() => {
  jest.clearAllMocks();
});

test("POST /api/sessions/:sessionId/queue returns 401 when no token is provided", async () => {
  const response = await request(app)
    .post(`/api/sessions/${sessionId}/queue`)
    .send({
      studentName: "Student User",
      question: "Help"
    });

  expect(response.status).toBe(401);
  expect(response.body.error.message).toBe("Missing bearer token");
  expect(mockDb.addQueueEntry).not.toHaveBeenCalled();
});

test("POST /api/sessions/:sessionId/queue returns 403 for a professor account", async () => {
  signInAs(professorUser);
  mockDb.getProfileById.mockResolvedValue({
    id: professorUser.id,
    email: "host@helpq.test",
    full_name: "Host User",
    role: "professor"
  });

  const response = await request(app)
    .post(`/api/sessions/${sessionId}/queue`)
    .set("Authorization", "Bearer host-token")
    .send({
      studentName: "Host User",
      question: "Help"
    });

  expect(response.status).toBe(403);
  expect(response.body.error.message).toBe("Student access required");
  expect(mockDb.addQueueEntry).not.toHaveBeenCalled();
});

test("POST /api/sessions/:sessionId/queue creates an entry for a student account", async () => {
  signInAs(studentUser);
  mockDb.getProfileById.mockResolvedValue({
    id: studentUser.id,
    email: "student@helpq.test",
    full_name: "Student User",
    role: "student"
  });
  mockDb.addQueueEntry.mockResolvedValue({
    id: randomUUID(),
    session_id: sessionId,
    student_name: "Student User",
    question: "Help",
    status: "waiting"
  });

  const response = await request(app)
    .post(`/api/sessions/${sessionId}/queue`)
    .set("Authorization", "Bearer student-token")
    .send({
      question: "Help"
    });

  expect(response.status).toBe(201);
  expect(response.body.student_name).toBe("Student User");
  expect(mockDb.addQueueEntry).toHaveBeenCalledWith(
    sessionId,
    "Student User",
    "Help"
  );
});

test("POST /api/sessions/:sessionId/queue returns 401 when the profile is missing", async () => {
  signInAs(studentUser);
  mockDb.getProfileById.mockResolvedValue(null);

  const response = await request(app)
    .post(`/api/sessions/${sessionId}/queue`)
    .set("Authorization", "Bearer student-token")
    .send({
      studentName: "Student User",
      question: "Help"
    });

  expect(response.status).toBe(401);
  expect(response.body.error.message).toBe("User profile not found");
  expect(mockDb.addQueueEntry).not.toHaveBeenCalled();
});
