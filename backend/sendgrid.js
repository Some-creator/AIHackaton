const USE_MOCK = true;

export async function sendEmail({ to, subject, body, from }) {
  if (USE_MOCK) {
    return {
      success: true,
      messageId: `mock-${Date.now()}`,
      to,
      subject,
      sentAt: new Date().toISOString(),
    };
  }

  const apiKey = process.env.SENDGRID_API_KEY;
  if (!apiKey) throw new Error('SENDGRID_API_KEY not configured');

  const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: to }] }],
      from: { email: from || 'outreach@hookline.app' },
      subject,
      content: [{ type: 'text/plain', value: body }],
    }),
  });

  if (!response.ok) throw new Error(`SendGrid send failed: ${response.status}`);
  return {
    success: true,
    messageId: response.headers.get('x-message-id') || `sg-${Date.now()}`,
    to,
    subject,
    sentAt: new Date().toISOString(),
  };
}
