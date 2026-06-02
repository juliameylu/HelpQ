import { supabaseAdmin } from "../config/supabase.js";

export const getProfileById = async (userId) => {
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("id, email, full_name, role, avatar_url")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw error;
  return data;
};

async function attachInstructorMetadata(rows) {
  const list = Array.isArray(rows)
    ? rows.filter(Boolean)
    : [rows].filter(Boolean);
  if (list.length === 0) {
    return Array.isArray(rows) ? [] : null;
  }

  const creatorIds = [
    ...new Set(list.map((row) => row.created_by).filter(Boolean))
  ];
  let profileById = new Map();

  if (creatorIds.length > 0) {
    const { data: profiles, error } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name, email")
      .in("id", creatorIds);

    if (error) throw error;
    profileById = new Map(
      (profiles || []).map((profile) => [profile.id, profile])
    );
  }

  const enriched = list.map((row) => {
    const profile = profileById.get(row.created_by);
    return {
      ...row,
      instructor_name: profile?.full_name || profile?.email || "",
      instructor_email: profile?.email || ""
    };
  });

  return Array.isArray(rows) ? enriched : enriched[0];
}

// CLASSES

export const getClassById = async (classId) => {
  const { data, error } = await supabaseAdmin
    .from("classes")
    .select("*")
    .eq("id", classId)
    .maybeSingle();

  if (error) throw error;
  return attachInstructorMetadata(data);
};

export const getClassByJoinCode = async (joinCode) => {
  const { data, error } = await supabaseAdmin
    .from("classes")
    .select("*")
    .eq("join_code", joinCode)
    .maybeSingle();

  if (error) throw error;
  return attachInstructorMetadata(data);
};

export const createClass = async ({
  title,
  code,
  description = "",
  joinCode,
  createdBy
}) => {
  const { data, error } = await supabaseAdmin
    .from("classes")
    .insert([
      {
        title,
        code,
        description,
        join_code: joinCode,
        created_by: createdBy
      }
    ])
    .select()
    .maybeSingle();

  if (error) throw error;
  return attachInstructorMetadata(data);
};

export const enrollUserInClass = async ({ classId, userId }) => {
  const { data, error } = await supabaseAdmin
    .from("class_enrollments")
    .insert([{ class_id: classId, user_id: userId }])
    .select()
    .maybeSingle();

  if (error) throw error;
  return data;
};

