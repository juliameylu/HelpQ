# HelpQ — Architecture

**Last updated:** 2026-05-31

---

## Monorepo Structure

```
helpq/                          ← root monorepo (npm workspaces)
├── frontend/                  ← React/Vite frontend workspace
│   ├── src/
│   │   ├── pages/              ← React page components (one per route)
│   │   ├── components/         ← Shared UI components
│   │   ├── context/            ← AppContext (auth, classes, sessions)
│   │   ├── lib/                ← Supabase client, auth helpers, local storage
│   │   ├── data/               ← Mock/fixture data
│   │   ├── api.js              ← Frontend API client (auth'd + guest functions)
│   │   └── App.jsx             ← Router and route definitions
│   ├── index.css               ← Global CSS (custom design system)
│   └── vite.config.js          ← Vite config with dev proxy (/api → :3001)
├── packages/
│   └── express-backend/        ← Express API workspace
│       ├── src/
│       │   ├── routes/
│       │   │   ├── api.js      ← All authenticated routes (800 lines)
│       │   │   └── guest.js    ← Public student routes (no auth)
│       │   ├── middleware/
│       │   │   └── auth.js     ← requireAuth, requireStudent, requireProfessor
│       │   ├── services/
│       │   │   └── db.js       ← Supabase database service layer
│       │   ├── utils/
│       │   │   ├── validation.js  ← Input validators (100% test coverage)
│       │   │   ├── errors.js      ← Standardized HTTP error responses
│       │   │   └── scheduleClock.js ← Schedule timing utilities
│       │   ├── config/
│       │   │   └── supabase.js ← Supabase client initialization
│       │   ├── constants/
│       │   │   └── statuses.js ← Queue and session status constants
│       │   ├── app.js          ← Testable Express app (CORS, routes, health)
│       │   └── index.js        ← Production server (binds port)
│       ├── jest.config.js      ← Jest config with coverage settings
│       └── package.json
├── supabase/
│   ├── migrations/             ← 8 SQL migration files (schema evolution)
│   └── seed.sql                ← Seed data for local Supabase development
├── scripts/
│   └── demo-seed.mjs           ← Admin seed script (requires service role key)
├── docs/                       ← Project documentation
│   ├── ARCHITECTURE.md         ← This file
│   ├── API.md                  ← REST API reference
│   ├── DEMO.md                 ← Presentation demo script
│   ├── DEPLOYMENT.md           ← Deployment guide
│   ├── SECURITY.md             ← Security documentation
│   ├── TESTING.md              ← Testing documentation
│   ├── UML.md                  ← UML diagrams
│   ├── diagrams/
│   │   └── helpq-class-diagram.mmd  ← Mermaid class diagram source
│   └── SUPABASE_EMAIL_AUTH.md  ← Email auth configuration
└── .github/workflows/          ← CI + Azure deployment workflows
```

---

## Architectural Pattern

HelpQ follows a **layered MVC architecture**:

| Layer               | Technology                        | Files                                                   |
| ------------------- | --------------------------------- | ------------------------------------------------------- |
| **View**            | React 19 pages and components     | `frontend/src/pages/`, `frontend/src/components/`       |
| **Controller**      | Express route handlers            | `packages/express-backend/src/routes/`                  |
| **Model / Service** | Supabase query layer + validation | `packages/express-backend/src/services/db.js`, `utils/` |
| **Data**            | Supabase PostgreSQL + RLS         | `supabase/migrations/`                                  |

```
Browser (View)
    │  HTTP /api/*
    ▼
Express Routes (Controller)
    │  middleware: auth → validation → business logic
    ▼
Database Service Layer (Model)
    │  Supabase JS client
    ▼
Supabase PostgreSQL (Data)
```

---

## Frontend Architecture

### Framework

React 19 with Vite 7 as the build tool and Tailwind CSS + custom CSS for
styling.

### Pages / Routes

