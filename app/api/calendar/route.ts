import { NextRequest, NextResponse } from "next/server";
import { createCalendarEvent, updateCalendarEvent, deleteCalendarEvent } from "../../../lib/calendar";
import { createServerSupabaseClient } from "../../../lib/supabase-server";

export async function POST(request: NextRequest) {
  try {
    const { appointmentId, action } = await request.json();
    const supabase = await createServerSupabaseClient();

    if (action === "delete") {
      const { data } = await supabase
        .from("appointments")
        .select("google_event_id")
        .eq("id", appointmentId)
        .single();

      if (data?.google_event_id) {
        await deleteCalendarEvent(data.google_event_id);
        await supabase
          .from("appointments")
          .update({ google_event_id: null })
          .eq("id", appointmentId);
      }
      return NextResponse.json({ success: true });
    }

    const { data: appt, error: apptError } = await supabase
      .from("appointments")
      .select(`
        id,
        appointment_date,
        duration_minutes,
        notes,
        google_event_id,
        clients (first_name, last_name, company_name, address, city, state, zip),
        appointment_pianos (
          service_type,
          pianos (make, model)
        )
      `)
      .eq("id", appointmentId)
      .single();

    if (apptError) {
      console.error("Supabase appointments query error:", apptError);
      return NextResponse.json({ error: "Supabase query failed", details: apptError }, { status: 500 });
    }

    if (!appt) return NextResponse.json({ error: "Appointment not found" }, { status: 404 });

    const startTime = appt.appointment_date;
    const duration = appt.duration_minutes || 60;
    const endTime = new Date(new Date(startTime).getTime() + duration * 60000).toISOString();

    const client = appt.clients as any;
    const appointmentPianos = (appt.appointment_pianos as any[]) || [];
    const clientName = client.company_name || `${client.first_name} ${client.last_name || ""}`.trim();
    const location = [client.address, client.city, client.state, client.zip].filter(Boolean).join(", ");

    const pianoLines = appointmentPianos.map((ap) => {
      const p = ap.pianos;
      const pianoName = p ? `${p.make || ""} ${p.model || ""}`.trim() : "";
      return pianoName ? `${ap.service_type} — ${pianoName}` : ap.service_type;
    });

    const summary = `Piano Tuning — ${clientName}`;
    const description = [
      pianoLines.length > 0 ? `Services:\n${pianoLines.map((l) => `  • ${l}`).join("\n")}` : "",
      appt.notes ? `Notes: ${appt.notes}` : "",
    ].filter(Boolean).join("\n\n");

    if (appt.google_event_id) {
      await updateCalendarEvent({
        eventId: appt.google_event_id,
        summary,
        description,
        location,
        startTime,
        endTime,
      });
    } else {
      const event = await createCalendarEvent({
        summary,
        description,
        location,
        startTime,
        endTime,
      });

      await supabase
        .from("appointments")
        .update({ google_event_id: event.id })
        .eq("id", appointmentId);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}