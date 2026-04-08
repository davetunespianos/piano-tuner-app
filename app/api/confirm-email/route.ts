import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "../../../lib/supabase-server";
import { sendEmail, confirmationEmailBody } from "../../../lib/gmail";

export async function POST(request: NextRequest) {
  try {
    const { appointmentId } = await request.json();
    const supabase = await createServerSupabaseClient();

    const { data: appt } = await supabase
      .from("appointments")
      .select(`
        appointment_date,
        service_type,
        clients (first_name, email)
      `)
      .eq("id", appointmentId)
      .single();

    if (!appt) return NextResponse.json({ error: "Appointment not found" }, { status: 404 });

    const client = appt.clients as any;
    if (!client?.email) return NextResponse.json({ success: true, skipped: "no email" });

    const formattedDate = new Date(appt.appointment_date).toLocaleDateString("en-US", {
      weekday: "long", month: "long", day: "numeric", year: "numeric",
      timeZone: "America/Detroit",
    });

    const d = new Date(appt.appointment_date);
    const formattedTime = d.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      timeZone: "America/Detroit",
    });

    await sendEmail({
      to: client.email,
      subject: "Your Piano Service Appointment Has Been Added To My Calendar",
      body: confirmationEmailBody({
        firstName: client.first_name,
        date: formattedDate,
        time: formattedTime,
        serviceType: appt.service_type,
      }),
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}