| Route                       | Page                    | Auth Required                                        | Purpose                   |
| --------------------------- | ----------------------- | ---------------------------------------------------- | ------------------------- |
| `/`                         | `HomeOrLanding`         | No (shows LandingPage to guests, HomePage to auth'd) | Entry point               |
| `/join`                     | `GuestJoinPage`         | **No**                                               | Public student queue join |
| `/student/join`             | `GuestJoinPage`         | **No**                                               | Alias for /join           |
| `/login`                    | `LoginPage`             | No                                                   | Sign up / sign in         |
| `/sessions/:code/manage`    | `ViewQueuePage`         | Professor                                            | Host queue dashboard      |
| `/classes/:id`              | `ClassPage`             | Any auth                                             | Class detail view         |
| `/classes/new`              | `CreateClassPage`       | Professor                                            | Create class              |
| `/classes/:id/sessions/new` | `CreateOfficeHoursPage` | Professor                                            | Start office hours        |
| `/join-class`               | `JoinClassPage`         | Any auth                                             | Join class with code      |
| `/dashboard/join`           | `JoinQueuePage`         | Any auth                                             | Auth'd queue join         |

### Components

- `DashboardLayout` — sidebar navigation wrapper for auth'd pages
- `ProtectedRoute` — redirects to `/login` if user is not authenticated
- `ProfessorRoute` — redirects if user is not a professor
- `BackLink` — consistent back navigation
- Form components — field groups with validation error display

### API Client Layer (`frontend/src/api.js`)

Two families of functions:

**Authenticated API** (`jsonFetch`): Automatically attaches
`Authorization: Bearer <token>` from the current Supabase session. Used by
professor/host pages and the auth'd student queue join.

**Guest API** (`guestFetch`): No auth header. Used by `GuestJoinPage`. Exports:
`guestGetSession`, `guestJoinQueue`, `guestGetQueue`, `guestGetEntry`,
`guestLeaveQueue`.

### State Management

- `AppContext` (React Context) — holds auth state, live sessions, enrolled
  classes, notification state
- `localStorage` — `helpq-app-state-v1` (auth'd user state) and
  `helpq-guest-session-v1` (guest queue entry)
- No external state management library (Redux, Zustand) — kept simple for course
  scope

---

## Backend Architecture

### Framework

Express 5 with ES modules (`"type": "module"`). CORS via the `cors` package. No
ORM — direct Supabase JS client calls.

### Two Application Entry Points

This design allows the test suite to run without Supabase credentials:

| File           | Purpose                                                                        |
| -------------- | ------------------------------------------------------------------------------ |
| `src/app.js`   | Express app setup — CORS, health check, route mounting. Imported by tests.     |
| `src/index.js` | Production server — binds `PORT`, calls `app.listen()`. Not imported by tests. |

### Routes

| File              | Prefix       | Auth                              | Purpose                                    |
| ----------------- | ------------ | --------------------------------- | ------------------------------------------ |
| `routes/api.js`   | `/api`       | Most routes require `requireAuth` | All professor/student authenticated routes |
| `routes/guest.js` | `/api/guest` | None                              | Public student queue join/view/leave       |

### Middleware Chain

```
Request
  → CORS headers
  → JSON body parser
  → Route handler
      → requireAuth (if protected)
          → supabase.auth.getUser(token)
      → requireStudent / requireProfessor (if role-gated)
          → db.getProfileById(req.user.id)
      → validateUuid / validateRequiredTrimmedString
      → db.* call
  → JSON response
```

### Service Layer (`services/db.js`)

Thin wrapper around the Supabase admin client. Contains all database queries.
Exported functions:

**Sessions:** `createSession`, `getSessionByJoinCode`, `getSessionById`,
`getSessionByIdForHost`, `getSessionsByHostId`, `getSessionsByClassId`,
`updateSessionStatus`, `closeSessionByHost`

**Queue:** `addQueueEntry`, `getQueueBySessionId`, `getQueueEntryById`,
`updateQueueEntryStatus`, `removeQueueEntry`, `getQueueStats`,
`getQueuePosition`

**Classes:** `createClass`, `getClassById`, `getClassByJoinCode`,
`getClassesCreatedBy`, `getClassesForUser`, `enrollUserInClass`,
`isUserEnrolledInClass`, `getClassRoster`

**Schedules:** `replaceOfficeHoursSchedule`, `getOfficeHoursSchedulesForClass`,
`deleteScheduleSlot`

**Profiles:** `getProfileById`

### Validation Utilities (`utils/validation.js`)

Pure functions — 100% test coverage:

- `validateUuid(value, fieldName)` → null or error message
- `validateRequiredTrimmedString(value, fieldName, { maxLength })` → null or
  error message
- `getTrimmedString(value)` → trimmed string or original value

### Error Utilities (`utils/errors.js`)

Standardized error responses — all errors follow the same shape:

```json
{ "error": { "code": "error_code", "message": "...", "details": {} } }
```

Functions: `validationError`, `unauthorizedError`, `forbiddenError`,
`notFoundError`, `internalServerError`

---

## Data Architecture

### Database: Supabase (PostgreSQL)

**Schema evolution:** 8 migration files in `supabase/migrations/` applied in
chronological order via `supabase db push`.

### Core Tables

| Table                         | Key Columns                                                         | Purpose                              |
| ----------------------------- | ------------------------------------------------------------------- | ------------------------------------ |
| `profiles`                    | `id` (FK→auth.users), `role`, `full_name`                           | User accounts with role              |
| `classes`                     | `id`, `title`, `join_code` (unique), `created_by`                   | Instructor-created classes           |
| `class_enrollments`           | `class_id`, `user_id`                                               | Student/professor ↔ class membership |
| `office_hours_schedules`      | `id`, `class_id`, `host_id`                                         | Recurring schedule config            |
| `office_hours_schedule_slots` | `schedule_id`, `day_of_week`, `start_time`, `end_time`              | Weekly time slots                    |
| `sessions`                    | `id`, `join_code` (unique), `host_id`, `status`, `schedule_slot_id` | Live OH sessions                     |
| `queue_entries`               | `id`, `session_id`, `student_name`, `question`, `status`            | Students in queue                    |

### Queue Entry Status Machine

```
waiting → in_progress → completed
                    ↘
                    removed (DELETE)
```

### Row-Level Security

Supabase RLS policies restrict what each Supabase role can see/modify. The
backend also enforces ownership in route handlers (defense in depth).

---

## How the Implementation Maps to Course Architecture

The CSC 307 architecture planned in the SRD included:

| Planned                 | Implemented                                        | Notes                                        |
| ----------------------- | -------------------------------------------------- | -------------------------------------------- |
| React frontend          | ✅ React 19 / Vite 7                               | Aligned                                      |
| REST API backend        | ✅ Express 5 with 45+ endpoints                    | Aligned                                      |
| PostgreSQL database     | ✅ Supabase (hosted PostgreSQL)                    | Aligned — Supabase provides managed Postgres |
| User authentication     | ✅ Supabase Auth (email/password)                  | Aligned                                      |
| Role-based access       | ✅ `student` / `professor` roles in `profiles`     | Aligned                                      |
| Class management        | ✅ Classes + enrollments                           | Aligned                                      |
| Office hours scheduling | ✅ Recurring slots auto-synced to sessions         | Aligned, added sprint 3                      |
| Session queue           | ✅ Real-time-polling queue with status transitions | Aligned                                      |
| Testing                 | ✅ Jest + Supertest (74 tests)                     | Aligned                                      |

### Intentional Deviations from Plan

1. **Supabase instead of custom auth** — Original plan mentioned building auth
   from scratch. Supabase was used instead, which provided JWT, email
   confirmation, and password reset at no cost in implementation time. This
   allowed more time for the queue logic.

2. **Guest student flow added late (Sprint 4)** — The original design required
   students to have accounts. A guest join path was added to make the demo more
   accessible (no sign-up friction for students in the class).

3. **No WebSockets / real-time push** — Supabase Realtime is configured in
   migrations, but the frontend polls (every 2.5–5 seconds) rather than using
   push subscriptions. This was a time-vs-complexity tradeoff.

---

## Known Limitations and Future Improvements

| Limitation                          | Future Improvement                                       |
| ----------------------------------- | -------------------------------------------------------- |
| Frontend has no automated tests     | Add Vitest + Testing Library for React components        |
| Guest entry IDs are unprotected     | Add signed capability tokens for production              |
| No rate limiting on guest endpoints | Add `express-rate-limit`                                 |
| `api.js` is a single 800-line file  | Split into `routes/sessions.js`, `routes/queue.js`, etc. |
| No real-time push for queue updates | Enable Supabase Realtime subscription in frontend        |
| Polling frequency is fixed (5s)     | Adaptive polling / exponential backoff                   |
| Manual schedule slot management     | Add calendar UI for schedule selection                   |
