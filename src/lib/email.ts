import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export interface SendEstimateEmailParams {
  to: string;
  clientName: string;
  estimateNumber: string;
  estimateTitle: string;
  total: number;
  validUntil: string | null;
  viewUrl: string;
  businessName: string;
  fromEmail?: string;
}

export async function sendEstimateEmail({
  to,
  clientName,
  estimateNumber,
  estimateTitle,
  total,
  validUntil,
  viewUrl,
  businessName,
  fromEmail,
}: SendEstimateEmailParams) {
  const formattedTotal = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(total);

  const formattedValidUntil = validUntil
    ? new Date(validUntil).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null;

  const { data, error } = await resend.emails.send({
    from: fromEmail || `${businessName} <onboarding@resend.dev>`,
    to: [to],
    subject: `Estimate ${estimateNumber} from ${businessName}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Estimate ${estimateNumber}</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #334155; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); padding: 32px; border-radius: 12px 12px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 24px;">${businessName}</h1>
          </div>

          <div style="background: #ffffff; padding: 32px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;">
            <p style="font-size: 16px; margin-bottom: 24px;">
              Hi ${clientName},
            </p>

            <p style="font-size: 16px; margin-bottom: 24px;">
              You've received a new estimate from <strong>${businessName}</strong>.
            </p>

            <div style="background: #f8fafc; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; color: #64748b;">Estimate #</td>
                  <td style="padding: 8px 0; text-align: right; font-weight: 600;">${estimateNumber}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #64748b;">Project</td>
                  <td style="padding: 8px 0; text-align: right; font-weight: 600;">${estimateTitle}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; border-top: 1px solid #e2e8f0; color: #64748b;">Total Amount</td>
                  <td style="padding: 8px 0; border-top: 1px solid #e2e8f0; text-align: right; font-weight: 700; font-size: 20px; color: #3b82f6;">${formattedTotal}</td>
                </tr>
                ${formattedValidUntil ? `
                <tr>
                  <td style="padding: 8px 0; color: #64748b;">Valid Until</td>
                  <td style="padding: 8px 0; text-align: right;">${formattedValidUntil}</td>
                </tr>
                ` : ''}
              </table>
            </div>

            <div style="text-align: center; margin-bottom: 24px;">
              <a href="${viewUrl}" style="display: inline-block; background: #3b82f6; color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                View Estimate
              </a>
            </div>

            <p style="font-size: 14px; color: #64748b; margin-bottom: 0;">
              If you have any questions about this estimate, please reply to this email or contact us directly.
            </p>
          </div>

          <div style="text-align: center; padding: 24px; color: #94a3b8; font-size: 12px;">
            <p style="margin: 0;">
              This estimate was sent via PRO SmartBuild
            </p>
          </div>
        </body>
      </html>
    `,
  });

  if (error) {
    console.error('Error sending email:', error);
    throw error;
  }

  return data;
}
