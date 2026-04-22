import { NextRequest, NextResponse } from "next/server";
import { getCalendarEvents } from "../../../lib/calendar";

const AVAILABLE_TIMES = ["09:00", "12:00", "15:00"];

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

    const bookedTimes = events.map((event: any) => {
      const startRaw = event.start?.dateTime || event.start?.date;
      if (!startRaw) return null;
      // Format the event start in Eastern time so we can match against AVAILABLE_TIMES
      const parts = new Intl.DateTimeFormat("en-US", {
        timeZone: "America/Detroit",
        hour12: false,
        hour: "2-digit",
        minute: "2-digit",
      }).formatToParts(new Date(startRaw));
      const hours = parts.find((p) => p.type === "hour")?.value ?? "00";
      const minutes = parts.find((p) => p.type === "minute")?.value ?? "00";
      return `${hours}:${minutes}`;
    }).filter(Boolean);

    const availableTimes = AVAILABLE_TIMES.filter((t) => !bookedTimes.includes(t));

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