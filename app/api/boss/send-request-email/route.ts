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
  paymentMethod?: string;
  paymentTab?: string;
  bankName?: string;
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
      paymentMethod,
      paymentTab,
      bankName,
      createdAt,
    } = emailData;

    const isBank = Boolean(
      paymentMethod?.toLowerCase().includes('bank') ||
      paymentMethod?.toLowerCase().includes('scb') ||
      (paymentTab === 'other' && bkashNumber === '18246161201')
    );

    let destinationAccount = 'bKash Personal (01865333143)';
    if (isBank) {
      destinationAccount = 'Standard Chartered Bank PLC (A/C: 18246161201, Branch: Motijheel)';
    } else if (paymentTab === 'bkash_pay' || paymentMethod?.toLowerCase().includes('payment')) {
      destinationAccount = 'bKash Merchant / Make Payment (01581401895)';
    } else if (paymentMethod?.toLowerCase().includes('other mfs') || paymentMethod?.toLowerCase().includes('nagad') || paymentMethod?.toLowerCase().includes('rocket') || paymentMethod?.toLowerCase().includes('cellfin')) {
      destinationAccount = 'Cellfin / Nagad / Rocket (01865333143)';
    }

    const emailResponse = await sendAdminAlertEmail({
      subject: `👑 [${paymentMethod || 'bKash Send Money'}] Boss Upgrade: ${planName} (৳${amount}) from ${userName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
          <div style="background: ${isBank ? 'linear-gradient(135deg, #1e40af 0%, #1e3a8a 100%)' : 'linear-gradient(135deg, #d97706 0%, #b45309 100%)'}; padding: 24px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 800; letter-spacing: 0.5px;">
              👑 New Boss Tier Upgrade Request
            </h1>
            <p style="color: #fef3c7; margin: 6px 0 0 0; font-size: 13px;">
              via ${paymentMethod || 'bKash Send Money'}
            </p>
          </div>
          
          <div style="background: #ffffff; padding: 24px;">
            {/* Prominent Fund Origin Box */}
            <div style="background: ${isBank ? '#eff6ff' : '#fefce8'}; border: 2px solid ${isBank ? '#3b82f6' : '#f59e0b'}; border-radius: 10px; padding: 14px 18px; margin-bottom: 20px;">
              <div style="font-size: 11px; font-weight: 800; text-transform: uppercase; color: ${isBank ? '#1d4ed8' : '#b45309'}; letter-spacing: 0.5px;">
                Fund Source & Destination
              </div>
              <div style="font-size: 16px; font-weight: 800; color: #0f172a; margin-top: 3px;">
                ${paymentMethod || 'bKash Send Money'}
              </div>
              <div style="font-size: 13px; color: #334155; margin-top: 4px;">
                <strong>Deposit Target:</strong> ${destinationAccount}
              </div>
              ${isBank ? `
                <div style="margin-top: 10px; padding: 10px 12px; background: #dbeafe; border-radius: 6px; font-size: 12px; color: #1e40af; line-height: 1.5;">
                  <strong>🏦 Bank Transfer Notice:</strong> Trader reported Sending Bank & Reference:<br/>
                  ${bankName ? `<div style="margin-top: 4px;"><strong>Bank:</strong> <span style="font-weight: 800; color: #1e3a8a;">${bankName}</span></div>` : ''}
                  <code style="font-weight: bold; background: white; padding: 4px 8px; border-radius: 4px; color: #0f172a; font-size: 13px; display: inline-block; margin-top: 4px; border: 1px solid #93c5fd;">${transactionId}</code><br/>
                  Please check your <strong>Standard Chartered Bank PLC</strong> account/app to confirm receipt of <strong>৳ ${amount}</strong> before activating Boss tier.
                </div>
              ` : ''}
            </div>

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
                <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; color: #64748b; font-weight: bold;">Payment Method:</td>
                <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; color: #0f172a; font-weight: bold;">
                  ${paymentMethod || 'bKash Send Money'}
                </td>
              </tr>
              ${bankName ? `
              <tr>
                <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; color: #64748b; font-weight: bold;">Sending Bank:</td>
                <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; color: #1e40af; font-weight: 800;">🏦 ${bankName}</td>
              </tr>
              ` : ''}
              <tr>
                <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; color: #64748b; font-weight: bold;">Payment Amount:</td>
                <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; color: #059669; font-size: 18px; font-weight: 800;">
                  ৳ ${amount}
                </td>
              </tr>
              <tr>
                <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; color: #64748b; font-weight: bold;">Transaction ID / Ref:</td>
                <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; color: #0f172a; font-family: monospace; font-size: 15px; font-weight: bold; background: #f8fafc; padding-left: 8px;">
                  ${transactionId}
                </td>
              </tr>
              <tr>
                <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; color: #64748b; font-weight: bold;">${paymentMethod && paymentMethod.includes('Bank') ? 'Sender Account / Reference:' : 'Sender Number:'}</td>
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
