// In the demo nothing leaves the browser: texts and emails are "sent" to the
// demo outbox (the message_log table, shown in the Texts & emails panel).
export type SendResult = { status: "sent" | "failed" | "skipped"; providerId?: string; error?: string };

let n = 0;
export async function sendSms(_to: string, _body: string): Promise<SendResult> {
  return { status: "sent", providerId: `SMdemo${++n}` };
}
export async function sendEmail(_to: string, _subject: string, _text: string): Promise<SendResult> {
  return { status: "sent", providerId: `demo-${++n}` };
}
