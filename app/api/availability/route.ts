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
    const dateMin = new Date(`${date}T00:00:00-05:00`).toISOString();
    const dateMax = new Date(`${date}T23:59:59-05:00`).toISOString();

    const events = await getCalendarEvents(dateMin, dateMax);

    const bookedTimes = events.map((event: any) => {
      const start = new Date(event.start?.dateTime || event.start?.date);
      const hours = start.getHours().toString().padStart(2, "0");
      const minutes = start.getMinutes().toString().padStart(2, "0");
      return `${hours}:${minutes}`;
    });

    const availableTimes = AVAILABLE_TIMES.filter((t) => !bookedTimes.includes(t));

    return NextResponse.json({ availableTimes });
  } catch (error) {
    return NextResponse.json({ availableTimes: AVAILABLE_TIMES });
  }
}