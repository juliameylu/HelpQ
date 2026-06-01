import { jest } from "@jest/globals";

const mockDb = {
  closeSessionByHost: jest.fn(),
  createSession: jest.fn(),
  getActiveSessionForScheduleSlot: jest.fn(),
  getClassIdsWithSchedulesForHost: jest.fn(),
  getOfficeHoursSchedulesForClass: jest.fn(),
  getSessionByOccurrenceKey: jest.fn(),
  listActiveScheduledSessionsForClass: jest.fn()
};

const clock = {
  dateKey: "2026-05-29",
  dayOfWeek: 5,
  minutesSinceMidnight: 600
};

jest.unstable_mockModule("../services/db.js", () => mockDb);
jest.unstable_mockModule("../utils/scheduleClock.js", () => ({
  buildScheduleOccurrenceKey: (slotId, dateKey) => `${slotId}:${dateKey}`,
  getScheduleNow: jest.fn(() => clock),
  isSlotActiveNow: jest.fn((slot) => Boolean(slot.active))
}));

const { syncScheduledSessionsForClass, syncScheduledSessionsForHost } =
  await import("../services/scheduleSync.js");

function schedule(overrides = {}) {
  return {
    host_id: "host-1",
    created_by: "backup-host",
    title: "Office Hours",
    description: "Testing creating a session",
    slots: [],
    ...overrides
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockDb.getOfficeHoursSchedulesForClass.mockResolvedValue([]);
  mockDb.getActiveSessionForScheduleSlot.mockResolvedValue(null);
  mockDb.getSessionByOccurrenceKey.mockResolvedValue(null);
  mockDb.listActiveScheduledSessionsForClass.mockResolvedValue([]);
});

