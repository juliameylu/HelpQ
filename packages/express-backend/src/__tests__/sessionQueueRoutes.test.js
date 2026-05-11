import request from "supertest";

import app from "../app.js";
import { resetStore } from "../data/store.js";

beforeEach(() => {
  resetStore();
});

async function createTestSession() {
  const response = await request(app).post("/sessions");

  return response.body.session;
}

// ------------------------------------------------------------------------------

describe("Session routes", () => {

  // POST ------------------------------------------------------------------------------

  test("POST /sessions creates a new session", async () => {
    const response = await request(app).post("/sessions");

    expect(response.status).toBe(201);
    expect(response.body.session).toBeDefined();
    expect(response.body.session.id).toBe(1);
    expect(response.body.session.sessionCode).toBeDefined();
    expect(response.body.session.active).toBe(true);
    expect(response.body.session.createdAt).toBeDefined();
  });

  // GET ------------------------------------------------------------------------------

  test("GET /sessions/:sessionCode returns an existing session", async () => {
    const session = await createTestSession();

    const response = await request(app).get(`/sessions/${session.sessionCode}`);

    expect(response.status).toBe(200);
    expect(response.body.session.id).toBe(session.id);
    expect(response.body.session.sessionCode).toBe(session.sessionCode);
    expect(response.body.session.active).toBe(true);
  });

  test("GET /sessions/:sessionCode returns 404 for an invalid session code", async () => {
    const response = await request(app).get("/sessions/FAKE123");

    expect(response.status).toBe(404);
    expect(response.body.error).toBe("Session not found");
  });
});




// ------------------------------------------------------------------------------




