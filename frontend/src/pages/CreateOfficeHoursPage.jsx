import { useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { CalendarClock, Plus, Radio, Trash2 } from "lucide-react";
import BackLink from "../components/BackLink.jsx";
import DashboardLayout from "../components/DashboardLayout.jsx";
import { createOfficeHoursSchedule } from "../api.js";
import { useApp } from "../context/useApp.js";
import {
  createEmptySlot,
  validateScheduleSlots,
  WEEKDAY_OPTIONS
} from "../lib/scheduleFormatters.js";

export default function CreateOfficeHoursPage() {
  const { classId } = useParams();
  const navigate = useNavigate();
  const { getClassById, addOfficeHourSession } = useApp();
  const course = getClassById(classId);

  const [title, setTitle] = useState("Office Hours");
  const [description, setDescription] = useState("");
  const [slots, setSlots] = useState([createEmptySlot()]);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [startingLive, setStartingLive] = useState(false);

  if (!course) {
    return <Navigate replace to="/" />;
  }

  function updateSlot(index, patch) {
    setSlots((current) =>
      current.map((slot, i) => (i === index ? { ...slot, ...patch } : slot))
    );
  }

  function addSlot() {
    setSlots((current) => [...current, createEmptySlot()]);
  }

  function removeSlot(index) {
    setSlots((current) =>
      current.length === 1 ? current : current.filter((_, i) => i !== index)
    );
  }

  async function handleSaveSchedule(event) {
    event.preventDefault();
    const slotError = validateScheduleSlots(slots);
    if (slotError) {
      setError(slotError);
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      await createOfficeHoursSchedule(classId, {
        title: title.trim(),
        description: description.trim(),
        slots
      });
      navigate(`/classes/${classId}`, {
        state: { scheduleSaved: true }
      });
    } catch (err) {
      setError(err.message || "Could not save schedule");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleStartLive(event) {
    event.preventDefault();
    setStartingLive(true);
    setError("");
    try {
      const session = await addOfficeHourSession({
        classId,
        title,
        description
      });
      if (session.sessionCode) {
        navigate(`/sessions/${session.sessionCode}/manage`);
      } else {
        navigate(`/classes/${classId}`);
      }
    } catch (err) {
      setError(err.message || "Could not create session");
    } finally {
      setStartingLive(false);
    }
  }

  return (
    <DashboardLayout>
      <div className="page-stack standalone-page">
        <BackLink to={`/classes/${classId}`}>Back to class</BackLink>
        <header className="page-header-row">
          <div>
            <h1>Create Office Hours</h1>
            <p>
              {course.title} · {course.code}
            </p>
          </div>
        </header>

        <form className="card form-card" onSubmit={handleSaveSchedule}>
          <label className="form-label" htmlFor="ohTitle">
            Session title
          </label>
          <input
            className="form-input"
            id="ohTitle"
            onChange={(e) => setTitle(e.target.value)}
            required
            value={title}
          />

          <label className="form-label" htmlFor="ohDescription">
            Description
          </label>
          <textarea
            className="form-textarea"
            id="ohDescription"
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What will you cover during these hours?"
            value={description}
          />

          <div className="schedule-section">
            <div className="schedule-section-header">
              <h2>
                <CalendarClock aria-hidden="true" size={20} />
                Weekly schedule
              </h2>
              <p>
                Add a row for each day and time block. Times repeat every week
                (e.g. every Monday 2:00–4:00 PM).
              </p>
            </div>

            <ul className="schedule-slot-list">
              {slots.map((slot, index) => (
                <li className="schedule-slot-row" key={index}>
                  <label className="form-label schedule-slot-label">
                    Day
                    <select
                      className="form-input"
                      onChange={(e) =>
                        updateSlot(index, {
                          dayOfWeek: Number(e.target.value)
                        })
                      }
                      value={slot.dayOfWeek}>
                      {WEEKDAY_OPTIONS.map((day) => (
                        <option key={day.value} value={day.value}>
                          {day.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="form-label schedule-slot-label">
                    Start
                    <input
                      className="form-input"
                      onChange={(e) =>
                        updateSlot(index, { startTime: e.target.value })
                      }
                      required
                      type="time"
                      value={slot.startTime}
                    />
                  </label>

                  <label className="form-label schedule-slot-label">
                    End
                    <input
                      className="form-input"
                      onChange={(e) =>
                        updateSlot(index, { endTime: e.target.value })
                      }
                      required
                      type="time"
                      value={slot.endTime}
                    />
                  </label>

                  <button
                    aria-label={`Remove time slot ${index + 1}`}
                    className="icon-btn schedule-slot-remove"
                    disabled={slots.length === 1}
                    onClick={() => removeSlot(index)}
                    type="button">
                    <Trash2 size={18} />
                  </button>
                </li>
              ))}
            </ul>

            <button
              className="btn btn-secondary btn-compact schedule-add-slot"
              onClick={addSlot}
              type="button">
              <Plus size={16} aria-hidden="true" />
              Add another day / time
            </button>
          </div>

          {error ? (
            <p className="field-message error" role="alert">
              {error}
            </p>
          ) : null}

          <button
            className="btn btn-gold btn-block"
            disabled={submitting || startingLive}
            type="submit">
            <CalendarClock size={18} aria-hidden="true" />
            {submitting ? "Saving schedule…" : "Save weekly schedule"}
          </button>
          <p className="field-message schedule-save-hint">
            Saving replaces your class weekly hours with the times above (one
            shared schedule for this class).
          </p>

          <div className="login-divider">
            <span>or</span>
          </div>

          <button
            className="btn btn-secondary btn-block"
            disabled={submitting || startingLive}
            onClick={handleStartLive}
            type="button">
            <Radio size={18} aria-hidden="true" />
            {startingLive ? "Starting session…" : "Start live session now"}
          </button>
        </form>
      </div>
    </DashboardLayout>
  );
}
