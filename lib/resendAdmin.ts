// lib/resendAdmin.ts
// Shared "send an email to the site admin via Resend" helper — the same
// Resend/ADMIN_EMAIL/CC/sender-address logic app/api/coins/send-recharge-email
// used to inline, now shared with app/api/price-failsafe-sync's DSE-scraper-
// down alert. Server-only: never import this from client code, it needs
// RESEND_API_KEY.

import { Resend } from 'resend';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'alshahoriar.hossain@gmail.com';

export interface SendAdminAlertResult {
  success: boolean;
  emailId?: string;
  error?: string;
}

export async function sendAdminAlertEmail({
  subject,
  html,
}: {
  subject: string;
  html: string;
}): Promise<SendAdminAlertResult> {
  if (!process.env.RESEND_API_KEY) {
    return { success: false, error: 'RESEND_API_KEY not configured' };
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const senderEmail = process.env.RESEND_FROM_EMAIL || 'StockSimulatorBD <noreply@stocksimulator.tech>';
  const ccEmails = process.env.ADMIN_EMAIL_CC
    ? process.env.ADMIN_EMAIL_CC.split(',').map((e) => e.trim())
    : undefined;

  try {
    const response = await resend.emails.send({
      from: senderEmail,
      to: ADMIN_EMAIL,
      ...(ccEmails && ccEmails.length > 0 && { cc: ccEmails }),
      subject,
      html,
    });

    if (response.error) {
      return { success: false, error: response.error.message };
    }

    return { success: true, emailId: response.data?.id };
  } catch (error: any) {
    return { success: false, error: error?.message || 'Unknown Resend error' };
  }
}
