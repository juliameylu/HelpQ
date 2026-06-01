# HelpQ — UML Diagrams

**Last updated:** 2026-05-31

The source diagrams are written in [Mermaid](https://mermaid.js.org/) and render inline on GitHub, in VS Code (with Mermaid Preview extension), or at [mermaid.live](https://mermaid.live).

| Diagram | Purpose |
|---------|---------|
| [Class diagram](#class-diagram) | Domain model — persistent entities and service modules |
| [Entity-relationship](#entity-relationship-diagram) | Database schema (Supabase/PostgreSQL) |
| [Sequence — student joins](#sequence-diagram--guest-student-joins-queue) | Guest flow end-to-end |
| [Sequence — host marks done](#sequence-diagram--host-marks-student-done) | Professor queue management |
| [Component diagram](#component-diagram) | System architecture overview |
| [Use case diagram](#use-case-diagram) | Actor interactions |

**Source file:** [`docs/diagrams/helpq-class-diagram.mmd`](diagrams/helpq-class-diagram.mmd)

> Note: Additional UML diagrams for the original SRD are in the root [`UML.md`](../UML.md).

---

## Class Diagram

Domain model showing persisted entities, backend service module, and frontend state.

```mermaid
classDiagram
  direction TB

  class Profile {
    +UUID id
    +String email
    +String fullName
    +String role
    +DateTime createdAt
    role: "student" | "professor"
  }

  class Class {
    +UUID id
    +String title
    +String code
    +String joinCode
    +UUID createdBy
    +DateTime createdAt
  }

  class Session {
    +UUID id
    +String hostId
    +UUID classId
    +String joinCode
    +String title
    +String status
    +DateTime createdAt
    status: "active" | "closed"
  }

  class QueueEntry {
    +UUID id
    +UUID sessionId
    +String studentName
    +String question
    +String status
    +DateTime createdAt
    status: "waiting" | "in_progress" | "completed"
  }

  class OfficeHoursSchedule {
    +UUID id
    +UUID classId
    +UUID hostId
    +String title
    slots: ScheduleSlot[]
  }

  class ScheduleSlot {
    +UUID id
    +Int dayOfWeek
    +Time startTime
    +Time endTime
  }

  class DbService {
    <<service>>
    +getSessionByJoinCode(code)
    +addQueueEntry(sessionId, name, q)
    +getQueueBySessionId(id)
    +updateQueueEntryStatus(id, status)
    +removeQueueEntry(id)
  }

  class GuestSessionState {
    <<localStorage>>
    +String entryId
    +String sessionCode
    +String studentName
    +String question
    +Int position
  }

  Profile "1" --> "0..*" Session : hosts
  Profile "1" --> "0..*" Class : creates
  Class "1" --> "0..*" Session : classId (optional)
  Class "1" --> "0..*" OfficeHoursSchedule : has
  OfficeHoursSchedule "1" --> "1..*" ScheduleSlot : has
  Session "1" --> "0..*" QueueEntry : contains
  GuestSessionState ..> QueueEntry : maps by entryId
```

---

## Entity-Relationship Diagram

Tables in Supabase PostgreSQL (current schema from `supabase/migrations/`).

```mermaid
erDiagram
  PROFILES {
    uuid id PK
    text email
    text full_name
    text role
    timestamp created_at
  }

  CLASSES {
    uuid id PK
    text title
    text code
    text description
    text join_code UK
    uuid created_by FK
    timestamp created_at
  }

  CLASS_ENROLLMENTS {
    uuid class_id FK
    uuid user_id FK
    timestamp enrolled_at
  }

  OFFICE_HOURS_SCHEDULES {
    uuid id PK
    uuid class_id FK
    uuid host_id FK
    text title
    text description
    timestamp created_at
  }

  OFFICE_HOURS_SCHEDULE_SLOTS {
    uuid id PK
    uuid schedule_id FK
    int day_of_week
    time start_time
    time end_time
  }

  SESSIONS {
    uuid id PK
    text host_id FK
    uuid class_id_uuid FK
    varchar join_code UK
    varchar title
    text description
    varchar status
    uuid schedule_slot_id FK
    timestamp created_at
    timestamp host_ended_at
  }

  QUEUE_ENTRIES {
    uuid id PK
    uuid session_id FK
    varchar student_name
    text question
    varchar status
    timestamp created_at
    timestamp updated_at
  }

  PROFILES ||--o{ CLASSES : creates
  CLASSES ||--o{ CLASS_ENROLLMENTS : has
  PROFILES ||--o{ CLASS_ENROLLMENTS : enrolled_in
  CLASSES ||--o{ OFFICE_HOURS_SCHEDULES : has
  OFFICE_HOURS_SCHEDULES ||--o{ OFFICE_HOURS_SCHEDULE_SLOTS : has
  SESSIONS ||--o{ QUEUE_ENTRIES : contains
  CLASSES ||--o{ SESSIONS : classId
  OFFICE_HOURS_SCHEDULE_SLOTS ||--o{ SESSIONS : schedule_slot_id
```

---

## Sequence Diagram — Guest Student Joins Queue

```mermaid
sequenceDiagram
  actor Student
  participant LP as LandingPage
  participant GJP as GuestJoinPage
  participant API as front-end/api.js
  participant BE as Express /api/guest
  participant DB as Supabase DB

  Student->>LP: Opens app (no login)
  LP->>GJP: Click "Join a session" → /join
  Student->>GJP: Types session code DEMO01
  GJP->>API: guestGetSession("DEMO01")
  API->>BE: GET /api/guest/sessions/join/DEMO01
  BE->>DB: SELECT session WHERE join_code = 'DEMO01'
  DB-->>BE: session row
  BE-->>API: { id, title, status }
  API-->>GJP: Session found — "CSC 307 Office Hours"

  Student->>GJP: Enters name + question → Submit
  GJP->>API: guestJoinQueue(sessionId, { name, question })
  API->>BE: POST /api/guest/sessions/:id/join
  BE->>DB: INSERT INTO queue_entries
  DB-->>BE: new entry row
  BE->>DB: SELECT queue for position
  DB-->>BE: ordered entries
  BE-->>API: { entry, position: 3 }
  API-->>GJP: Show "You're #3 in line"
  GJP->>GJP: Save to localStorage

  loop Poll every 5 seconds
    GJP->>API: guestGetQueue(sessionId)
    API->>BE: GET /api/guest/sessions/:id/queue
    BE->>DB: SELECT waiting + in_progress
    DB-->>BE: entries
    BE-->>GJP: Updated entries + positions
  end
```

---

## Sequence Diagram — Host Marks Student Done

```mermaid
sequenceDiagram
  actor Host
  participant VQP as ViewQueuePage
  participant API as front-end/api.js
  participant BE as Express /api
  participant SB as Supabase Auth
  participant DB as Supabase DB

  Host->>VQP: Opens /sessions/DEMO01/manage (signed in)
  VQP->>API: getSession("DEMO01") + getQueue("DEMO01")
  API->>BE: GET /api/sessions/join/DEMO01 (public)
  BE->>DB: SELECT session
  DB-->>BE: session row
  API->>BE: GET /api/sessions/:id/queue (auth'd)
  BE->>SB: getUser(token)
  SB-->>BE: user OK
  BE->>DB: SELECT queue entries
  DB-->>BE: entries
  BE-->>VQP: queue data

  Host->>VQP: Click "Start helping" on Alex R.
  VQP->>API: updateQueueEntry(entryId, "in_progress")
  API->>BE: PATCH /api/queue/:entryId/status { status: "in_progress" }
  BE->>SB: verify token
  BE->>DB: getSessionByIdForHost (ownership check)
  DB-->>BE: session (host verified)
  BE->>DB: UPDATE queue_entries SET status = 'in_progress'
  DB-->>BE: updated entry
  BE-->>VQP: updated entry
  VQP->>VQP: Refresh queue display

  Host->>VQP: Click "Mark done"
  VQP->>API: updateQueueEntry(entryId, "completed")
  API->>BE: PATCH /api/queue/:entryId/status { status: "completed" }
  BE->>DB: UPDATE → completed
  DB-->>BE: updated entry
  BE-->>VQP: entry removed from active queue
```

---

## Component Diagram

System architecture — tech stack and layers.

```mermaid
flowchart TB
  subgraph Browser["Browser (React SPA)"]
    Landing["LandingPage\n/"]
    GuestJoin["GuestJoinPage\n/join"]
    Dashboard["HomePage + ViewQueuePage\n(auth'd professor flow)"]
    Auth["LoginPage / Supabase Auth"]
    API["front-end/src/api.js\nguest + auth'd API clients"]
    Ctx["AppContext + localStorage\nuser, sessions, classes"]
  end

  subgraph Backend["Express Backend :3001"]
    Health["GET /health"]
    GuestRoutes["routes/guest.js\n(no auth)"]
    ApiRoutes["routes/api.js\n(requireAuth)"]
    AuthMW["middleware/auth.js\nrequireAuth / requireStudent / requireProfessor"]
    DB["services/db.js\nSupabase query layer"]
    Validation["utils/validation.js\nutils/errors.js"]
  end

  subgraph Supabase["Supabase (Cloud)"]
    SBAuth["Auth\nemail/password JWT"]
    PG[("PostgreSQL\nprofiles, classes, sessions,\nqueue_entries, schedules")]
  end

  GuestJoin --> API
  Dashboard --> API
  API -->|"HTTP /api/guest/*"| GuestRoutes
  API -->|"HTTP /api/* + Bearer"| ApiRoutes
  ApiRoutes --> AuthMW
  AuthMW -->|"getUser(token)"| SBAuth
  GuestRoutes --> DB
  ApiRoutes --> DB
  DB --> Validation
  DB -->|"Supabase JS client"| PG
  Auth -->|"signInWithPassword"| SBAuth
  Ctx --> Dashboard
```

---

## Use Case Diagram

```mermaid
flowchart LR
  Student(["👤 Student\n(no account needed)"])
  Professor(["👤 Professor / TA\n(account required)"])

  subgraph HelpQ
    UC1["Open landing page"]
    UC2["Join queue with session code"]
    UC3["View queue position + status"]
    UC4["Leave queue"]
    UC5["Sign up / Sign in"]
    UC6["Create a class"]
    UC7["Start office hours session"]
    UC8["View + manage queue"]
    UC9["Mark student active / done"]
    UC10["End session"]
    UC11["Set up recurring schedule"]
  end

  Student --> UC1
  Student --> UC2
  Student --> UC3
  Student --> UC4
  Student --> UC5

  Professor --> UC5
  Professor --> UC6
  Professor --> UC7
  Professor --> UC8
  Professor --> UC9
  Professor --> UC10
  Professor --> UC11
```
