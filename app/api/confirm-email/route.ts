import { generateICS } from "../../../lib/ics";
import { getGoogleAccessToken } from "../../../lib/google";
import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "../../../lib/supabase-server";
import { sendEmail, confirmationEmailBody } from "../../../lib/gmail";

export async function POST(request: NextRequest) {
  try {
    const { appointmentId } = await request.json();
    const supabase = await createServerSupabaseClient();

    const { data: appt, error: apptError } = await supabase
      .from("appointments")
      .select(`
        appointment_date,
        duration_minutes,
        clients (first_name, email),
        appointment_pianos (service_type)
      `)
      .eq("id", appointmentId)
      .single();

    if (apptError) {
      console.error("Supabase confirm-email query error:", apptError);
      return NextResponse.json({ error: "Supabase query failed", details: apptError }, { status: 500 });
    }

    if (!appt) return NextResponse.json({ error: "Appointment not found" }, { status: 404 });

    const client = appt.clients as any;
    if (!client?.email) return NextResponse.json({ success: true, skipped: "no email" });

    const appointmentPianos = (appt.appointment_pianos as any[]) || [];
    const serviceTypes = appointmentPianos.map((ap) => ap.service_type).filter(Boolean);
    const serviceTypeLabel = serviceTypes.length > 0
      ? Array.from(new Set(serviceTypes)).join(", ")
      : "Piano Service";

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

    const apptDate = new Date(appt.appointment_date);
    const duration = appt.duration_minutes || 60;
    const endDate = new Date(apptDate.getTime() + duration * 60000);

    const icsContent = generateICS({
      summary: "Piano Service Appointment - David Cossey",
      description: `Service: ${serviceTypeLabel}`,
      location: "",
      startTime: apptDate,
      endTime: endDate,
      organizerEmail: "davetunespianos@gmail.com",
      organizerName: "David Cossey",
    });

    const accessToken = await getGoogleAccessToken();
    if (!accessToken) return NextResponse.json({ success: true, skipped: "no token" });

    const boundary = "confirm_boundary_xyz";
    const icsBase64 = Buffer.from(icsContent).toString("base64");
    const bodyHtml = confirmationEmailBody({
      firstName: client.first_name,
      date: formattedDate,
      time: formattedTime,
      serviceType: serviceTypeLabel,
    });

    const emailLines = [
      `To: ${client.email}`,
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

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}