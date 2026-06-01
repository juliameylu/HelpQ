# HelpQ API Reference

All endpoints return `application/json`. The backend runs on port 3001 locally and is proxied via Vite in development.

**Base URL (dev):** `http://127.0.0.1:3001`  
**Base URL (prod):** your Render deployment URL

**Error shape** (all errors):
```json
{
  "error": {
    "code": "error_code",
    "message": "Human-readable message",
    "details": { "field": "specific error" }
  }
}
```

**Error codes:** `bad_request` · `validation_failed` · `unauthorized` · `forbidden` · `not_found` · `internal_error` · `session_closed`

---

## Health

### `GET /health`

Liveness check. No auth required.

**Response 200:**
```json
{
  "status": "ok",
  "timestamp": "2026-05-31T07:00:00.000Z",
  "message": "Server is running",
  "features": { "scheduleAutoSync": true, "scheduleSyncStatus": true }
}
```

---

## Guest Endpoints (no auth)

These endpoints allow unauthenticated students to join and leave a session queue.

### `GET /api/sessions/join/:joinCode`

Look up an active session by its join code. No auth required.

**Params:** `:joinCode` — the 6-character session code (case-insensitive)

**Response 200:**
```json
{
  "id": "uuid",
  "title": "CSC 307 Office Hours",
  "description": "Help with React, Express, and Supabase.",
  "joinCode": "DEMO01",
  "status": "active"
}
```

**Errors:** `404` session not found · `400` empty code

---

### `GET /api/guest/sessions/join/:joinCode`

Alias for the public session lookup (identical behaviour, served from guest router).

---

### `POST /api/guest/sessions/:sessionId/join`

Add a student to a session queue without creating an account.

**Params:** `:sessionId` — UUID

**Request body:**
```json
{
  "studentName": "Alex R.",
  "question": "Help with React state — form doesn't update on submit."
}
```

**Response 201:**
```json
{
  "entry": {
    "id": "uuid",
    "sessionId": "uuid",
    "studentName": "Alex R.",
    "question": "...",
    "status": "waiting",
    "joinedAt": "2026-05-31T10:00:00.000Z"
  },
  "position": 3
}
```

**Errors:** `400` missing name/question · `400` invalid sessionId · `404` session not found · `409` session closed

---

### `GET /api/guest/sessions/:sessionId/queue`

Get the live queue for a session without auth.

**Params:** `:sessionId` — UUID

**Response 200:**
```json
{
  "sessionId": "uuid",
  "sessionStatus": "active",
  "entries": [
    {
      "id": "uuid",
      "studentName": "Maya C.",
      "question": "npm install keeps failing.",
      "status": "in_progress",
      "joinedAt": "...",
      "position": 1
    },
    {
      "id": "uuid",
      "studentName": "Alex R.",
      "question": "React state issue.",
      "status": "waiting",
      "position": 2
    }
  ]
}
```

Only returns `waiting` and `in_progress` entries; `completed` entries are excluded.

**Errors:** `400` invalid sessionId · `404` session not found

---

### `GET /api/guest/queue/:entryId`

Get the status of a single queue entry by ID.

**Response 200:**
```json
{
  "id": "uuid",
  "sessionId": "uuid",
  "status": "waiting"
}
```

**Errors:** `400` invalid UUID · `404` entry not found

---

### `DELETE /api/guest/queue/:entryId`

Student leaves the queue. The entry ID returned at join time serves as a capability token.

**Response 200:**
```json
{ "success": true, "message": "You left the queue." }
```

**Errors:** `400` invalid UUID · `404` entry not found

---

## Authenticated Endpoints

All routes below require a Supabase JWT as a Bearer token:
```
Authorization: Bearer <supabase_access_token>
```

---

## Sessions (authenticated)

### `POST /api/sessions`

Create a new office-hours session.

**Auth:** any authenticated user

**Request body:**
```json
{
  "title": "CSC 307 Office Hours",
  "description": "Help with React and Express.",
  "classId": "uuid (optional)"
}
```

