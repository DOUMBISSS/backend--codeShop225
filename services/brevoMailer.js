const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';

/**
 * Envoie un email transactionnel via l'API Brevo.
 * @param {Object} opts
 * @param {string|{email:string,name?:string}} opts.to - destinataire principal
 * @param {string} opts.subject
 * @param {string} opts.html
 * @param {string[]} [opts.bcc] - liste d'emails en copie cachée (envoi de masse)
 */
export const sendEmail = async ({ to, subject, html, bcc }) => {
  const recipient = typeof to === 'string' ? { email: to } : to;

  const payload = {
    sender: {
      email: process.env.BREVO_SENDER_EMAIL,
      name: process.env.BREVO_SENDER_NAME || 'CodeShop225',
    },
    to: [recipient],
    subject,
    htmlContent: html,
  };

  if (bcc && bcc.length) {
    payload.bcc = bcc.map(email => ({ email }));
  }

  const res = await fetch(BREVO_API_URL, {
    method: 'POST',
    headers: {
      'api-key': process.env.BREVO_API_KEY,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorBody = await res.text().catch(() => '');
    throw new Error(`Brevo API error (${res.status}): ${errorBody}`);
  }

  return res.json();
};
