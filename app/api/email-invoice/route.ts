import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "../../../lib/supabase-server";
import { getGoogleAccessToken } from "../../../lib/google";
import { renderToBuffer } from "@react-pdf/renderer";
import React from "react";
import InvoicePDF from "../../(admin)/admin/invoices/[id]/InvoicePDF";

export async function POST(request: NextRequest) {
  try {
    const { invoiceId } = await request.json();
    const supabase = await createServerSupabaseClient();

    const { data: inv } = await supabase
      .from("invoices")
      .select(`
        id, invoice_number, invoice_date, due_date, status,
        notes, payment_method, paid_date,
        clients (first_name, last_name, company_name, address, city, state, zip, phone, email)
      `)
      .eq("id", invoiceId)
      .single();

    const { data: items } = await supabase
      .from("invoice_items")
      .select("*")
      .eq("invoice_id", invoiceId)
      .order("created_at", { ascending: true });

    if (!inv) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });

    const client = inv.clients as any;
    if (!client?.email) return NextResponse.json({ error: "Client has no email address" }, { status: 400 });

    const pdfBuffer = await renderToBuffer(
      React.createElement(InvoicePDF, { invoice: inv as any, lineItems: items || [] }) as any
    );

    const accessToken = await getGoogleAccessToken();
    if (!accessToken) throw new Error("No Google access token");

    const clientName = client.company_name || `${client.first_name} ${client.last_name || ""}`.trim();
    const subject = `Invoice #${inv.invoice_number} from David Cossey - Piano Tuner`;
    const total = (items || []).reduce((sum: number, item: any) => sum + item.line_total, 0);
    const bodyText = `Hi ${client.first_name},\n\nHere is a copy of your invoice for piano tuning/repair services. This invoice has a balance due of $${total.toFixed(2)}. Thank you for the opportunity to serve you and your piano.\n\nThank you,\n\nDavid Cossey - Piano Tuner\n734-812-8096\ndavetunespianos@gmail.com\ndavidcosseypianotuner.com`;

    const boundary = "invoice_boundary_xyz";
    const pdfBase64 = pdfBuffer.toString("base64");

    const emailLines = [
      `To: ${client.email}`,
      `Subject: ${subject}`,
      `MIME-Version: 1.0`,
      `Content-Type: multipart/mixed; boundary="${boundary}"`,
      ``,
      `--${boundary}`,
      `Content-Type: text/plain; charset=utf-8`,
      ``,
      bodyText,
      ``,
      `--${boundary}`,
      `Content-Type: application/pdf; name="invoice-${inv.invoice_number}.pdf"`,
      `Content-Disposition: attachment; filename="invoice-${inv.invoice_number}.pdf"`,
      `Content-Transfer-Encoding: base64`,
      ``,
      pdfBase64,
      ``,
      `--${boundary}--`,
    ];

    const rawEmail = emailLines.join("\r\n");
    const encodedEmail = Buffer.from(rawEmail).toString("base64url");

    const response = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ raw: encodedEmail }),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message || "Gmail API error");

    await supabase
      .from("invoices")
      .update({ status: "Sent" })
      .eq("id", invoiceId);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}