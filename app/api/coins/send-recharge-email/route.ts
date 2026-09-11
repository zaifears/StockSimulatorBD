// app/api/coins/send-recharge-email/route.ts
// Send email notification to admin when a coin recharge request is submitted

import { NextRequest, NextResponse } from 'next/server';
import { SITE_URL } from '@/lib/siteUrl';
import { sendAdminAlertEmail } from '@/lib/resendAdmin';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || SITE_URL;

interface EmailData {
  requestId: string;
  userName: string;
  userEmail: string;
  amount: number;
  coins: number;
  bonusCoins?: number;
  totalCoins?: number;
  isBoss?: boolean;
  accountTier?: string;
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

    const {
      requestId,
      userName,
      userEmail,
      amount,
      coins,
      bonusCoins = 0,
      totalCoins,
      isBoss = false,
      accountTier,
      transactionId,
      bkashNumber,
      createdAt,
    } = emailData;

    const finalCoins = totalCoins || (coins + bonusCoins);
    const tierLabel = isBoss || accountTier === 'Boss' ? '👑 Boss Tier (+10% Bonus)' : 'Bro Tier (Standard)';

    const emailResponse = await sendAdminAlertEmail({
      subject: `💰 New Coin Recharge Request - ${finalCoins.toLocaleString()} coins${isBoss ? ' (👑 Boss)' : ''} from ${userName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
          <div style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); padding: 20px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 22px; font-weight: 800;">💰 New Coin Recharge Request</h1>
            <p style="color: #bfdbfe; margin: 4px 0 0 0; font-size: 13px;">bKash manual payment received</p>
          </div>
          
          <div style="background: #ffffff; padding: 24px;">
            <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
              <tr>
                <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; font-weight: bold; color: #64748b;">User Name:</td>
                <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; color: #0f172a; font-weight: bold;">${userName}</td>
              </tr>
              <tr>
                <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; font-weight: bold; color: #64748b;">User Email:</td>
                <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; color: #0f172a;"><a href="mailto:${userEmail}" style="color: #2563eb; text-decoration: none;">${userEmail}</a></td>
              </tr>
              <tr>
                <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; font-weight: bold; color: #64748b;">Account Tier:</td>
                <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; color: ${isBoss ? '#b45309' : '#475569'}; font-weight: bold;">${tierLabel}</td>
              </tr>
              <tr>
                <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; font-weight: bold; color: #64748b;">Amount (BDT):</td>
                <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; color: #059669; font-size: 18px; font-weight: 800;">৳ ${amount}</td>
              </tr>
              <tr>
                <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; font-weight: bold; color: #64748b;">Coins to Credit:</td>
                <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; color: #2563eb; font-size: 16px; font-weight: bold;">
                  ${coins.toLocaleString()}
                  ${bonusCoins > 0 ? `<span style="color: #d97706; font-size: 13px; font-weight: 800;"> + ${bonusCoins.toLocaleString()} (👑 10% Boss Bonus) = ${finalCoins.toLocaleString()} Total</span>` : ''}
                </td>
              </tr>
              <tr>
                <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; font-weight: bold; color: #64748b;">Transaction ID:</td>
                <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; color: #0f172a; font-family: monospace; font-weight: bold; font-size: 15px; background: #f8fafc; padding-left: 6px;">${transactionId}</td>
              </tr>
              <tr>
                <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; font-weight: bold; color: #64748b;">bKash Number:</td>
                <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; color: #0f172a; font-family: monospace;">${bkashNumber}</td>
              </tr>
              <tr>
                <td style="padding: 10px 0; font-weight: bold; color: #64748b;">Submitted At:</td>
                <td style="padding: 10px 0; color: #64748b;">${new Date(createdAt).toLocaleString()}</td>
              </tr>
            </table>

            <div style="margin-top: 24px; text-align: center;">
              <a href="${APP_URL}/admin/recharge" style="display: inline-block; background: #2563eb; color: #ffffff; padding: 13px 26px; border-radius: 8px; text-decoration: none; font-weight: 800; font-size: 14px; box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.3);">
                ✅ Review & Approve in Admin Panel
              </a>
            </div>
          </div>

          <div style="background: #f7fafc; padding: 15px; font-size: 12px; color: #718096; text-align: center; border: 1px solid #e2e8f0; border-top: none;">
            <p style="margin: 0;">This is an automated notification from StockSimulatorBD.</p>
            <p style="margin: 5px 0 0 0;">Request ID: <code style="background: #edf2f7; padding: 2px 6px; border-radius: 3px;">${requestId}</code></p>
          </div>
        </div>
      `,
    });

    if (!emailResponse.success) {
      console.error('❌ Email sending failed:', emailResponse.error);
      return NextResponse.json(
        { success: false, error: 'Failed to send notification email' },
        { status: 500 }
      );
    }

    console.log(`✅ Email sent for request ${requestId}`);

    return NextResponse.json({
      success: true,
      message: 'Email notification sent successfully',
      emailId: emailResponse.emailId,
    });

  } catch (error: any) {
    console.error('❌ Email API error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
