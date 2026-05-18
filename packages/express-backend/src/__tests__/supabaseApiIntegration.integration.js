await import("../loadEnv.js");

const express = (await import("express")).default;
const request = (await import("supertest")).default;
const { default: apiRoutes } = await import("../routes/api.js");
const { supabase, supabaseAdmin } = await import("../config/supabase.js");

// test app setup ---------------------------------------------------------------

const app = express();

app.use(express.json());
app.use("/api", apiRoutes);

// test user setup --------------------------------------------------------------

const testRunId = Date.now();
const testEmail = `integration-host-${testRunId}@helpq.test`;
const testPassword = "Password123!";

let authToken;
let hostId;

// helpers ----------------------------------------------------------------------

async function createTestSession() {
  const response = await request(app)
    .post("/api/sessions")
    .set("Authorization", `Bearer ${authToken}`)
    .send({
      title: `Integration Test Office Hours ${testRunId}`,
      description: "Created by Supabase integration test."
    });

  expect(response.status).toBe(201);
  return response.body;
}

// lifecycle --------------------------------------------------------------------

beforeAll(async () => {
  if (!process.env.SUPABASE_URL?.includes("127.0.0.1")) {
    throw new Error(
      "Supabase integration tests must run against local Supabase, not the hosted project."
    );
  }

  const { data: createdUser, error: createUserError } =
    await supabaseAdmin.auth.admin.createUser({
      email: testEmail,
      password: testPassword,
      email_confirm: true
    });

  if (createUserError) {
    throw createUserError;
  }

  hostId = createdUser.user.id;

  const { data: signInData, error: signInError } =
    await supabase.auth.signInWithPassword({
      email: testEmail,
      password: testPassword
    });

  if (signInError) {
    throw signInError;
  }

  authToken = signInData.session.access_token;
});

afterAll(async () => {
  if (hostId) {
    await supabaseAdmin.from("sessions").delete().eq("host_id", hostId);
    await supabaseAdmin.auth.admin.deleteUser(hostId);
  }
});

// auth middleware tests --------------------------------------------------------

test("POST /api/sessions returns 401 when no bearer token is provided", async () => {
  const response = await request(app).post("/api/sessions").send({
    title: "Office Hours"
  });

  expect(response.status).toBe(401);
  expect(response.body).toEqual({
    error: "Missing bearer token"
  });
});

test("POST /api/sessions returns 401 when bearer token is invalid", async () => {
  const response = await request(app)
    .post("/api/sessions")
    .set("Authorization", "Bearer fake-token")
    .send({
      title: "Office Hours"
    });

  expect(response.status).toBe(401);
  expect(response.body).toEqual({
    error: "Invalid token"
  });
});

// session tests ----------------------------------------------------------------

test("POST /api/sessions creates a session in Supabase", async () => {
  const session = await createTestSession();

  expect(session.id).toBeDefined();
  expect(session.host_id).toBe(hostId);
  expect(session.join_code).toBeDefined();
  expect(session.title).toContain("Integration Test Office Hours");
  expect(session.status).toBe("active");
});

test("GET /api/sessions/join/:joinCode returns a session from Supabase", async () => {
  const session = await createTestSession();

  const response = await request(app).get(
    `/api/sessions/join/${session.join_code}`
  );

  expect(response.status).toBe(200);
  expect(response.body.id).toBe(session.id);
  expect(response.body.join_code).toBe(session.join_code);
});

// queue tests ------------------------------------------------------------------

test("POST /api/sessions/:sessionId/queue adds a queue entry in Supabase", async () => {
  const session = await createTestSession();

  const response = await request(app)
    .post(`/api/sessions/${session.id}/queue`)
    .send({
      studentName: "Integration Student",
      question: "Can I get help with testing Supabase?"
    });

  expect(response.status).toBe(201);
  expect(response.body.id).toBeDefined();
  expect(response.body.session_id).toBe(session.id);
  expect(response.body.student_name).toBe("Integration Student");
  expect(response.body.question).toBe("Can I get help with testing Supabase?");
  expect(response.body.status).toBe("waiting");
});

test("GET /api/sessions/:sessionId/queue returns queue entries from Supabase", async () => {
  const session = await createTestSession();

  await request(app).post(`/api/sessions/${session.id}/queue`).send({
    studentName: "First Student",
    question: "First question."
  });

  await request(app).post(`/api/sessions/${session.id}/queue`).send({
    studentName: "Second Student",
    question: "Second question."
  });

  const response = await request(app).get(`/api/sessions/${session.id}/queue`);

  expect(response.status).toBe(200);
  expect(response.body.length).toBeGreaterThanOrEqual(2);
  expect(response.body[0].student_name).toBe("First Student");
  expect(response.body[1].student_name).toBe("Second Student");
});

// protected host queue management tests ----------------------------------------

test("PATCH /api/queue/:entryId/status updates a queue entry status in Supabase", async () => {
  const session = await createTestSession();

  const createEntryResponse = await request(app)
    .post(`/api/sessions/${session.id}/queue`)
    .send({
      studentName: "Status Student",
      question: "Can you update my status?"
    });

  const entryId = createEntryResponse.body.id;

  const response = await request(app)
    .patch(`/api/queue/${entryId}/status`)
    .set("Authorization", `Bearer ${authToken}`)
    .send({
      status: "in_progress"
    });

  expect(response.status).toBe(200);
  expect(response.body.id).toBe(entryId);
  expect(response.body.status).toBe("in_progress");
});

test("DELETE /api/queue/:entryId removes a queue entry from Supabase", async () => {
  const session = await createTestSession();

  const createEntryResponse = await request(app)
    .post(`/api/sessions/${session.id}/queue`)
    .send({
      studentName: "Delete Student",
      question: "Please remove me."
    });

  const entryId = createEntryResponse.body.id;

  const deleteResponse = await request(app)
    .delete(`/api/queue/${entryId}`)
    .set("Authorization", `Bearer ${authToken}`);

  expect(deleteResponse.status).toBe(200);
  expect(deleteResponse.body.success).toBe(true);

  const queueResponse = await request(app).get(
    `/api/sessions/${session.id}/queue`
  );

  const deletedEntry = queueResponse.body.find((entry) => entry.id === entryId);

  expect(deletedEntry).toBeUndefined();
});
