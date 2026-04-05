import { getGoogleAccessToken } from "./google";

export async function sendEmail({
  to,
  subject,
  body,
}: {
  to: string;
  subject: string;
  body: string;
}) {
  const accessToken = await getGoogleAccessToken();
  if (!accessToken) throw new Error("No Google access token available");

  const emailLines = [
    `To: ${to}`,
    `Subject: ${subject}`,
    `MIME-Version: 1.0`,
    `Content-Type: text/html; charset=utf-8`,
    ``,
    body,
  ];

  const email = emailLines.join("\r\n");
  const encodedEmail = Buffer.from(email).toString("base64url");

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
  return data;
}

export function confirmationEmailBody({
  firstName,
  date,
  time,
}: {
  firstName: string;
  date: string;
  time: string;
  serviceType: string;
}) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #222; line-height: 1.6;">
      <p>Hi ${firstName},</p>
      <p>Your appointment on <strong>${date}</strong> at <strong>${time}</strong> has been added to my calendar.</p>
      <p>You will receive a reminder email two days before your appointment. If you decide the date and time of your appointment no longer works for you, please contact me as soon as possible.</p>
      <p>Please contact me if you have any questions. Call or text <strong>734-812-8096</strong> or email <strong>davetunespianos@gmail.com</strong>.</p>
      <p>Thank you,</p>
      <p style="margin-top: 1rem;">
        David Cossey - Piano Tuner<br/>
        734-812-8096<br/>
        davetunespianos@gmail.com<br/>
        davidcosseypianotuner.com
      </p>
    </div>
  `;
}

export function reminderEmailBody({
  firstName,
  date,
  time,
}: {
  firstName: string;
  date: string;
  time: string;
  serviceType: string;
}) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #222; line-height: 1.6;">
      <p>Hi ${firstName},</p>
      <p>Your piano service appointment is scheduled for <strong>${date}</strong> at <strong>${time}</strong>.</p>
      <p>If, for some reason, this date and time no longer work for you, please email me at <strong>davetunespianos@gmail.com</strong> or text <strong>734-812-8096</strong> as soon as possible to request a date and time change.</p>
      <p>Thank you!</p>
      <p style="margin-top: 1rem;">
        David Cossey - Piano Tuner<br/>
        734-812-8096<br/>
        davetunespianos@gmail.com<br/>
        davidcosseypianotuner.com
      </p>
    </div>
  `;
}