describe("syncScheduledSessionsForClass", () => {
  test("does nothing when no schedules exist", async () => {
    await syncScheduledSessionsForClass("class-1");

    expect(mockDb.createSession).not.toHaveBeenCalled();
    expect(mockDb.closeSessionByHost).not.toHaveBeenCalled();
    expect(mockDb.listActiveScheduledSessionsForClass).not.toHaveBeenCalled();
  });

  test("creates a session when a scheduled slot is active", async () => {
    mockDb.getOfficeHoursSchedulesForClass.mockResolvedValue([
      schedule({
        slots: [{ id: "slot-1", active: true }]
      })
    ]);

    await syncScheduledSessionsForClass("class-1");

    expect(mockDb.createSession).toHaveBeenCalledWith(
      "host-1",
      "Office Hours",
      "Testing creating a session",
      "class-1",
      {
        scheduleSlotId: "slot-1",
        scheduleOccurrenceKey: "slot-1:2026-05-29"
      }
    );
  });

  test("uses fallback schedule values when creating a session", async () => {
    mockDb.getOfficeHoursSchedulesForClass.mockResolvedValue([
      schedule({
        host_id: null,
        title: "",
        description: "",
        slots: [{ id: "slot-1", active: true }]
      })
    ]);

    await syncScheduledSessionsForClass("class-1");

    expect(mockDb.createSession).toHaveBeenCalledWith(
      "backup-host",
      "Office Hours",
      "",
      "class-1",
      {
        scheduleSlotId: "slot-1",
        scheduleOccurrenceKey: "slot-1:2026-05-29"
      }
    );
  });

  test("does not create a duplicate session", async () => {
    mockDb.getOfficeHoursSchedulesForClass.mockResolvedValue([
      schedule({
        slots: [{ id: "slot-1", active: true }]
      })
    ]);
    mockDb.getActiveSessionForScheduleSlot.mockResolvedValue({
      id: "session-1"
    });

    await syncScheduledSessionsForClass("class-1");

    expect(mockDb.createSession).not.toHaveBeenCalled();
  });

  test("does not restart a session the host already ended", async () => {
    mockDb.getOfficeHoursSchedulesForClass.mockResolvedValue([
      schedule({
        slots: [{ id: "slot-1", active: true }]
      })
    ]);
    mockDb.getSessionByOccurrenceKey.mockResolvedValue({
      host_ended_at: "2026-05-29T12:00:00.000Z"
    });

    await syncScheduledSessionsForClass("class-1");

    expect(mockDb.createSession).not.toHaveBeenCalled();
  });

  test("does not restart an old closed scheduled session", async () => {
    mockDb.getOfficeHoursSchedulesForClass.mockResolvedValue([
      schedule({
        slots: [{ id: "slot-1", active: true }]
      })
    ]);
    mockDb.getSessionByOccurrenceKey.mockResolvedValue({
      status: "closed",
      schedule_occurrence_key: "slot-1:2026-05-29"
    });

    await syncScheduledSessionsForClass("class-1");

    expect(mockDb.createSession).not.toHaveBeenCalled();
  });

  test("closes an active session after its scheduled time", async () => {
    mockDb.getOfficeHoursSchedulesForClass.mockResolvedValue([
      schedule({
        slots: [{ id: "slot-1", active: false }]
      })
    ]);
    mockDb.getActiveSessionForScheduleSlot.mockResolvedValue({
      id: "session-1",
      schedule_occurrence_key: "saved-key"
    });

    await syncScheduledSessionsForClass("class-1");

    expect(mockDb.closeSessionByHost).toHaveBeenCalledWith("session-1", {
      occurrenceKey: "saved-key"
    });
  });

  test("builds a close key if the active session does not have one", async () => {
    mockDb.getOfficeHoursSchedulesForClass.mockResolvedValue([
      schedule({
        slots: [{ id: "slot-1", active: false }]
      })
    ]);
    mockDb.getActiveSessionForScheduleSlot.mockResolvedValue({
      id: "session-1"
    });

    await syncScheduledSessionsForClass("class-1");

    expect(mockDb.closeSessionByHost).toHaveBeenCalledWith("session-1", {
      occurrenceKey: "slot-1:2026-05-29"
    });
  });

  test("cleans up active sessions with missing or inactive slots", async () => {
    mockDb.getOfficeHoursSchedulesForClass.mockResolvedValue([
      schedule({
        slots: [
          { id: "slot-1", active: true },
          { id: "slot-3", active: false }
        ]
      })
    ]);
    mockDb.listActiveScheduledSessionsForClass.mockResolvedValue([
      { id: "session-no-slot" },
      { id: "session-active", schedule_slot_id: "slot-1" },
      { id: "session-missing", schedule_slot_id: "slot-2" },
      {
        id: "session-old",
        schedule_slot_id: "slot-3",
        schedule_occurrence_key: "old-key"
      }
    ]);

    await syncScheduledSessionsForClass("class-1");

    expect(mockDb.closeSessionByHost).toHaveBeenCalledWith("session-missing", {
      occurrenceKey: "slot-2:2026-05-29"
    });
    expect(mockDb.closeSessionByHost).toHaveBeenCalledWith("session-old", {
      occurrenceKey: "old-key"
    });
    expect(mockDb.closeSessionByHost).toHaveBeenCalledTimes(2);
  });

  test("skips schedules with no host and schedules with no slots", async () => {
    mockDb.getOfficeHoursSchedulesForClass.mockResolvedValue([
      schedule({ host_id: null, created_by: null, slots: [{ id: "slot-1" }] }),
      schedule({ slots: null })
    ]);

    await syncScheduledSessionsForClass("class-1");

    expect(mockDb.createSession).not.toHaveBeenCalled();
    expect(mockDb.closeSessionByHost).not.toHaveBeenCalled();
  });

  test("cleans up active sessions when a schedule has no slot list", async () => {
    mockDb.getOfficeHoursSchedulesForClass.mockResolvedValue([
      schedule({ slots: null })
    ]);
    mockDb.listActiveScheduledSessionsForClass.mockResolvedValue([
      { id: "session-1", schedule_slot_id: "slot-1" }
    ]);

    await syncScheduledSessionsForClass("class-1");

    expect(mockDb.closeSessionByHost).toHaveBeenCalledWith("session-1", {
      occurrenceKey: "slot-1:2026-05-29"
    });
  });
});

describe("syncScheduledSessionsForHost", () => {
  test("syncs every class that has schedules for the host", async () => {
    mockDb.getClassIdsWithSchedulesForHost.mockResolvedValue([
      "class-1",
      "class-2"
    ]);

    await syncScheduledSessionsForHost("host-1");

    expect(mockDb.getOfficeHoursSchedulesForClass).toHaveBeenCalledWith(
      "class-1"
    );
    expect(mockDb.getOfficeHoursSchedulesForClass).toHaveBeenCalledWith(
      "class-2"
    );
  });
});