describe("Queue routes", () => {

 // POST ------------------------------------------------------------------------------ 

  test("POST /sessions/:sessionCode/queue adds a student to the queue", async () => {
    const session = await createTestSession();

    const response = await request(app)
      .post(`/sessions/${session.sessionCode}/queue`)
      .send({
        studentName: "Student Name",
        question: "Help",
      });

    expect(response.status).toBe(201);
    expect(response.body.queueEntry).toBeDefined();
    expect(response.body.queueEntry.id).toBe(1);
    expect(response.body.queueEntry.sessionId).toBe(session.id);
    expect(response.body.queueEntry.studentName).toBe("Student Name");
    expect(response.body.queueEntry.question).toBe(
      "Help"
    );
    expect(response.body.queueEntry.status).toBe("waiting");
    expect(response.body.queueEntry.joinedAt).toBeDefined();
    expect(response.body.position).toBe(1);
  });

  test("POST /sessions/:sessionCode/queue trims student name and question", async () => {
    const session = await createTestSession();

    const response = await request(app)
      .post(`/sessions/${session.sessionCode}/queue`)
      .send({
        studentName: "  Student  ",
        question: "  I need help.  ",
      });

    expect(response.status).toBe(201);
    expect(response.body.queueEntry.studentName).toBe("Student");
    expect(response.body.queueEntry.question).toBe("I need help.");
  });

  test("POST /sessions/:sessionCode/queue rejects an empty student name", async () => {
    const session = await createTestSession();

    const response = await request(app)
      .post(`/sessions/${session.sessionCode}/queue`)
      .send({
        studentName: "",
        question: "I need help.",
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe("Student name is required");
  });

  test("POST /sessions/:sessionCode/queue rejects a blank student name", async () => {
    const session = await createTestSession();

    const response = await request(app)
      .post(`/sessions/${session.sessionCode}/queue`)
      .send({
        studentName: "   ",
        question: "I need help.",
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe("Student name is required");
  });

  test("POST /sessions/:sessionCode/queue rejects an empty question", async () => {
    const session = await createTestSession();

    const response = await request(app)
      .post(`/sessions/${session.sessionCode}/queue`)
      .send({
        studentName: "Student",
        question: "",
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe("Question is required");
  });

  test("POST /sessions/:sessionCode/queue rejects a blank question", async () => {
    const session = await createTestSession();

    const response = await request(app)
      .post(`/sessions/${session.sessionCode}/queue`)
      .send({
        studentName: "Student",
        question: "   ",
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe("Question is required");
  });

  test("POST /sessions/:sessionCode/queue rejects an invalid session code", async () => {
    const response = await request(app)
      .post("/sessions/FAKE123/queue")
      .send({
        studentName: "Student",
        question: "I need help.",
      });

    expect(response.status).toBe(404);
    expect(response.body.error).toBe("Session not found");
  });

// GET ------------------------------------------------------------------------------

  test("GET /sessions/:sessionCode/queue returns queue entries in order", async () => {
    const session = await createTestSession();

    await request(app).post(`/sessions/${session.sessionCode}/queue`).send({
      studentName: "Student One",
      question: "First question.",
    });

    await request(app).post(`/sessions/${session.sessionCode}/queue`).send({
      studentName: "Student Two",
      question: "Second question.",
    });

    const response = await request(app).get(
      `/sessions/${session.sessionCode}/queue`
    );

    expect(response.status).toBe(200);
    expect(response.body.queue).toHaveLength(2);

    expect(response.body.queue[0].studentName).toBe("Student One");
    expect(response.body.queue[0].position).toBe(1);

    expect(response.body.queue[1].studentName).toBe("Student Two");
    expect(response.body.queue[1].position).toBe(2);
  });

  test("GET /sessions/:sessionCode/queue returns 404 for an invalid session code", async () => {
    const response = await request(app).get("/sessions/FAKE123/queue");

    expect(response.status).toBe(404);
    expect(response.body.error).toBe("Session not found");
  });


// PATCH ------------------------------------------------------------------------------

  test("PATCH /queue-entries/:entryId updates a queue entry status", async () => {
    const session = await createTestSession();

    const createResponse = await request(app)
      .post(`/sessions/${session.sessionCode}/queue`)
      .send({
        studentName: "Student One",
        question: "I need help.",
      });

    const entryId = createResponse.body.queueEntry.id;

    const response = await request(app)
      .patch(`/queue-entries/${entryId}`)
      .send({
        status: "helping",
      });

    expect(response.status).toBe(200);
    expect(response.body.queueEntry.id).toBe(entryId);
    expect(response.body.queueEntry.status).toBe("helping");
  });

  test("PATCH /queue-entries/:entryId rejects an invalid status", async () => {
    const session = await createTestSession();

    const createResponse = await request(app)
      .post(`/sessions/${session.sessionCode}/queue`)
      .send({
        studentName: "Student Two",
        question: "I need help.",
      });

    const entryId = createResponse.body.queueEntry.id;

    const response = await request(app)
      .patch(`/queue-entries/${entryId}`)
      .send({
        status: "random",
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe("Invalid status");
  });

  test("PATCH /queue-entries/:entryId returns 404 for a missing entry", async () => {
    const response = await request(app)
      .patch("/queue-entries/999999")
      .send({
        status: "helping",
      });

    expect(response.status).toBe(404);
    expect(response.body.error).toBe("Queue entry not found");
  });

// DELETE ------------------------------------------------------------------------------

  test("DELETE /queue-entries/:entryId removes a queue entry", async () => {
    const session = await createTestSession();

    const createResponse = await request(app)
      .post(`/sessions/${session.sessionCode}/queue`)
      .send({
        studentName: "Student Three",
        question: "Please help!",
      });

    const entryId = createResponse.body.queueEntry.id;

    const response = await request(app).delete(`/queue-entries/${entryId}`);

    expect(response.status).toBe(200);
    expect(response.body.message).toBe("Queue entry removed");
  });

  test("DELETE /queue-entries/:entryId returns 404 for a missing entry", async () => {
    const response = await request(app).delete("/queue-entries/999");

    expect(response.status).toBe(404);
    expect(response.body.error).toBe("Queue entry not found");
  });


});
