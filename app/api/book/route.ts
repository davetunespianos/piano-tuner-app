import { sendEmail, confirmationEmailBody } from "../../../lib/gmail";
import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "../../../lib/supabase-server";
import { createCalendarEvent } from "../../../lib/calendar";

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

      if (clientError || !newClient) throw new Error("Failed to create client record");
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
      const { data: newPiano } = await supabase
        .from("pianos")
        .insert([{
          client_id: clientId,
          make: piano_make || null,
          model: piano_model || null,
          type: piano_type || null,
        }])
        .select("id")
        .single();

      if (newPiano) pianoId = newPiano.id;
    }

    const appointmentDate = new Date(`${date}T${time}:00`);
    const endTime = new Date(appointmentDate.getTime() + 60 * 60000);

    const { data: newAppt, error: apptError } = await supabase
      .from("appointments")
      .insert([{
        client_id: clientId,
        piano_id: pianoId,
        service_type,
        appointment_date: appointmentDate.toISOString(),
        duration_minutes: 60,
        status: "Scheduled",
        notes: notes || null,
      }])
      .select("id")
      .single();

    if (apptError || !newAppt) throw new Error("Failed to create appointment");

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
      const apptDate = new Date(`${date}T${time}:00`);
      const formattedDate = apptDate.toLocaleDateString("en-US", {
        weekday: "long", month: "long", day: "numeric", year: "numeric",
        timeZone: "America/Detroit",
      });
      const formattedTime = apptDate.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        timeZone: "America/Detroit",
      });

      await sendEmail({
        to: email,
        subject: `Your Piano Service Appointment Has Been Added To My Calendar`,
        body: confirmationEmailBody({
          firstName: first_name,
          date: formattedDate,
          time: formattedTime,
          serviceType: service_type,
        }),
      });
    } catch (emailError) {
      console.error("Confirmation email failed:", emailError);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}