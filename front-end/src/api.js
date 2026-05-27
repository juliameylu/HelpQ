/**
 * HelpQ Supabase API (packages/express-backend `npm run dev` → port 3001).
 * In dev, leave VITE_API_URL unset and use Vite proxy to `/api`.
 */

import { supabase } from "./lib/supabaseClient.js";

const API_PREFIX = "/api";

function apiBase() {
  return (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");
}

function apiPath(path) {
  return `${apiBase()}${API_PREFIX}${path}`;
}

async function jsonFetch(url, options = {}) {
  const { headers, ...rest } = options;
  const authHeaders = {};

  if (supabase) {
    const {
      data: { session }
    } = await supabase.auth.getSession();
    if (session?.access_token) {
      authHeaders.Authorization = `Bearer ${session.access_token}`;
    }
  }

  const res = await fetch(url, {
    ...rest,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...authHeaders,
      ...headers
    }
  });
  let body = {};
  const text = await res.text();
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = {};
    }
  }
  if (!res.ok) {
    const apiMessage =
      typeof body.error === "string"
        ? body.error
        : body.error?.message;
    const err = new Error(apiMessage || res.statusText || "Request failed");
    err.status = res.status;
    err.body = body;
    throw err;
  }
  return body;
}

function fromApiQueueStatus(status) {
  if (status === "in_progress") return "helping";
  if (status === "completed") return "done";
  return status;
}

function toApiQueueStatus(status) {
  if (status === "helping") return "in_progress";
  if (status === "done") return "completed";
  return status;
}

export function normalizeSession(row) {
  if (!row) return null;
  const joinCode = row.join_code ?? row.joinCode ?? row.sessionCode ?? "";
  const apiStatus = row.status ?? "active";
  return {
    id: row.id,
    classId: row.class_id_uuid ?? row.class_id ?? row.classId ?? null,
    hostId: row.host_id ?? row.hostId,
    title: row.title,
    description: row.description ?? "",
    sessionCode: String(joinCode).toUpperCase(),
    joinCode: String(joinCode).toUpperCase(),
    status:
      apiStatus === "active"
        ? "live"
        : apiStatus === "closed"
          ? "ended"
          : apiStatus,
    createdAt: row.created_at ?? row.createdAt,
    queueCount: row.queueCount ?? 0
  };
}

export function normalizeClass(row) {
  if (!row) return null;
  return {
    id: row.id,
    title: row.title,
    code: row.code,
    description: row.description ?? "",
    joinCode: (row.join_code ?? row.joinCode ?? "").toUpperCase(),
    createdBy: row.created_by ?? row.createdBy,
    createdAt: row.created_at ?? row.createdAt
  };
}

function normalizeQueueEntry(row, index = 0) {
  return {
    id: row.id,
    sessionId: row.session_id ?? row.sessionId,
    studentName: row.student_name ?? row.studentName,
    question: row.question,
    status: fromApiQueueStatus(row.status),
    joinedAt: row.created_at ?? row.joinedAt,
    position: row.position ?? index + 1
  };
}

async function resolveSessionByJoinCode(joinCode, { signal } = {}) {
  const code = joinCode.trim().toUpperCase();
  const row = await jsonFetch(
    apiPath(`/sessions/join/${encodeURIComponent(code)}`),
    { signal }
  );
  return normalizeSession(row);
}

// —— Sessions ——

export async function createSession(
  { hostId, title, description, classId },
  { signal } = {}
) {
  const row = await jsonFetch(apiPath("/sessions"), {
    method: "POST",
    body: JSON.stringify({ hostId, title, description, classId }),
    signal
  });
  return { session: normalizeSession(row) };
}

export async function getSession(sessionCode, { signal } = {}) {
  const session = await resolveSessionByJoinCode(sessionCode, { signal });
  return { session };
}

export async function getSessionsByHost(hostId, { signal } = {}) {
  const rows = await jsonFetch(
    apiPath(`/sessions?hostId=${encodeURIComponent(hostId)}`),
    { signal }
  );
  return (Array.isArray(rows) ? rows : []).map(normalizeSession);
}

export async function getSessionsByClass(classId, { signal } = {}) {
  const rows = await jsonFetch(
    apiPath(`/classes/${encodeURIComponent(classId)}/sessions`),
    {
      signal
    }
  );
  return (Array.isArray(rows) ? rows : []).map(normalizeSession);
}

export function normalizeRosterMember(row) {
  if (!row) return null;
  return {
    userId: row.userId ?? row.user_id,
    email: row.email,
    fullName: row.fullName ?? row.full_name ?? "",
    role: row.role,
    avatarUrl: row.avatarUrl ?? row.avatar_url ?? null,
    enrolledAt: row.enrolledAt ?? row.enrolled_at
  };
}

export async function getClassRoster(classId, { signal } = {}) {
  const rows = await jsonFetch(
    apiPath(`/classes/${encodeURIComponent(classId)}/roster`),
    { signal }
  );
  return (Array.isArray(rows) ? rows : [])
    .map(normalizeRosterMember)
    .filter(Boolean);
}

