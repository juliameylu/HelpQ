# CacheMeOutside

## Software Requirements Specification (SRS)

**Instructor:** Lara Nichols-Brown  
**Term:** Spring 2026  
**Section:** [Section Number]  
**Status:** Draft  
**Last Updated:** April 27, 2026

## The Engineering Team

- Student A: [Name] - [Role, e.g., App Architect]
- Student B: [Name] - [Role, e.g., API Developer]
- Student C: [Name] - [Role, e.g., Scrum Master]

## Project Assets

- GitHub: <https://github.com/juliameylu/CacheMeOutside>
- Deployment: [Link to Live Site]

## Document History

| Last Date Changed | Who    | What Was Changed                                           |
| ----------------- | ------ | ---------------------------------------------------------- |
| April 27, 2026    | [Name] | Converted SRD into SRS template format for CacheMeOutside. |

---

## Table of Contents

- 1. Introduction
- 2. User Stories
- 3. Functional Requirements
- 4. Non-Functional Requirements
- 5. System Architecture
- 6. User Interface (UI)
- 7. Data Requirements
- 8. Traceability Matrix
- 9. Appendices
- 10. AI Usage & Disclosure

---

## 1. Introduction

### 1.1 Project Purpose

CacheMeOutside is a live office hours help queue platform. It helps instructors,
teaching assistants, tutors, or other session hosts manage student help requests
in an organized realtime queue.

The project solves the problem of chaotic office hours where students do not
know who is next, hosts lose track of questions, and similar questions are
handled separately even when they could be grouped.

### 1.2 Intended Audience

The intended users and stakeholders are:

- Students who need help during office hours or study sessions.
- Hosts such as professors, teaching assistants, tutors, or peer mentors.
- Course staff who want a clearer view of common question topics.
- Developers on the CacheMeOutside team.
- The course instructor evaluating the project.

### 1.3 Project Scope

The scope of this project is to build a web-based office hours queue system
where:

- A host can create a live help session.
- Students can join a session with a code or QR link.
- Students can submit their name and question.
- The system stores sessions and queue entries persistently.
- The queue updates live for hosts and students.
- Hosts can view and manage queue entries.
- The system may suggest duplicate or similar questions for host review.

Out of scope for the first version:

- Full video conferencing.
- Deep integrations with Zoom, Canvas, Slack, Discord, or Spotify.
- Automatic AI merging without host approval.
- Production-grade institutional authentication unless added later.

---

## 2. User Stories

User stories follow the format: "As a [Type of User], I want to [Action] so that
[Value/Benefit]."

| ID    | Requirement                                                                                                             | Priority |
| ----- | ----------------------------------------------------------------------------------------------------------------------- | -------- |
| US-01 | As a host, I want to create a session so that students can join my office hours queue.                                  | 1        |
| US-02 | As a student, I want to join a session with a code or QR link so that I can enter the correct help queue.               | 1        |
| US-03 | As a student, I want to submit my name and question so that the host knows what I need help with.                       | 1        |
| US-04 | As a student, I want to view the live queue so that I know my place in line.                                            | 1        |
| US-05 | As a host, I want to view and manage the live queue so that I can help students in an organized order.                  | 1        |
| US-06 | As a host, I want to mark a queue entry as active, complete, or skipped so that the queue status stays accurate.        | 2        |
| US-07 | As a host, I want to see similar or duplicate questions grouped so that I can answer repeated questions efficiently.    | 3        |
| US-08 | As a developer, I want clear frontend and backend setup instructions so that the team can run the project consistently. | 1        |

---

## 3. Functional Requirements

The system shall:

| ID    | Requirement                                                                                    | Priority |
| ----- | ---------------------------------------------------------------------------------------------- | -------- |
| FR-01 | Allow a host to create a session with a unique join code.                                      | 1        |
| FR-02 | Allow a student to join an active session by entering a valid session code.                    | 1        |
| FR-03 | Allow a student to submit a queue request containing at least a name and question.             | 1        |
| FR-04 | Store sessions and queue requests in PostgreSQL.                                               | 1        |
| FR-05 | Return the current ordered queue for a session.                                                | 1        |
| FR-06 | Display the student's current position in the queue.                                           | 1        |
| FR-07 | Allow the host to update queue entry status, including waiting, active, complete, and skipped. | 2        |
| FR-08 | Send live queue updates to connected clients using Socket.IO.                                  | 2        |
| FR-09 | Validate required form fields before creating a queue entry.                                   | 1        |
| FR-10 | Show useful success and error messages after queue actions.                                    | 2        |
| FR-11 | Suggest similar or duplicate questions for host review.                                        | 3        |
| FR-12 | Provide local development documentation for running the frontend and backend.                  | 1        |

---

## 4. Non-Functional Requirements

### 4.1 Data Integrity & Security

- The system shall validate session codes before allowing students to join a
  queue.
- The system shall validate required fields before saving queue entries.
- The system shall store database credentials in environment variables, not in
  source code.
- The system shall prevent students from modifying host-only queue actions.
- The system shall handle invalid input and failed database operations without
  crashing.

### 4.2 Performance & Usability

- The system shall provide realtime queue updates quickly enough for users to
  understand queue changes without manually refreshing.
- The system shall support multiple students connected to the same session at
  once.
- The student join form shall be simple and usable on desktop and mobile.
- The host queue view shall make active, waiting, complete, and skipped entries
  easy to distinguish.
- The application shall use clear labels and readable layouts.

### 4.3 Maintainability

- The project shall use a monorepo structure with separate frontend and backend
  packages.
