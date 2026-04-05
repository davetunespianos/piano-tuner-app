import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "../../../lib/supabase-server";
import { sendEmail, reminderEmailBody } from "../../../lib/gmail";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = await createServerSupabaseClient();

    const now = new Date();
    const in46Hours30Min = new Date(now.getTime() + ((48 * 60) - 90) * 60 * 1000);
    const in49Hours30Min = new Date(now.getTime() + ((48 * 60) + 90) * 60 * 1000);

    const { data: appointments } = await supabase
      .from("appointments")
      .select(`
        id,
        appointment_date,
        service_type,
        clients (first_name, email)
      `)
      .eq("status", "Scheduled")
      .gte("appointment_date", in46Hours30Min.toISOString())
      .lte("appointment_date", in49Hours30Min.toISOString());

    if (!appointments || appointments.length === 0) {
      return NextResponse.json({ success: true, sent: 0 });
    }

    let sent = 0;
    for (const appt of appointments) {
      const client = appt.clients as any;
      if (!client?.email) continue;

      const formattedDate = new Date(appt.appointment_date).toLocaleDateString("en-US", {
        weekday: "long", month: "long", day: "numeric", year: "numeric"
      });

      const d = new Date(appt.appointment_date);
      const h = d.getHours();
      const ampm = h >= 12 ? "PM" : "AM";
      const hour = h > 12 ? h - 12 : h === 0 ? 12 : h;
      const formattedTime = `${hour}:00 ${ampm}`;

      await sendEmail({
        to: client.email,
        subject: `${client.first_name}, Your Piano Service Appointment Is Coming Up`,
        body: reminderEmailBody({
          firstName: client.first_name,
          date: formattedDate,
          time: formattedTime,
          serviceType: appt.service_type,
        }),
      });

      sent++;
    }

    return NextResponse.json({ success: true, sent });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}