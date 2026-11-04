import { describe, expect, it } from "vitest";
import { datesWithSlots, isAfterHours, isSlotAvailable, slotsForDate, weekdayOf } from "./slots";

const TZ = "Australia/Sydney";
// Monday 2 Feb 2026, 9:00am Sydney (AEDT, UTC+11) = 1 Feb 22:00 UTC
const NOW = new Date("2026-02-01T22:00:00Z");

const base = {
  timezone: TZ,
  rules: [
    { weekday: 1, start_minute: 8 * 60, end_minute: 12 * 60 }, // Mon 8–12
    { weekday: 2, start_minute: 8 * 60, end_minute: 10 * 60 }, // Tue 8–10
  ],
  busy: [],
  durationMin: 60,
  intervalMin: 60,
  leadTimeHours: 0,
  windowDays: 14,
  now: NOW,
};

describe("weekdayOf", () => {
  it("returns 1 for a Monday", () => expect(weekdayOf("2026-02-02")).toBe(1));
});

describe("slotsForDate", () => {
  it("skips slots before now + lead time", () => {
    const slots = slotsForDate("2026-02-02", base);
    expect(slots.map((s) => s.label)).toEqual(["9:00 am", "10:00 am", "11:00 am"]);
  });

  it("returns ISO times in UTC for the local time zone", () => {
    const [first] = slotsForDate("2026-02-03", base);
    expect(first.start).toBe("2026-02-02T21:00:00.000Z"); // Tue 8am AEDT
  });

  it("only offers slots that finish within working hours", () => {
    const slots = slotsForDate("2026-02-03", { ...base, durationMin: 90, intervalMin: 30 });
    expect(slots.map((s) => s.label)).toEqual(["8:00 am", "8:30 am"]);
  });

  it("removes slots that overlap existing bookings", () => {
    // Booked 8:00–8:30am Tuesday local
    const busy = [{ start: new Date("2026-02-02T21:00:00Z"), end: new Date("2026-02-02T21:30:00Z") }];
    const slots = slotsForDate("2026-02-03", { ...base, busy, intervalMin: 30 });
    expect(slots.map((s) => s.label)).toEqual(["8:30 am", "9:00 am"]);
  });

  it("respects the lead time", () => {
    const slots = slotsForDate("2026-02-02", { ...base, leadTimeHours: 2 });
    expect(slots.map((s) => s.label)).toEqual(["11:00 am"]);
  });

  it("returns nothing outside the booking window or on closed days", () => {
    expect(slotsForDate("2026-03-30", base)).toEqual([]);
    expect(slotsForDate("2026-02-04", base)).toEqual([]); // Wednesday
    expect(slotsForDate("not-a-date", base)).toEqual([]);
  });

  it("handles the daylight saving change (Sydney, 5 Apr 2026)", () => {
    const rules = [{ weekday: 1, start_minute: 9 * 60, end_minute: 10 * 60 }];
    const now = new Date("2026-04-01T00:00:00Z");
    const [slot] = slotsForDate("2026-04-06", { ...base, rules, now });
    expect(slot.start).toBe("2026-04-05T23:00:00.000Z"); // 9am AEST = UTC+10
  });
});

describe("datesWithSlots / isSlotAvailable", () => {
  it("lists only open days", () => {
    const dates = datesWithSlots(base);
    expect(dates.slice(0, 3)).toEqual(["2026-02-02", "2026-02-03", "2026-02-09"]);
  });

  it("confirms a real slot and rejects a made-up one", () => {
    expect(isSlotAvailable("2026-02-02T21:00:00.000Z", base)).toBe(true);
    expect(isSlotAvailable("2026-02-02T21:15:00.000Z", base)).toBe(false);
  });
});

describe("isAfterHours", () => {
  it("flags Saturday and evening bookings", () => {
    expect(isAfterHours(new Date("2026-02-07T00:00:00Z"), TZ)).toBe(true); // Sat 11am
    expect(isAfterHours(new Date("2026-02-02T09:00:00Z"), TZ)).toBe(true); // Mon 8pm
    expect(isAfterHours(new Date("2026-02-02T00:00:00Z"), TZ)).toBe(false); // Mon 11am
  });
});
