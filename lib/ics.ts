export function generateICS({
  summary,
  description,
  location,
  startTime,
  endTime,
  organizerEmail,
  organizerName,
}: {
  summary: string;
  description: string;
  location: string;
  startTime: Date;
  endTime: Date;
  organizerEmail: string;
  organizerName: string;
}) {
  function formatDate(date: Date) {
    return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  }

  const uid = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}@davidcosseypianotuner.com`;

  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//David Cossey Piano Tuner//Appointment//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:REQUEST",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${formatDate(new Date())}`,
    `DTSTART:${formatDate(startTime)}`,
    `DTEND:${formatDate(endTime)}`,
    `SUMMARY:${summary}`,
    `DESCRIPTION:${description}`,
    `LOCATION:${location}`,
    `ORGANIZER;CN=${organizerName}:mailto:${organizerEmail}`,
    "STATUS:CONFIRMED",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");

  return ics;
}