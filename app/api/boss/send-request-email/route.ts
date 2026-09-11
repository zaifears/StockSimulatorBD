// app/api/boss/send-request-email/route.ts
// Send email notification to admin when a Boss tier upgrade request is submitted

import { NextRequest, NextResponse } from 'next/server';
import { SITE_URL } from '@/lib/siteUrl';
import { sendAdminAlertEmail } from '@/lib/resendAdmin';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || SITE_URL;

interface BossEmailData {
  requestId: string;
  userName: string;
  userEmail: string;
  planId: string;
  planName: string;
  amount: number;
  durationDays: number;
  transactionId: string;
  bkashNumber: string;
  createdAt: string;
}

export async function POST(request: NextRequest) {
  try {
    if (!process.env.RESEND_API_KEY) {
      console.warn('⚠️ RESEND_API_KEY not configured — skipping admin email');
      return NextResponse.json(
        { success: true, warning: 'Email service not configured' }
      );
    }

    const { emailData } = await request.json() as { emailData: BossEmailData };

    if (!emailData || !emailData.requestId || !emailData.transactionId) {
      return NextResponse.json(
        { success: false, error: 'Missing required emailData fields' },
        { status: 400 }
      );
    }

    const {
      requestId,
      userName,
      userEmail,
      planName,
      amount,
      durationDays,
      transactionId,
      bkashNumber,
      createdAt,
    } = emailData;

    const emailResponse = await sendAdminAlertEmail({
      subject: `👑 New Boss Tier Upgrade Request - ${planName} (৳${amount}) from ${userName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
          <div style="background: linear-gradient(135deg, #d97706 0%, #b45309 100%); padding: 24px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 800; letter-spacing: 0.5px;">
              👑 New Boss Tier Upgrade Request
            </h1>
            <p style="color: #fef3c7; margin: 6px 0 0 0; font-size: 13px;">
              A trader wants to level up to Boss status!
            </p>
          </div>
          
          <div style="background: #ffffff; padding: 24px;">
            <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
              <tr>
                <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; color: #64748b; font-weight: bold;">User Name:</td>
                <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; color: #0f172a; font-weight: bold;">${userName}</td>
              </tr>
              <tr>
                <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; color: #64748b; font-weight: bold;">User Email:</td>
                <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; color: #0f172a;">
                  <a href="mailto:${userEmail}" style="color: #d97706; text-decoration: none;">${userEmail}</a>
                </td>
              </tr>
              <tr>
                <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; color: #64748b; font-weight: bold;">Selected Plan:</td>
                <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; color: #b45309; font-weight: 800;">
                  ${planName} (${durationDays} Days)
                </td>
              </tr>
              <tr>
                <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; color: #64748b; font-weight: bold;">Payment Amount:</td>
                <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; color: #059669; font-size: 18px; font-weight: 800;">
                  ৳ ${amount}
                </td>
              </tr>
              <tr>
                <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; color: #64748b; font-weight: bold;">bKash TrxID:</td>
                <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; color: #0f172a; font-family: monospace; font-size: 15px; font-weight: bold; background: #f8fafc; padding-left: 8px;">
                  ${transactionId}
                </td>
              </tr>
              <tr>
                <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; color: #64748b; font-weight: bold;">bKash Recipient:</td>
                <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; color: #0f172a; font-family: monospace;">
                  ${bkashNumber}
                </td>
              </tr>
              <tr>
                <td style="padding: 10px 0; color: #64748b; font-weight: bold;">Submitted At:</td>
                <td style="padding: 10px 0; color: #64748b;">
                  ${new Date(createdAt).toLocaleString()}
                </td>
              </tr>
            </table>

            <div style="margin-top: 24px; text-align: center;">
              <a href="${APP_URL}/admin/tier" style="display: inline-block; background: #d97706; color: #ffffff; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 800; font-size: 14px; box-shadow: 0 4px 6px -1px rgba(217, 119, 6, 0.3);">
                👑 Review & Approve in Admin Panel
              </a>
            </div>
          </div>

          <div style="background: #f8fafc; padding: 16px; font-size: 12px; color: #94a3b8; text-align: center; border-top: 1px solid #e2e8f0;">
            <p style="margin: 0;">StockSimulatorBD automated tier subscription notification.</p>
            <p style="margin: 4px 0 0 0;">Request ID: <code>${requestId}</code></p>
          </div>
        </div>
      `,
    });

    if (!emailResponse.success) {
      console.warn('⚠️ Admin notification email failed:', emailResponse.error);
    }

    return NextResponse.json({
      success: true,
      message: 'Admin notification email processed',
      emailId: emailResponse.emailId,
    });
  } catch (error: any) {
    console.error('❌ Boss email error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
