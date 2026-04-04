import { getGoogleAccessToken } from "./google";

const CALENDAR_ID = "primary";

export async function createCalendarEvent({
  summary,
  description,
  location,
  startTime,
  endTime,
}: {
  summary: string;
  description?: string;
  location?: string;
  startTime: string;
  endTime: string;
}) {
  const accessToken = await getGoogleAccessToken();
  if (!accessToken) throw new Error("No Google access token available");

  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${CALENDAR_ID}/events`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        summary,
        description,
        location,
        start: { dateTime: startTime, timeZone: "America/Detroit" },
        end: { dateTime: endTime, timeZone: "America/Detroit" },
      }),
    }
  );

  const data = await response.json();
  if (!response.ok) throw new Error(data.error?.message || "Calendar API error");
  return data;
}

export async function updateCalendarEvent({
  eventId,
  summary,
  description,
  location,
  startTime,
  endTime,
}: {
  eventId: string;
  summary: string;
  description?: string;
  location?: string;
  startTime: string;
  endTime: string;
}) {
  const accessToken = await getGoogleAccessToken();
  if (!accessToken) throw new Error("No Google access token available");

  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${CALENDAR_ID}/events/${eventId}`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        summary,
        description,
        location,
        start: { dateTime: startTime, timeZone: "America/Detroit" },
        end: { dateTime: endTime, timeZone: "America/Detroit" },
      }),
    }
  );

  const data = await response.json();
  if (!response.ok) throw new Error(data.error?.message || "Calendar API error");
  return data;
}

export async function deleteCalendarEvent(eventId: string) {
  const accessToken = await getGoogleAccessToken();
  if (!accessToken) throw new Error("No Google access token available");

  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${CALENDAR_ID}/events/${eventId}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok && response.status !== 404) {
    throw new Error("Failed to delete calendar event");
  }
}

export async function getCalendarEvents(dateMin: string, dateMax: string) {
  const accessToken = await getGoogleAccessToken();
  if (!accessToken) throw new Error("No Google access token available");

  const params = new URLSearchParams({
    timeMin: dateMin,
    timeMax: dateMax,
    singleEvents: "true",
    orderBy: "startTime",
  });

  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${CALENDAR_ID}/events?${params}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  const data = await response.json();
  if (!response.ok) throw new Error(data.error?.message || "Calendar API error");
  return data.items || [];
}