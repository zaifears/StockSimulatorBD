// app/api/coins/send-recharge-email/route.ts
// Send email notification to admin when a coin recharge request is submitted

import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

// Admin email from environment
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'niqqahigga1@gmail.com';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://skilldash.com';

interface EmailData {
  requestId: string;
  userName: string;
  userEmail: string;
  amount: number;
  coins: number;
  transactionId: string;
  bkashNumber: string;
  createdAt: string;
}

export async function POST(request: NextRequest) {
  try {
    if (!process.env.RESEND_API_KEY) {
      console.error('❌ RESEND_API_KEY not configured');
      return NextResponse.json(
        { success: false, error: 'Email service not configured' },
        { status: 500 }
      );
    }

    const { emailData, recaptchaToken } = await request.json() as {
      emailData: EmailData;
      recaptchaToken?: string;
    };

    // Verify reCAPTCHA token if provided (optional but recommended)
    if (recaptchaToken) {
      try {
        const verifyResponse = await fetch(`${APP_URL}/api/verify-recaptcha`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: recaptchaToken, action: 'submit_recharge' }),
        });

        const verifyData = await verifyResponse.json();
        if (!verifyData.success) {
          return NextResponse.json(
            { success: false, error: 'reCAPTCHA verification failed' },
            { status: 403 }
          );
        }
      } catch (error) {
        console.error('reCAPTCHA verification error:', error);
        // Don't block email if verification fails - log and continue
      }
    }

    const { requestId, userName, userEmail, amount, coins, transactionId, bkashNumber, createdAt } = emailData;

    // Use the actual domain, or fallback to Resend's testing email if env var is missing
    const senderEmail = process.env.RESEND_FROM_EMAIL || 'SkillDash <noreply@skilldash.live>';

    // Safely parse CC emails if they exist
    const ccEmails = process.env.ADMIN_EMAIL_CC ? process.env.ADMIN_EMAIL_CC.split(',').map(e => e.trim()) : undefined;

    // Send email via Resend
    const emailResponse = await resend.emails.send({
      from: senderEmail,
      to: ADMIN_EMAIL,
      ...(ccEmails && ccEmails.length > 0 && { cc: ccEmails }),
      subject: `💰 New Coin Recharge Request - ${coins.toLocaleString()} coins from ${userName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; border-radius: 8px 8px 0 0;">
            <h1 style="color: white; margin: 0;">💰 New Recharge Request</h1>
          </div>
          
          <div style="background: #f7fafc; padding: 20px; border: 1px solid #e2e8f0;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; font-weight: bold; color: #2d3748;">User Name:</td>
                <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; color: #1a202c;">${userName}</td>
              </tr>
              <tr>
                <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; font-weight: bold; color: #2d3748;">User Email:</td>
                <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; color: #1a202c;"><a href="mailto:${userEmail}" style="color: #667eea; text-decoration: none;">${userEmail}</a></td>
              </tr>
              <tr>
                <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; font-weight: bold; color: #2d3748;">Amount (BDT):</td>
                <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; color: #1a202c; font-size: 18px; font-weight: bold;">৳ ${amount}</td>
              </tr>
              <tr>
                <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; font-weight: bold; color: #2d3748;">Coins to Credit:</td>
                <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; color: #667eea; font-size: 18px; font-weight: bold;">${coins.toLocaleString()}</td>
              </tr>
              <tr>
                <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; font-weight: bold; color: #2d3748;">Transaction ID:</td>
                <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; color: #1a202c; font-family: monospace; background: #edf2f7; padding: 8px;">${transactionId}</td>
              </tr>
              <tr>
                <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; font-weight: bold; color: #2d3748;">bKash Number:</td>
                <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; color: #1a202c; font-family: monospace; background: #edf2f7; padding: 8px;">${bkashNumber}</td>
              </tr>
              <tr>
                <td style="padding: 12px; font-weight: bold; color: #2d3748;">Submitted At:</td>
                <td style="padding: 12px; color: #718096;">${new Date(createdAt).toLocaleString()}</td>
              </tr>
            </table>
          </div>

          <div style="background: white; padding: 20px; text-align: center; border: 1px solid #e2e8f0; border-top: none;">
            <a href="${APP_URL}/admin" style="display: inline-block; background: #667eea; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold;">
              ✅ Review Request in Admin Panel
            </a>
          </div>

          <div style="background: #f7fafc; padding: 15px; font-size: 12px; color: #718096; text-align: center; border: 1px solid #e2e8f0; border-top: none;">
            <p style="margin: 0;">This is an automated notification from SkillDash.</p>
            <p style="margin: 5px 0 0 0;">Request ID: <code style="background: #edf2f7; padding: 2px 6px; border-radius: 3px;">${requestId}</code></p>
          </div>
        </div>
      `,
    });

    if (emailResponse.error) {
      console.error('❌ Email sending failed:', emailResponse.error);
      return NextResponse.json(
        { success: false, error: 'Failed to send notification email' },
        { status: 500 }
      );
    }

    console.log(`✅ Email sent to ${ADMIN_EMAIL} for request ${requestId}`);

    return NextResponse.json({
      success: true,
      message: 'Email notification sent successfully',
      emailId: emailResponse.data?.id,
    });

  } catch (error: any) {
    console.error('❌ Email API error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
