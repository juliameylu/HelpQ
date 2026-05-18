# HelpQ — UML Diagrams

Architecture and domain models for the HelpQ office-hours queue system. Render Mermaid blocks in [Mermaid Live](https://mermaid.live), GitHub, or VS Code with a Mermaid preview extension.

| Need | Diagram |
|------|---------|
| Architecture / tech stack | [Component](#1-component-diagram-system-architecture) |
| OOP / domain model | [Class](#2-class-diagram-domain-model) |
| Database design | [ER](#3-entity-relationship-diagram-database) |
| Key workflow | [Sequence — join queue](#4-sequence-diagram--student-joins-queue) |
| Requirements / actors | [Use case](#5-use-case-diagram-actors) |

---

## 1. Component diagram (system architecture)

React app, Express API, and Supabase.

```mermaid
flowchart TB
  subgraph Client["Browser"]
    UI["React Frontend\n(Vite, React Router)"]
    Ctx["AppContext\n+ localStorage"]
    API["api.js"]
    UI --> Ctx
    UI --> API
  end

  subgraph Server["Express Backend :3001"]
    Routes["routes/api.js"]
    DBLayer["services/db.js"]
    Routes --> DBLayer
  end

  subgraph Data["Supabase (PostgreSQL)"]
    Sessions[("sessions")]
    Queue[("queue_entries")]
    Sessions --> Queue
  end

  API -->|"HTTP /api/*"| Routes
  DBLayer -->|"Supabase JS client"| Sessions
  Ctx -.->|"classes, auth, notifications\n(not in DB yet)"| UI
```

---

## 2. Class diagram (domain model)

**Persisted in Supabase:** `Session`, `QueueEntry`. **Frontend / local only (for now):** `User`, `Course`, `Notification`.

```mermaid
classDiagram
  direction TB

  class Session {
    +UUID id
    +String hostId
    +String joinCode
    +String title
    +String description
    +String status
    +String classId
    +DateTime createdAt
  }

  class QueueEntry {
    +UUID id
    +UUID sessionId
    +String studentName
    +String question
    +String status
    +Integer position
    +DateTime createdAt
  }

  class User {
    +String email
    +String name
    +String role
    +String initials
  }

  class Course {
    +String id
    +String code
    +String title
    +String joinCode
    +String instructor
  }

  class Notification {
    +String id
    +String title
    +String body
    +Boolean unread
    +DateTime createdAt
  }

  Session "1" --> "N" QueueEntry : contains
  User "1" --> "N" Session : hosts
  Course "1" --> "N" Session : classId
  User "1" --> "N" Course : enrolls
  User "1" --> "N" Notification : recieves
  User "1" --> "N" QueueEntry : creates

  note for Session "Persisted in Supabase"
  note for QueueEntry "Persisted in Supabase"
  note for User "Demo login + localStorage"
  note for Course "Static catalog + localStorage"
  note for Notification "localStorage only"
```

**Queue entry statuses (API):** `waiting` → `in_progress` → `completed`. The UI maps `in_progress` to “helping” where needed.

---

## 3. Entity-relationship diagram (database)

Tables in Supabase today.

```mermaid
erDiagram
  SESSIONS ||--o{ QUEUE_ENTRIES : has

  SESSIONS {
    uuid id PK
    text host_id
    varchar join_code UK
    varchar title
    text description
    varchar status
    text class_id
    timestamp created_at
    timestamp updated_at
  }

  QUEUE_ENTRIES {
    uuid id PK
    uuid session_id FK
    varchar student_name
    text question
    varchar status
    integer position
    timestamp created_at
    timestamp updated_at
  }
```

---

## 4. Sequence diagram — student joins queue

End-to-end flow through the API.

```mermaid
sequenceDiagram
  actor Student
  participant UI as JoinQueuePage
  participant API as api.js
  participant Express as Express /api
  participant SB as Supabase

  Student->>UI: Enter name, question, join code
  UI->>API: getSession(joinCode)
  API->>Express: GET /sessions/join/:joinCode
  Express->>SB: SELECT session
  SB-->>Express: session row
  Express-->>API: session
  API-->>UI: session validated

  UI->>API: joinQueue(joinCode, name, question)
  API->>Express: POST /sessions/:id/queue
  Express->>SB: INSERT queue_entry
  SB-->>Express: entry
  Express-->>API: queueEntry
  API->>Express: GET /sessions/:id/queue
  Express-->>API: queue + position
  API-->>UI: position, status
  UI-->>Student: Show place in line
```

---

## 5. Use case diagram (actors)

High-level capabilities by role.

```mermaid
flowchart LR
  subgraph Students
    UC1[Join class]
    UC2[Join queue]
    UC3[View notifications]
  end

  subgraph Instructors
    UC4[Create office hours]
    UC5[Manage queue]
    UC6[Copy join code]
  end

  Student((Student)) --> UC1
  Student --> UC2
  Student --> UC3
  Instructor((Instructor)) --> UC4
  Instructor --> UC5
  Instructor --> UC6
```