function normalizeScheduleSlot(row) {
  if (!row) return null;
  return {
    id: row.id,
    scheduleId: row.scheduleId ?? row.schedule_id,
    dayOfWeek: row.dayOfWeek ?? row.day_of_week,
    startTime: String(row.startTime ?? row.start_time ?? "").slice(0, 5),
    endTime: String(row.endTime ?? row.end_time ?? "").slice(0, 5)
  };
}

export function normalizeOfficeHoursSchedule(row) {
  if (!row) return null;
  const slots = (row.slots || [])
    .map(normalizeScheduleSlot)
    .filter(Boolean);
  return {
    id: row.id,
    classId: row.classId ?? row.class_id,
    hostId: row.hostId ?? row.host_id,
    title: row.title,
    description: row.description ?? "",
    createdAt: row.createdAt ?? row.created_at,
    slots
  };
}

export async function getOfficeHoursSchedules(classId, { signal } = {}) {
  const rows = await jsonFetch(
    apiPath(`/classes/${encodeURIComponent(classId)}/schedules`),
    { signal }
  );
  return (Array.isArray(rows) ? rows : [])
    .map(normalizeOfficeHoursSchedule)
    .filter(Boolean);
}

export async function createOfficeHoursSchedule(
  classId,
  { title, description, slots },
  { signal } = {}
) {
  const row = await jsonFetch(
    apiPath(`/classes/${encodeURIComponent(classId)}/schedules`),
    {
      method: "POST",
      body: JSON.stringify({ title, description, slots }),
      signal
    }
  );
  return normalizeOfficeHoursSchedule(row);
}

export async function deleteScheduleSlot(classId, slotId, { signal } = {}) {
  return jsonFetch(
    apiPath(
      `/classes/${encodeURIComponent(classId)}/schedules/slots/${encodeURIComponent(slotId)}`
    ),
    { method: "DELETE", signal }
  );
}

// —— Classes ——

export async function getMyClasses({ signal } = {}) {
  const rows = await jsonFetch(apiPath("/me/classes"), { signal });
  return (Array.isArray(rows) ? rows : []).map(normalizeClass);
}

export async function createClass(
  { title, code, description, joinCode },
  { signal } = {}
) {
  const row = await jsonFetch(apiPath("/classes"), {
    method: "POST",
    body: JSON.stringify({ title, code, description, joinCode }),
    signal
  });
  return { course: normalizeClass(row) };
}

export async function joinClass(joinCode, { signal } = {}) {
  const row = await jsonFetch(apiPath("/classes/join"), {
    method: "POST",
    body: JSON.stringify({ joinCode }),
    signal
  });
  return { course: normalizeClass(row) };
}

export async function getSessionStats(sessionId, { signal } = {}) {
  return jsonFetch(apiPath(`/sessions/${sessionId}/stats`), { signal });
}

export async function endSession(sessionId, { signal } = {}) {
  const row = await jsonFetch(apiPath(`/sessions/${sessionId}/status`), {
    method: "PATCH",
    body: JSON.stringify({ status: "closed" }),
    signal
  });
  return normalizeSession(row);
}

export async function enrichSessionsWithQueueCounts(sessions, { signal } = {}) {
  return Promise.all(
    sessions.map(async (session) => {
      try {
        const stats = await getSessionStats(session.id, { signal });
        return {
          ...session,
          queueCount: (stats.waiting ?? 0) + (stats.inProgress ?? 0)
        };
      } catch {
        return session;
      }
    })
  );
}

// —— Queue ——

export async function getQueue(sessionCode, { signal } = {}) {
  const session = await resolveSessionByJoinCode(sessionCode, { signal });
  const rows = await jsonFetch(apiPath(`/sessions/${session.id}/queue`), {
    signal
  });
  const list = Array.isArray(rows) ? rows : [];
  return {
    queue: list.map((entry, index) => normalizeQueueEntry(entry, index))
  };
}

export async function joinQueue(
  sessionCode,
  { studentName, question },
  { signal } = {}
) {
  const session = await resolveSessionByJoinCode(sessionCode, { signal });
  const entry = await jsonFetch(apiPath(`/sessions/${session.id}/queue`), {
    method: "POST",
    body: JSON.stringify({ studentName, question }),
    signal
  });
  const queue = await getQueue(sessionCode, { signal });
  const normalized = normalizeQueueEntry(entry);
  const position =
    queue.queue.find((row) => row.id === normalized.id)?.position ??
    queue.queue.length;
  return { queueEntry: normalized, position };
}

export async function updateQueueEntry(entryId, status, { signal } = {}) {
  const row = await jsonFetch(apiPath(`/queue/${entryId}/status`), {
    method: "PATCH",
    body: JSON.stringify({ status: toApiQueueStatus(status) }),
    signal
  });
  return { queueEntry: normalizeQueueEntry(row) };
}

export async function deleteQueueEntry(entryId, { signal } = {}) {
  return jsonFetch(apiPath(`/queue/${entryId}`), {
    method: "DELETE",
    signal
  });
}

export async function checkApiHealth({ signal } = {}) {
  return jsonFetch(`${apiBase()}/health`, { signal });
}
