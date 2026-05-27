const DEFAULT_TIMEZONE = process.env.SCHEDULE_TIMEZONE || "America/Los_Angeles";

const WEEKDAY_TO_INDEX = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6
};

export function getScheduleTimezone() {
  return DEFAULT_TIMEZONE;
}

export function getScheduleNow(now = new Date(), timeZone = DEFAULT_TIMEZONE) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  });

  const parts = formatter.formatToParts(now);
  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value])
  );

  const dayOfWeek = WEEKDAY_TO_INDEX[values.weekday] ?? 0;
  const hour = Number(values.hour);
  const minute = Number(values.minute);
  const minutesSinceMidnight = hour * 60 + minute;
  const dateKey = `${values.year}-${values.month}-${values.day}`;

  return {
    timeZone,
    dayOfWeek,
    minutesSinceMidnight,
    dateKey,
    timeLabel: `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`
  };
}

export function timeStringToMinutes(timeValue) {
  const [hourPart, minutePart] = String(timeValue).slice(0, 5).split(":");
  return Number(hourPart) * 60 + Number(minutePart ?? 0);
}

export function isSlotActiveNow(slot, clock) {
  if (slot.day_of_week !== clock.dayOfWeek) return false;
  const start = timeStringToMinutes(slot.start_time);
  const end = timeStringToMinutes(slot.end_time);
  return (
    clock.minutesSinceMidnight >= start && clock.minutesSinceMidnight < end
  );
}

export function buildScheduleOccurrenceKey(slotId, dateKey) {
  return `${slotId}:${dateKey}`;
}