**Response 201:**
```json
{
  "id": "uuid",
  "hostId": "uuid",
  "joinCode": "ABC123",
  "title": "CSC 307 Office Hours",
  "description": "...",
  "status": "active",
  "classId": null,
  "createdAt": "..."
}
```

**Errors:** `400` missing title · `401` unauthenticated

---

### `GET /api/sessions?hostId=:uuid`

List active sessions for a host.

**Auth:** must be the host (ownership check)

**Response 200:** array of session objects

---

### `GET /api/sessions/:id`

Get a session by ID (host-only view with ownership check).

**Auth:** host only

**Response 200:** session object  
**Errors:** `403` not the host · `404` session not found

---

### `PATCH /api/sessions/:id/status`

Update session status (e.g., close a session).

**Auth:** host only (ownership check)

**Request body:**
```json
{ "status": "closed" }
```

**Response 200:** updated session object  
**Errors:** `400` invalid status · `403` not host · `404` not found

---

## Queue (authenticated)

### `POST /api/sessions/:sessionId/queue`

Add an authenticated student to a session queue.

**Auth:** student role required

**Request body:**
```json
{
  "studentName": "Alex R.",
  "question": "React state doesn't update on submit."
}
```

**Response 201:** queue entry object  
**Errors:** `400` missing question · `401` unauthenticated · `403` professor role

---

### `GET /api/sessions/:sessionId/queue`

Get queue entries for a session.

**Auth:** any authenticated user (class enrollment checked if session has classId)

**Response 200:** array of queue entry objects ordered by `created_at`

---

### `PATCH /api/queue/:entryId/status`

Update a queue entry status (host action).

**Auth:** must be session host

**Request body:**
```json
{ "status": "in_progress" }
```

Valid statuses: `waiting` → `in_progress` → `completed`

**Response 200:** updated queue entry  
**Errors:** `400` invalid status · `403` not host · `404` entry not found

---

### `DELETE /api/queue/:entryId`

Remove a queue entry (host action).

**Auth:** must be session host

**Response 200:** `{ "success": true }`  
**Errors:** `403` not host · `404` entry not found

---

### `GET /api/sessions/:sessionId/stats`

Get queue statistics for a session.

**Auth:** any authenticated user

**Response 200:**
```json
{ "waiting": 8, "inProgress": 1, "completed": 3 }
```

---

## Classes (authenticated)

### `POST /api/classes`

Create a new class.

**Auth:** professor role required

**Request body:** `{ "title", "code", "description", "joinCode" }`

---

### `POST /api/classes/join`

Join a class by its join code.

**Auth:** student role required

**Request body:** `{ "joinCode": "CSC307" }`

---

### `GET /api/me/classes`

Get all classes the authenticated user is enrolled in or created.

**Auth:** any authenticated user

**Response 200:** array of class objects

---

### `GET /api/classes/:classId/sessions`

List sessions for a class.

**Auth:** class member or creator

---

### `GET /api/classes/:classId/roster`

Get enrolled members of a class.

**Auth:** class member or creator

---

## Office Hours Schedules (authenticated)

### `POST /api/classes/:classId/schedules`

Create or replace an office-hours schedule for a class.

**Auth:** professor, must be class creator

**Request body:**
```json
{
  "title": "Weekly OH",
  "description": "Help with assignments.",
  "slots": [
    { "dayOfWeek": 2, "startTime": "14:00", "endTime": "16:00" }
  ]
}
```

---

### `GET /api/classes/:classId/schedules`

List office-hours schedules for a class.

**Auth:** class member or creator

---

### `DELETE /api/classes/:classId/schedules/slots/:slotId`

Delete a schedule slot.

**Auth:** professor, must be class creator

---

## Status Codes Summary

| Code | Meaning |
|------|---------|
| 200 | OK |
| 201 | Created |
| 400 | Bad request / validation error |
| 401 | Missing or invalid bearer token |
| 403 | Forbidden — insufficient role or ownership |
| 404 | Resource not found |
| 409 | Conflict (e.g., session already closed) |
| 500 | Internal server error |
