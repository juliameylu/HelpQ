const WEEKDAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday"
];

export const WEEKDAY_OPTIONS = [
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
  { value: 0, label: "Sunday" }
];

export function weekdayLabel(dayOfWeek) {
  return WEEKDAY_NAMES[dayOfWeek] ?? "Day";
}

export function formatTime12h(time24) {
  if (!time24) return "";
  const [hourPart, minutePart] = String(time24).slice(0, 5).split(":");
  let hour = Number(hourPart);
  const minute = minutePart ?? "00";
  const suffix = hour >= 12 ? "PM" : "AM";
  hour %= 12;
  if (hour === 0) hour = 12;
  return `${hour}:${minute} ${suffix}`;
}

export function formatScheduleSlot(slot) {
  const day = weekdayLabel(slot.dayOfWeek ?? slot.day_of_week);
  const start = formatTime12h(slot.startTime ?? slot.start_time);
  const end = formatTime12h(slot.endTime ?? slot.end_time);
  return `Every ${day}, ${start} – ${end}`;
}

export function createEmptySlot() {
  return { dayOfWeek: 1, startTime: "14:00", endTime: "16:00" };
}

/** Week columns left → right (Sunday first). */
export const CALENDAR_DAY_ORDER = [0, 1, 2, 3, 4, 5, 6];

/** Fixed visible hours on the weekly calendar (5:00 AM through midnight). */
export const CALENDAR_FIXED_START_MINUTES = 5 * 60;
export const CALENDAR_FIXED_END_MINUTES = 24 * 60;

export const CALENDAR_DAY_LABELS = {
  0: "Sun",
  1: "Mon",
  2: "Tue",
  3: "Wed",
  4: "Thu",
  5: "Fri",
  6: "Sat"
};

export function timeToMinutes(time24) {
  const [hourPart, minutePart] = String(time24).slice(0, 5).split(":");
  return Number(hourPart) * 60 + Number(minutePart ?? 0);
}

export function flattenSchedulesToEvents(schedules) {
  return (schedules || []).flatMap((schedule) =>
    (schedule.slots || []).map((slot) => ({
      id: slot.id,
      scheduleId: schedule.id,
      title: schedule.title,
      dayOfWeek: slot.dayOfWeek,
      startTime: slot.startTime,
      endTime: slot.endTime
    }))
  );
}

export function getCalendarBounds() {
  return {
    startMinutes: CALENDAR_FIXED_START_MINUTES,
    endMinutes: CALENDAR_FIXED_END_MINUTES
  };
}

export function validateScheduleSlots(slots) {
  if (!slots.length) {
    return "Add at least one weekly time slot.";
  }

  for (let i = 0; i < slots.length; i += 1) {
    const slot = slots[i];
    if (!slot.startTime || !slot.endTime) {
      return `Slot ${i + 1}: enter start and end times.`;
    }
    if (slot.endTime <= slot.startTime) {
      return `Slot ${i + 1}: end time must be after start time.`;
    }
  }

  return "";
}
