import { useMemo, useState } from "react";
import { Trash2 } from "lucide-react";
import {
  CALENDAR_DAY_LABELS,
  CALENDAR_DAY_ORDER,
  flattenSchedulesToEvents,
  formatTime12h,
  getCalendarBounds,
  timeToMinutes
} from "../../lib/scheduleFormatters.js";

const HOUR_HEIGHT_PX = 44;

function formatHourLabel(hour) {
  if (hour === 24) return "12 AM";
  return formatTime12h(`${String(hour).padStart(2, "0")}:00`);
}

function buildHourLabels(startMinutes, endMinutes) {
  const labels = [];
  const firstHour = Math.floor(startMinutes / 60);
  const lastHour = Math.floor(endMinutes / 60);
  for (let hour = firstHour; hour <= lastHour; hour += 1) {
    labels.push({
      hour,
      label: formatHourLabel(hour)
    });
  }
  return labels;
}

function eventLayout(event, startMinutes, totalMinutes) {
  const eventStart = timeToMinutes(event.startTime);
  const eventEnd = timeToMinutes(event.endTime);
  const visibleStart = Math.max(eventStart, startMinutes);
  const visibleEnd = Math.min(eventEnd, startMinutes + totalMinutes);

  if (visibleEnd <= visibleStart) {
    return null;
  }

  const top = ((visibleStart - startMinutes) / totalMinutes) * 100;
  const height = ((visibleEnd - visibleStart) / totalMinutes) * 100;

  return { top, height: Math.max(height, 3) };
}

export default function WeeklyCalendarView({
  schedules = [],
  loading = false,
  error = "",
  emptyMessage = "No weekly schedule set yet.",
  canDelete = false,
  onDeleteSlot
}) {
  const [deletingId, setDeletingId] = useState(null);
  const [deleteError, setDeleteError] = useState("");

  const events = useMemo(
    () => flattenSchedulesToEvents(schedules),
    [schedules]
  );
  const { startMinutes, endMinutes } = useMemo(() => getCalendarBounds(), []);
  const totalMinutes = endMinutes - startMinutes;
  const gridHeight = (totalMinutes / 60) * HOUR_HEIGHT_PX;
  const hourLabels = useMemo(
    () => buildHourLabels(startMinutes, endMinutes),
    [startMinutes, endMinutes]
  );

  const scheduleMeta = schedules[0];

  async function handleDelete(slotId) {
    if (!onDeleteSlot) return;
    setDeleteError("");
    setDeletingId(slotId);
    try {
      await onDeleteSlot(slotId);
    } catch (err) {
      setDeleteError(err.message || "Could not remove this time block.");
    } finally {
      setDeletingId(null);
    }
  }

  if (loading) {
    return <p className="field-message">Loading schedule…</p>;
  }

  if (error) {
    return <p className="field-message error">{error}</p>;
  }

  if (events.length === 0) {
    return <p className="field-message">{emptyMessage}</p>;
  }

  return (
    <div className="weekly-calendar-wrap">
      {scheduleMeta?.description ? (
        <p className="card-description weekly-calendar-description">
          {scheduleMeta.description}
        </p>
      ) : null}

      <div
        className="weekly-calendar"
        style={{ "--hour-height": `${HOUR_HEIGHT_PX}px` }}>
        <div className="weekly-calendar-header">
          <div className="weekly-calendar-gutter" aria-hidden="true" />
          {CALENDAR_DAY_ORDER.map((day) => (
            <div className="weekly-calendar-day-label" key={day}>
              {CALENDAR_DAY_LABELS[day]}
            </div>
          ))}
        </div>

        <div className="weekly-calendar-scroll">
          <div className="weekly-calendar-body">
            <div
              className="weekly-calendar-times"
              style={{ height: `${gridHeight}px` }}>
              {hourLabels.map(({ hour, label }) => (
                <div
                  className="weekly-calendar-time-label"
                  key={hour}
                  style={{
                    top: `${((hour * 60 - startMinutes) / totalMinutes) * 100}%`
                  }}>
                  {label}
                </div>
              ))}
            </div>

            <div
              className="weekly-calendar-grid"
              style={{ height: `${gridHeight}px` }}>
              {CALENDAR_DAY_ORDER.map((day) => (
                <div className="weekly-calendar-column" key={day}>
                  {events
                    .filter((event) => event.dayOfWeek === day)
                    .map((event) => {
                      const layout = eventLayout(
                        event,
                        startMinutes,
                        totalMinutes
                      );
                      if (!layout) return null;

                      return (
                        <div
                          className="weekly-calendar-event"
                          key={event.id}
                          style={{
                            top: `${layout.top}%`,
                            height: `${layout.height}%`
                          }}
                          title={`${event.title}: ${formatTime12h(event.startTime)} – ${formatTime12h(event.endTime)}`}>
                          <span className="weekly-calendar-event-time">
                            {formatTime12h(event.startTime)} –{" "}
                            {formatTime12h(event.endTime)}
                          </span>
                          {canDelete ? (
                            <button
                              aria-label={`Remove ${formatTime12h(event.startTime)} block`}
                              className="weekly-calendar-event-delete"
                              disabled={deletingId === event.id}
                              onClick={() => handleDelete(event.id)}
                              type="button">
                              <Trash2 size={14} />
                            </button>
                          ) : null}
                        </div>
                      );
                    })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {deleteError ? (
        <p className="field-message error" role="alert">
          {deleteError}
        </p>
      ) : null}
    </div>
  );
}