- The project shall use Prettier for consistent formatting.
- The frontend and backend packages shall use ESLint for JavaScript code
  quality.
- The repository shall include contribution instructions for team members.

---

## 5. System Architecture

### 5.1 Planned Tech Stack

- Frontend: React
- Backend: Node.js and Express
- Database: PostgreSQL
- Database access: `pg`
- Realtime updates: Socket.IO
- Styling: CSS or Tailwind

### 5.2 REST API Endpoints

Planned endpoints may include:

| Method | URL                         | Description                                     |
| ------ | --------------------------- | ----------------------------------------------- |
| GET    | `/api/health`               | Checks whether the backend server is running.   |
| POST   | `/api/sessions`             | Creates a new office hours session.             |
| GET    | `/api/sessions/:code`       | Fetches session details by join code.           |
| GET    | `/api/sessions/:code/queue` | Fetches the current queue for a session.        |
| POST   | `/api/sessions/:code/queue` | Adds a student help request to the queue.       |
| PATCH  | `/api/queue/:entryId`       | Updates the status or details of a queue entry. |
| DELETE | `/api/queue/:entryId`       | Removes or cancels a queue entry.               |

### 5.3 Realtime Events

Planned Socket.IO events may include:

| Event                 | Description                                           |
| --------------------- | ----------------------------------------------------- |
| `session:join`        | Client joins a realtime room for a session.           |
| `queue:updated`       | Server broadcasts the latest queue state.             |
| `queue:entry-created` | Server notifies clients that a new request was added. |
| `queue:entry-updated` | Server notifies clients that an entry status changed. |

### 5.4 Database Schema (PostgreSQL)

Planned tables may include:

#### `sessions`

| Field        | Type                       | Description                              |
| ------------ | -------------------------- | ---------------------------------------- |
| `id`         | UUID or serial primary key | Unique session identifier.               |
| `code`       | Text, unique               | Join code used by students.              |
| `title`      | Text                       | Session title or course label.           |
| `host_name`  | Text                       | Name of the session host.                |
| `status`     | Text                       | Session status such as active or closed. |
| `created_at` | Timestamp                  | Time the session was created.            |

#### `queue_entries`

| Field          | Type                       | Description                            |
| -------------- | -------------------------- | -------------------------------------- |
| `id`           | UUID or serial primary key | Unique queue entry identifier.         |
| `session_id`   | Foreign key                | Associated session.                    |
| `student_name` | Text                       | Name entered by the student.           |
| `question`     | Text                       | Student question or topic.             |
| `details`      | Text, nullable             | Optional additional explanation.       |
| `status`       | Text                       | waiting, active, complete, or skipped. |
| `position`     | Integer                    | Queue order for the session.           |
| `created_at`   | Timestamp                  | Time the request was submitted.        |
| `updated_at`   | Timestamp                  | Time the request was last updated.     |

### 5.5 UML

UML diagram: [Attach diagram or link here]

---

## 6. User Interface (UI)

### 6.1 Wireframes / Mockups

Planned screens:

- Host landing/session creation screen.
- Student join screen with session code input.
- Student question submission form.
- Student queue status screen showing position and current active request.
- Host queue dashboard showing all entries and queue management controls.

Wireframes/mockups: [Attach images or links here]

---

## 7. Data Requirements

### 7.1 Persistent Data

The system shall persist:

- Session IDs.
- Session join codes.
- Session titles or labels.
- Host names or identifiers.
- Session status.
- Student names.
- Student questions.
- Optional question details.
- Queue entry statuses.
- Queue order or position.
- Creation and update timestamps.

---

## 8. Traceability Matrix

| ID    | Requirement                                        | Line of Code |
| ----- | -------------------------------------------------- | ------------ |
| US-01 | Host can create a session.                         | TBD          |
| US-02 | Student can join a session with a code or QR link. | TBD          |
| US-03 | Student can submit name and question.              | TBD          |
| US-04 | Student can view live queue position.              | TBD          |
| US-05 | Host can view and manage queue entries.            | TBD          |
| US-06 | Host can update queue entry status.                | TBD          |
| US-07 | System can suggest similar or duplicate questions. | TBD          |
| US-08 | Developers have local setup instructions.          | TBD          |

---

## 9. Appendices

### 9.1 References

- CSC 307 course materials.
- GitHub repository: <https://github.com/juliameylu/CacheMeOutside>
- React documentation.
- Express documentation.
- PostgreSQL documentation.
- Socket.IO documentation.

### 9.2 Glossary

| Term         | Definition                                                               |
| ------------ | ------------------------------------------------------------------------ |
| API          | Application Programming Interface.                                       |
| Host         | The instructor, teaching assistant, tutor, or leader managing a session. |
| Queue Entry  | A student's submitted help request.                                      |
| Session Code | A unique code students use to join a live office hours queue.            |
| Socket.IO    | Library used for realtime client-server communication.                   |
| SRS          | Software Requirements Specification.                                     |

---

## 10. AI Usage & Disclosure

### 10.1 Model(s) Used

- OpenAI Codex / ChatGPT

### 10.2 Prompts Used During Coding or Documentation

- "give me a step by step of what i need to do"
- "do it all for me in cache me outside but dont commit"
- "can u read the issues too for more context on our project"
- "read the srs template"
- "change the srd.md to follow this format"

### 10.3 AI Usage Summary

AI assistance was used to help interpret assignment instructions, set up project
tooling, read the SRS template, and draft this SRS document. Team members are
responsible for reviewing, editing, and confirming that all requirements match
the final project scope.
