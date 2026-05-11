# Sprint 1 API Contract

## Project Overview

### Project Name
**HelpQ**

### Description
HelpQ is a simple office hours queue system. A host can create a session, and students can join the session by submitting their name and question.

Sprint 1 focuses on the core backend queue functionality only.

---

# Core Data Models

## Session Model

A session represents a single office hours queue.

### Example

```json
{
  "id": 1,
  "sessionCode": "ABC123",
  "active": true,
  "createdAt": "2026-04-28T18:30:00.000Z"
}
```

### Fields

| Field | Type | Description |
|---|---|---|
| id | number | Unique internal session id |
| sessionCode | string | Short code students use to join |
| active | boolean | Whether the session is currently open |
| createdAt | string (ISO date) | When the session was created |

---

## Queue Entry Model

A queue entry represents one student waiting for help.

### Example

```json
{
  "id": 1,
  "sessionId": 1,
  "studentName": "Student Name",
  "question": "I need help.",
  "status": "waiting",
  "joinedAt": "2026-04-28T18:35:00.000Z"
}
```

### Fields

| Field | Type | Description |
|---|---|---|
| id | number | Unique queue entry id |
| sessionId | number | Session this student belongs to |
| studentName | string | Student's name |
| question | string | What the student needs help with |
| status | string | Current queue status |
| joinedAt | string (ISO date) | When the student joined the queue |

### Allowed Status Values

- `waiting`
- `helping`
- `done`

---

# API Endpoints

---

# General Routes

## GET /

Checks that the API is running.

### Success Response

```text
Office Hours Queue API is running
```

---

## GET /health

Checks that the backend server is healthy.

### Success Response

```json
{
  "status": "ok",
  "message": "Backend server is healthy"
}
```

---

# Session Routes

## POST /sessions

Creates a new office hours session.

### Request Body

```json
{}
```

### Success Response

```json
{
  "session": {
    "id": 1,
    "sessionCode": "ABC123",
    "active": true,
    "createdAt": "2026-04-28T18:30:00.000Z"
  }
}
```

---

## GET /sessions/:sessionCode

Gets a session by session code.

### Success Response

```json
{
  "session": {
    "id": 1,
    "sessionCode": "ABC123",
    "active": true,
    "createdAt": "2026-04-28T18:30:00.000Z"
  }
}
```

### Error Response

```json
{
  "error": "Session not found"
}
```

---

# Queue Routes

## POST /sessions/:sessionCode/queue

Adds a student to a session queue.

### Request Body

```json
{
  "studentName": "Student One",
  "question": "Help me."
}
```

### Success Response

```json
{
  "queueEntry": {
    "id": 1,
    "sessionId": 1,
    "studentName": "Student One",
    "question": "Help me.",
    "status": "waiting",
    "joinedAt": "2026-04-28T18:35:00.000Z"
  },
  "position": 1
}
```

### Error Responses

#### Missing Student Name

```json
{
  "error": "Student name is required"
}
```

#### Missing Question

```json
{
  "error": "Question is required"
}
```

#### Invalid Session

```json
{
  "error": "Session not found"
}
```

---

## GET /sessions/:sessionCode/queue

Gets the current queue for a session.

### Success Response

```json
{
  "queue": [
    {
      "id": 1,
      "sessionId": 1,
      "studentName": "Student One",
      "question": "Help me.",
      "status": "waiting",
      "joinedAt": "2026-04-28T18:35:00.000Z",
      "position": 1
    }
  ]
}
```

### Notes

- Queue entries are returned in the order they joined.
- Queue entries with status `"done"` are excluded from the visible queue.

---

## PATCH /queue-entries/:entryId

Updates a queue entry status.

### Request Body

```json
{
  "status": "helping"
}
```

### Success Response

```json
{
  "queueEntry": {
    "id": 1,
    "sessionId": 1,
    "studentName": "Student One",
    "question": "Help me.",
    "status": "helping",
    "joinedAt": "2026-04-28T18:35:00.000Z"
  }
}
```

### Error Responses

#### Invalid Status

```json
{
  "error": "Invalid status"
}
```

#### Queue Entry Not Found

```json
{
  "error": "Queue entry not found"
}
```

---

## DELETE /queue-entries/:entryId

Removes a student from the queue.

### Success Response

```json
{
  "message": "Queue entry removed"
}
```

### Error Response

```json
{
  "error": "Queue entry not found"
}
```

---

# Sprint 1 Testing Coverage

Backend Jest and Supertest tests verify that:

- A session can be created
- A created session includes a session code
- An existing session can be fetched
- Invalid session codes return a 404 error
- A student can join a valid session queue
- Student names and questions are trimmed
- A student cannot join with an empty or blank name
- A student cannot join with an empty or blank question
- A student cannot join an invalid session
- Queue entries are returned in joined order
- Queue position is calculated correctly
- A queue entry status can be updated
- Invalid status values are rejected
- Missing queue entries return a 404 error
- A queue entry can be removed