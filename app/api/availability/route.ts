import { NextRequest, NextResponse } from "next/server";
import { getCalendarEvents } from "../../../lib/calendar";

const AVAILABLE_TIMES = ["09:00", "12:00", "15:00"];
const APPOINTMENT_DURATION_MINUTES = 120;

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const date = searchParams.get("date");

  if (!date) {
    return NextResponse.json({ availableTimes: AVAILABLE_TIMES });
  }

  try {
    // Compute day boundaries in Eastern time, honoring DST automatically
    const dateMin = easternDayStart(date);
    const dateMax = easternDayEnd(date);

    const events = await getCalendarEvents(dateMin, dateMax);

    // Parse each event into a [start, end] interval as UTC milliseconds
    const busyIntervals: [number, number][] = [];
    for (const event of events) {
      const startRaw = event.start?.dateTime || event.start?.date;
      const endRaw = event.end?.dateTime || event.end?.date;
      if (!startRaw || !endRaw) continue;

      // All-day events have date-only values like "2026-05-15".
      // Google's "end" for an all-day event is exclusive (the day AFTER), so the interval
      // [start of date, start of end-date] correctly covers the entire all-day block.
      const isAllDay = !event.start?.dateTime;
      const startMs = isAllDay
        ? easternWallTimeToDate(startRaw, "00:00").getTime()
        : new Date(startRaw).getTime();
      const endMs = isAllDay
        ? easternWallTimeToDate(endRaw, "00:00").getTime()
        : new Date(endRaw).getTime();

      busyIntervals.push([startMs, endMs]);
    }

    // For each available slot, check whether ANY calendar event overlaps its appointment window
    const availableTimes = AVAILABLE_TIMES.filter((slot) => {
      const slotStart = easternWallTimeToDate(date, slot).getTime();
      const slotEnd = slotStart + APPOINTMENT_DURATION_MINUTES * 60 * 1000;

      // Slot is unavailable if any busy interval overlaps it.
      // Two intervals [a, b] and [c, d] overlap iff a < d AND c < b
      const conflict = busyIntervals.some(([busyStart, busyEnd]) =>
        slotStart < busyEnd && busyStart < slotEnd
      );

      return !conflict;
    });

    return NextResponse.json({ availableTimes });
  } catch (error) {
    console.error("Availability check failed:", error);
    // Fail closed: return no times rather than falsely showing all as available
    return NextResponse.json({ availableTimes: [], error: "Availability check unavailable" });
  }
}

// Convert "YYYY-MM-DD" into the UTC instant representing midnight Eastern time on that date
function easternDayStart(dateStr: string): string {
  return easternWallTimeToDate(dateStr, "00:00").toISOString();
}

function easternDayEnd(dateStr: string): string {
  return easternWallTimeToDate(dateStr, "23:59").toISOString();
}

function easternWallTimeToDate(dateStr: string, timeStr: string): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  const [hour, minute] = timeStr.split(":").map(Number);

  const utcGuess = new Date(Date.UTC(year, month - 1, day, hour, minute));

  const detroitParts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Detroit",
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(utcGuess);

  const detroitHour = Number(detroitParts.find((p) => p.type === "hour")?.value);
  const offsetHours = hour - detroitHour;

  return new Date(utcGuess.getTime() + offsetHours * 60 * 60 * 1000);
}