export const isUserEnrolledInClass = async ({ classId, userId }) => {
  const { data, error } = await supabaseAdmin
    .from("class_enrollments")
    .select("class_id")
    .eq("class_id", classId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  return Boolean(data);
};

export const getClassesForUser = async (userId) => {
  const { data: enrollments, error } = await supabaseAdmin
    .from("class_enrollments")
    .select("class_id")
    .eq("user_id", userId);

  if (error) throw error;

  const classIds = (enrollments || []).map((row) => row.class_id);
  if (classIds.length === 0) return [];

  const { data, error: classError } = await supabaseAdmin
    .from("classes")
    .select("*")
    .in("id", classIds)
    .order("created_at", { ascending: false });

  if (classError) throw classError;
  return attachInstructorMetadata(data || []);
};

export const getClassesCreatedBy = async (userId) => {
  const { data, error } = await supabaseAdmin
    .from("classes")
    .select("*")
    .eq("created_by", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return attachInstructorMetadata(data || []);
};

const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

function sortScheduleSlots(slots) {
  return [...slots].sort((a, b) => {
    const dayA = DAY_ORDER.indexOf(a.day_of_week);
    const dayB = DAY_ORDER.indexOf(b.day_of_week);
    if (dayA !== dayB) return dayA - dayB;
    return String(a.start_time).localeCompare(String(b.start_time));
  });
}

export const getScheduleForClassHost = async (classId, hostId) => {
  const { data, error } = await supabaseAdmin
    .from("office_hours_schedules")
    .select("*")
    .eq("class_id", classId)
    .eq("host_id", hostId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data;
};

async function deleteSchedulesByIds(scheduleIds) {
  if (!scheduleIds.length) return;
  const { error } = await supabaseAdmin
    .from("office_hours_schedules")
    .delete()
    .in("id", scheduleIds);
  if (error) throw error;
}

export const replaceOfficeHoursSchedule = async ({
  classId,
  hostId,
  title,
  description = "",
  slots
}) => {
  const { data: existingRows, error: listError } = await supabaseAdmin
    .from("office_hours_schedules")
    .select("id")
    .eq("class_id", classId)
    .eq("host_id", hostId)
    .order("created_at", { ascending: true });

  if (listError) throw listError;

  let scheduleId = existingRows?.[0]?.id ?? null;
  const duplicateIds = (existingRows || []).slice(1).map((row) => row.id);

  if (duplicateIds.length) {
    await deleteSchedulesByIds(duplicateIds);
  }

  if (scheduleId) {
    const { data: updated, error: updateError } = await supabaseAdmin
      .from("office_hours_schedules")
      .update({
        title,
        description,
        updated_at: new Date().toISOString()
      })
      .eq("id", scheduleId)
      .select()
      .maybeSingle();

    if (updateError) throw updateError;

    const { error: clearError } = await supabaseAdmin
      .from("office_hours_schedule_slots")
      .delete()
      .eq("schedule_id", scheduleId);

    if (clearError) throw clearError;

    scheduleId = updated.id;
  } else {
    const { data: created, error: createError } = await supabaseAdmin
      .from("office_hours_schedules")
      .insert([
        {
          class_id: classId,
          host_id: hostId,
          title,
          description
        }
      ])
      .select()
      .maybeSingle();

    if (createError) throw createError;
    scheduleId = created.id;
  }

  const slotRows = slots.map((slot) => ({
    schedule_id: scheduleId,
    day_of_week: slot.dayOfWeek,
    start_time: slot.startTime,
    end_time: slot.endTime
  }));

  const { data: insertedSlots, error: slotError } = await supabaseAdmin
    .from("office_hours_schedule_slots")
    .insert(slotRows)
    .select();

  if (slotError) throw slotError;

  const { data: schedule, error: fetchError } = await supabaseAdmin
    .from("office_hours_schedules")
    .select("*")
    .eq("id", scheduleId)
    .maybeSingle();

  if (fetchError) throw fetchError;

  return {
    ...schedule,
    slots: sortScheduleSlots(insertedSlots || [])
  };
};

export const deleteScheduleSlot = async ({ classId, slotId }) => {
  const { data: slot, error: slotError } = await supabaseAdmin
    .from("office_hours_schedule_slots")
    .select("id, schedule_id")
    .eq("id", slotId)
    .maybeSingle();

  if (slotError) throw slotError;
  if (!slot) return null;

  const { data: schedule, error: scheduleError } = await supabaseAdmin
    .from("office_hours_schedules")
    .select("id, class_id")
    .eq("id", slot.schedule_id)
    .maybeSingle();

  if (scheduleError) throw scheduleError;
  if (!schedule || schedule.class_id !== classId) {
    return null;
  }

  const { error: deleteError } = await supabaseAdmin
    .from("office_hours_schedule_slots")
    .delete()
    .eq("id", slotId);

  if (deleteError) throw deleteError;
  return { deleted: true };
};

function dedupeSlots(slots) {
  const seen = new Set();
  return slots.filter((slot) => {
    const key = `${slot.day_of_week}-${String(slot.start_time).slice(0, 5)}-${String(slot.end_time).slice(0, 5)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export const getOfficeHoursSchedulesForClass = async (classId) => {
  const { data: schedules, error } = await supabaseAdmin
    .from("office_hours_schedules")
    .select("*")
    .eq("class_id", classId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  if (!schedules?.length) return [];

  const scheduleIds = schedules.map((row) => row.id);
  const { data: slots, error: slotError } = await supabaseAdmin
    .from("office_hours_schedule_slots")
    .select("*")
    .in("schedule_id", scheduleIds);

  if (slotError) throw slotError;

  const allSlots = sortScheduleSlots(slots || []);
  const primary = schedules[0];

  return [
    {
      ...primary,
      title: primary.title || "Office Hours",
      description:
        schedules.find((row) => row.description)?.description ||
        primary.description ||
        "",
      slots: dedupeSlots(allSlots)
    }
  ];
};

export const getClassRoster = async (classId) => {
  const { data: enrollments, error } = await supabaseAdmin
    .from("class_enrollments")
    .select("user_id, created_at")
    .eq("class_id", classId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  if (!enrollments?.length) return [];

  const userIds = enrollments.map((row) => row.user_id);
  const { data: profiles, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("id, email, full_name, role, avatar_url")
    .in("id", userIds);

  if (profileError) throw profileError;

  const profileById = new Map((profiles || []).map((row) => [row.id, row]));

  return enrollments
    .map((enrollment) => {
      const profile = profileById.get(enrollment.user_id);
      if (!profile) return null;
      return {
        userId: profile.id,
        email: profile.email,
        fullName: profile.full_name,
        role: profile.role,
        avatarUrl: profile.avatar_url,
        enrolledAt: enrollment.created_at
      };
    })
    .filter(Boolean);
};

export const getClassIdsWithSchedulesForHost = async (hostId) => {
  const { data, error } = await supabaseAdmin
    .from("office_hours_schedules")
    .select("class_id")
    .eq("host_id", hostId);

  if (error) throw error;
  return [...new Set((data || []).map((row) => row.class_id))];
};

export const getActiveSessionForScheduleSlot = async (scheduleSlotId) => {
  const { data, error } = await supabaseAdmin
    .from("sessions")
    .select("*")
    .eq("schedule_slot_id", scheduleSlotId)
    .eq("status", "active")
    .maybeSingle();

  if (error) throw error;
  return data;
};

export const getSessionByOccurrenceKey = async (occurrenceKey) => {
  const { data, error } = await supabaseAdmin
    .from("sessions")
    .select("*")
    .eq("schedule_occurrence_key", occurrenceKey)
    .maybeSingle();

  if (error) throw error;
  return data;
};

export const listActiveScheduledSessionsForClass = async (classId) => {
  const { data, error } = await supabaseAdmin
    .from("sessions")
    .select("*")
    .eq("class_id_uuid", classId)
    .eq("status", "active")
    .not("schedule_slot_id", "is", null);

  if (error) throw error;
  return data || [];
};

// SESSIONS
export const createSession = async (
  hostId,
  title,
  description = "",
  classId = null,
  options = {}
) => {
  const joinCode = Math.random().toString(36).substring(2, 10).toUpperCase();

  const row = { host_id: hostId, join_code: joinCode, title, description };
  if (classId) {
    row.class_id_uuid = classId;
  }
  if (options.scheduleSlotId) {
    row.schedule_slot_id = options.scheduleSlotId;
  }
  if (options.scheduleOccurrenceKey) {
    row.schedule_occurrence_key = options.scheduleOccurrenceKey;
  }

  const { data, error } = await supabaseAdmin
    .from("sessions")
    .insert([row])
    .select();

  if (error) throw error;
  return data[0];
};

export const getSessionByJoinCode = async (
  joinCode,
  { activeOnly = false } = {}
) => {
  let query = supabaseAdmin
    .from("sessions")
    .select("*")
    .eq("join_code", joinCode);

  if (activeOnly) {
    query = query.eq("status", "active");
  }

  const { data, error } = await query.single();

  if (error && error.code !== "PGRST116") throw error;
  return data;
};

export const getSessionById = async (sessionId) => {
  const { data, error } = await supabaseAdmin
    .from("sessions")
    .select("*")
    .eq("id", sessionId)
    .single();

  if (error && error.code !== "PGRST116") throw error;
  return data;
};

export const getSessionByIdForHost = async (sessionId, hostId) => {
  const { data, error } = await supabaseAdmin
    .from("sessions")
    .select("*")
    .eq("id", sessionId)
    .eq("host_id", hostId)
    .single();

  if (error && error.code !== "PGRST116") throw error;
  return data;
};

export const getSessionsByHostId = async (
  hostId,
  { activeOnly = false } = {}
) => {
  let query = supabaseAdmin.from("sessions").select("*").eq("host_id", hostId);

  if (activeOnly) {
    query = query.eq("status", "active");
  }

  const { data, error } = await query.order("created_at", { ascending: false });

  if (error) throw error;
  return data;
};

export const getSessionsByClassId = async (classId) => {
  const { data, error } = await supabaseAdmin
    .from("sessions")
    .select("*")
    .eq("class_id_uuid", classId)
    .eq("status", "active")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data;
};

export const updateSessionStatus = async (sessionId, status) => {
  const { data, error } = await supabaseAdmin
    .from("sessions")
    .update({ status, updated_at: new Date() })
    .eq("id", sessionId)
    .select()
    .maybeSingle();

  if (error) throw error;
  return data;
};

export const closeSessionByHost = async (sessionId, { occurrenceKey } = {}) => {
  const patch = {
    status: "closed",
    updated_at: new Date(),
    host_ended_at: new Date()
  };

  if (occurrenceKey) {
    patch.schedule_occurrence_key = occurrenceKey;
  }

  let { data, error } = await supabaseAdmin
    .from("sessions")
    .update(patch)
    .eq("id", sessionId)
    .select()
    .maybeSingle();

  if (error?.code === "42703" || /host_ended_at/.test(error?.message || "")) {
    const fallbackPatch = {
      status: "closed",
      updated_at: new Date()
    };
    if (occurrenceKey) {
      fallbackPatch.schedule_occurrence_key = occurrenceKey;
    }
    ({ data, error } = await supabaseAdmin
      .from("sessions")
      .update(fallbackPatch)
      .eq("id", sessionId)
      .select()
      .maybeSingle());
  }

  if (error) throw error;
  return data;
};

// QUEUE ENTRIES
export const addQueueEntry = async (sessionId, studentName, question) => {
  const { data, error } = await supabaseAdmin
    .from("queue_entries")
    .insert([{ session_id: sessionId, student_name: studentName, question }])
    .select();

  if (error) throw error;
  return data[0];
};

export const getQueueBySessionId = async (sessionId) => {
  const { data, error } = await supabaseAdmin
    .from("queue_entries")
    .select("*")
    .eq("session_id", sessionId)
    .in("status", ["waiting", "in_progress"])
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data;
};

export const updateQueueEntryStatus = async (entryId, status) => {
  const { data, error } = await supabaseAdmin
    .from("queue_entries")
    .update({ status, updated_at: new Date() })
    .eq("id", entryId)
    .select()
    .maybeSingle();

  if (error) throw error;
  return data;
};

export const removeQueueEntry = async (entryId) => {
  const { data, error } = await supabaseAdmin
    .from("queue_entries")
    .delete()
    .eq("id", entryId)
    .select()
    .maybeSingle();

  if (error) throw error;
  return data;
};

export const getQueueEntryById = async (entryId) => {
  const { data, error } = await supabaseAdmin
    .from("queue_entries")
    .select("id, session_id, status")
    .eq("id", entryId)
    .single();

  if (error && error.code !== "PGRST116") throw error;
  return data;
};

export const getQueuePosition = async (sessionId, entryId) => {
  const { data, error } = await supabaseAdmin
    .from("queue_entries")
    .select("id")
    .eq("session_id", sessionId)
    .in("status", ["waiting", "in_progress"])
    .order("created_at", { ascending: true });

  if (error) throw error;

  const position = data.findIndex((entry) => entry.id === entryId);
  return position !== -1 ? position + 1 : null;
};

export const getQueueStats = async (sessionId) => {
  const { data: queueData, error: queueError } = await supabaseAdmin
    .from("queue_entries")
    .select("status")
    .eq("session_id", sessionId);

  if (queueError) throw queueError;

  const stats = {
    total: queueData.length,
    waiting: queueData.filter((e) => e.status === "waiting").length,
    inProgress: queueData.filter((e) => e.status === "in_progress").length,
    completed: queueData.filter((e) => e.status === "completed").length
  };

  return stats;
};
