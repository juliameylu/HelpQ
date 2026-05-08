import { supabaseAdmin } from "../config/supabase.js";

// SESSIONS
export const createSession = async (hostId, title, description = "") => {
  // Generate a random join code
  const joinCode = Math.random().toString(36).substring(2, 10).toUpperCase();

  const { data, error } = await supabaseAdmin
    .from("sessions")
    .insert([{ host_id: hostId, join_code: joinCode, title, description }])
    .select();

  if (error) throw error;
  return data[0];
};

export const getSessionByJoinCode = async (joinCode) => {
  const { data, error } = await supabaseAdmin
    .from("sessions")
    .select("*")
    .eq("join_code", joinCode)
    .single();

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

export const getSessionsByHostId = async (hostId) => {
  const { data, error } = await supabaseAdmin
    .from("sessions")
    .select("*")
    .eq("host_id", hostId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data;
};

export const updateSessionStatus = async (sessionId, status) => {
  const { data, error } = await supabaseAdmin
    .from("sessions")
    .update({ status, updated_at: new Date() })
    .eq("id", sessionId)
    .select();

  if (error) throw error;
  return data[0];
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
    .select();

  if (error) throw error;
  return data[0];
};

export const removeQueueEntry = async (entryId) => {
  const { error } = await supabaseAdmin
    .from("queue_entries")
    .delete()
    .eq("id", entryId);

  if (error) throw error;
  return true;
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
