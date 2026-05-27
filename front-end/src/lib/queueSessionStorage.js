const STORAGE_KEY = "helpq-active-queue-v1";

export function loadQueueSession() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data?.sessionCode || !data?.queueEntryId) return null;
    return {
      sessionCode: String(data.sessionCode).toUpperCase(),
      queueEntryId: data.queueEntryId,
      studentName: data.studentName ?? "",
      question: data.question ?? "",
      position: data.position ?? null,
      submittedAt: data.submittedAt ?? ""
    };
  } catch {
    return null;
  }
}

export function saveQueueSession(entry) {
  if (!entry?.sessionCode || !entry?.queueEntryId) return;
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      sessionCode: entry.sessionCode.toUpperCase(),
      queueEntryId: entry.queueEntryId,
      studentName: entry.studentName ?? "",
      question: entry.question ?? "",
      position: entry.position ?? null,
      submittedAt: entry.submittedAt ?? ""
    })
  );
}

export function clearQueueSession() {
  localStorage.removeItem(STORAGE_KEY);
}

export function queueSessionPath(sessionCode) {
  const code = sessionCode?.trim().toUpperCase();
  return code ? `/join?code=${encodeURIComponent(code)}` : "/join";
}
