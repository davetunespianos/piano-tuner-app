import { getGoogleAccessToken } from "../../../lib/google";
import { generateICS } from "../../../lib/ics";
import { confirmationEmailBody } from "../../../lib/gmail";
import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "../../../lib/supabase-server";
import { createCalendarEvent } from "../../../lib/calendar";

// Construct a Date representing the given wall-clock time in Eastern Time (America/Detroit).
// Handles DST automatically by computing the offset for that specific date.
function easternWallTimeToDate(dateStr: string, timeStr: string): Date {
  // dateStr: "YYYY-MM-DD", timeStr: "HH:MM"
  const [year, month, day] = dateStr.split("-").map(Number);
  const [hour, minute] = timeStr.split(":").map(Number);

  // Create a UTC date as a starting point, then correct for Eastern offset
  const utcGuess = new Date(Date.UTC(year, month - 1, day, hour, minute));

  // Find what hour that UTC instant shows as in Detroit
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
  // Offset between UTC hour and Detroit hour gives us the timezone offset for that date
  const offsetHours = hour - detroitHour;

  return new Date(utcGuess.getTime() + offsetHours * 60 * 60 * 1000);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      date,
      time,
      service_type,
      first_name,
      last_name,
      email,
      phone,
      address,
      city,
      state,
      zip,
      piano_make,
      piano_model,
      piano_type,
      notes,
    } = body;

    const supabase = await createServerSupabaseClient();

    let clientId: string;
    const { data: existingClient } = await supabase
      .from("clients")
      .select("id")
      .eq("email", email)
      .single();

    if (existingClient) {
      clientId = existingClient.id;
    } else {
      const { data: newClient, error: clientError } = await supabase
        .from("clients")
        .insert([{
          first_name,
          last_name,
          email,
          phone: phone || null,
          address: address || null,
          city: city || null,
          state: state || null,
          zip: zip || null,
        }])
        .select("id")
        .single();

      if (clientError || !newClient) {
        console.error("Failed to create client:", clientError);
        throw new Error("Failed to create client record");
      }
      clientId = newClient.id;
    }

    let pianoId: string | null = null;

    const { data: existingPianos } = await supabase
      .from("pianos")
      .select("id")
      .eq("client_id", clientId)
      .limit(1);

    if (existingPianos && existingPianos.length > 0) {
      pianoId = existingPianos[0].id;
    } else if (piano_make || piano_model || piano_type) {
      const { data: newPiano, error: pianoError } = await supabase
        .from("pianos")
        .insert([{
          client_id: clientId,
          make: piano_make || null,
          model: piano_model || null,
          type: piano_type || null,
        }])
        .select("id")
        .single();

      if (pianoError) console.error("Failed to create piano:", pianoError);
      if (newPiano) pianoId = newPiano.id;
    }

    const appointmentDate = easternWallTimeToDate(date, time);
    const endTime = new Date(appointmentDate.getTime() + 120 * 60000);

    const { data: newAppt, error: apptError } = await supabase
      .from("appointments")
      .insert([{
        client_id: clientId,
        appointment_date: appointmentDate.toISOString(),
        duration_minutes: 120,
        status: "Scheduled",
        notes: notes || null,
      }])
      .select("id")
      .single();

    if (apptError || !newAppt) {
      console.error("Failed to create appointment:", apptError);
      throw new Error("Failed to create appointment");
    }

    if (pianoId) {
      const { error: apPianoError } = await supabase
        .from("appointment_pianos")
        .insert([{
          appointment_id: newAppt.id,
          piano_id: pianoId,
          service_type,
        }]);

      if (apPianoError) console.error("Failed to link piano to appointment:", apPianoError);
    }

    const location = [address, city, state, zip].filter(Boolean).join(", ");
    const summary = `Piano Tuning — ${first_name} ${last_name}`;
    const description = [
      `Service: ${service_type}`,
      piano_make || piano_model ? `Piano: ${[piano_make, piano_model].filter(Boolean).join(" ")}` : "",
      notes ? `Notes: ${notes}` : "",
    ].filter(Boolean).join("\n");

    try {
      const event = await createCalendarEvent({
        summary,
        description,
        location,
        startTime: appointmentDate.toISOString(),
        endTime: endTime.toISOString(),
      });

      await supabase
        .from("appointments")
        .update({ google_event_id: event.id })
        .eq("id", newAppt.id);
    } catch (calError) {
      console.error("Calendar sync failed:", calError);
    }

    try {
      const apptDate = easternWallTimeToDate(date, time);
      const endDate = new Date(apptDate.getTime() + 120 * 60000);

      const formattedDate = apptDate.toLocaleDateString("en-US", {
        weekday: "long", month: "long", day: "numeric", year: "numeric",
        timeZone: "America/Detroit",
      });
      const formattedTime = apptDate.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        timeZone: "America/Detroit",
      });

      const icsContent = generateICS({
        summary: "Piano Service Appointment - David Cossey",
        description: `Service: ${service_type}`,
        location,
        startTime: apptDate,
        endTime: endDate,
        organizerEmail: "davetunespianos@gmail.com",
        organizerName: "David Cossey",
      });

      const accessToken = await getGoogleAccessToken();
      if (accessToken) {
        const boundary = "confirm_boundary_xyz";
        const icsBase64 = Buffer.from(icsContent).toString("base64");
        const bodyHtml = confirmationEmailBody({
          firstName: first_name,
          date: formattedDate,
          time: formattedTime,
          serviceType: service_type,
        });

        const emailLines = [
          `To: ${email}`,
          `Bcc: ${process.env.BCC_EMAIL || "davetunespianos@gmail.com"}`,
          `Subject: Your Piano Service Appointment Has Been Added To My Calendar`,
          `MIME-Version: 1.0`,
          `Content-Type: multipart/mixed; boundary="${boundary}"`,
          ``,
          `--${boundary}`,
          `Content-Type: text/html; charset=utf-8`,
          ``,
          bodyHtml,
          ``,
          `--${boundary}`,
          `Content-Type: text/calendar; method=REQUEST; name="appointment.ics"`,
          `Content-Disposition: attachment; filename="appointment.ics"`,
          `Content-Transfer-Encoding: base64`,
          ``,
          icsBase64,
          ``,
          `--${boundary}--`,
        ];

        const rawEmail = emailLines.join("\r\n");
        const encodedEmail = Buffer.from(rawEmail).toString("base64url");

        await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ raw: encodedEmail }),
        });
      }
    } catch (emailError) {
      console.error("Confirmation email failed:", emailError);
    }
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}