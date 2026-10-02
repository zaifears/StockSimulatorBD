// app/api/coins/send-recharge-email/route.ts
// Send email notification to admin when a coin recharge request is submitted

import { NextRequest, NextResponse } from 'next/server';
import { SITE_URL } from '@/lib/siteUrl';
import { sendAdminAlertEmail } from '@/lib/resendAdmin';
import { getAdminAuth, getAdminDb } from '@/lib/firebaseAdmin';
import { checkPersistentRateLimit } from '@/lib/utils/persistentRateLimit';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || SITE_URL;

function escapeHtml(str: unknown): string {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

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
  senderPhone?: string;
  whatsappNumber?: string;
  paymentMethod?: string;
  paymentTab?: string;
  bankName?: string;
  createdAt: string;
}

export async function POST(request: NextRequest) {
  try {
    // 🔒 1. Authentication Check
    const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Authentication required' },
        { status: 401 }
      );
    }
    const token = authHeader.substring(7).trim();
    let decodedToken;
    try {
      decodedToken = await getAdminAuth().verifyIdToken(token);
    } catch {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Invalid authentication session' },
        { status: 401 }
      );
    }
    const uid = decodedToken.uid;

    // 🔒 2. Rate Limiting: Max 3 email notifications per user per minute
    const isRateAllowed = await checkPersistentRateLimit(`recharge-email:${uid}`, {
      maxRequests: 3,
      windowMs: 60_000,
    });
    if (!isRateAllowed) {
      return NextResponse.json(
        { success: false, error: 'Too many notification attempts. Please wait a minute.' },
        { status: 429 }
      );
    }

    if (!process.env.RESEND_API_KEY) {
      console.error('❌ RESEND_API_KEY not configured');
      return NextResponse.json(
        { success: false, error: 'Email service not configured' },
        { status: 500 }
      );
    }

    const { emailData } = await request.json() as {
      emailData: EmailData;
    };

    if (!emailData || !emailData.requestId || !emailData.transactionId) {
      return NextResponse.json(
        { success: false, error: 'Missing required emailData fields' },
        { status: 400 }
      );
    }

    // 🔒 3. Verify request document existence and ownership in Firestore
    const db = getAdminDb();
    const requestSnap = await db.collection('recharge_requests').doc(emailData.requestId).get();
    if (!requestSnap.exists) {
      return NextResponse.json(
        { success: false, error: 'Recharge request not found' },
        { status: 404 }
      );
    }
    const requestDoc = requestSnap.data();
    if (requestDoc?.userId !== uid) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Request does not belong to authenticated user' },
        { status: 403 }
      );
    }

    const {
      requestId,
      userName: rawUserName,
      userEmail: rawUserEmail,
      amount,
      coins,
      bonusCoins = 0,
      totalCoins,
      isBoss = false,
      accountTier: rawAccountTier,
      transactionId: rawTransactionId,
      bkashNumber: rawBkashNumber,
      senderPhone: rawSenderPhone,
      whatsappNumber: rawWhatsappNumber,
      paymentMethod: rawPaymentMethod,
      paymentTab: rawPaymentTab,
      bankName: rawBankName,
      createdAt,
    } = emailData;

    // 🔒 4. HTML Sanitize inputs before injecting into email templates
    const userName = escapeHtml(rawUserName || decodedToken.name || 'User');
    const userEmail = escapeHtml(rawUserEmail || decodedToken.email || '');
    const accountTier = escapeHtml(rawAccountTier || 'Bro');
    const transactionId = escapeHtml(rawTransactionId);
    const bkashNumber = escapeHtml(rawBkashNumber);
    const senderPhone = escapeHtml(rawSenderPhone || rawWhatsappNumber || '');
    const whatsappNumber = escapeHtml(rawWhatsappNumber || rawSenderPhone || '');
    const paymentMethod = escapeHtml(rawPaymentMethod);
    const paymentTab = escapeHtml(rawPaymentTab);
    const bankName = escapeHtml(rawBankName);

    const finalCoins = totalCoins || (coins + bonusCoins);
    const tierLabel = isBoss || accountTier === 'Boss' ? '👑 Boss Tier (+10% Bonus)' : 'Bro Tier (Standard)';

    const isBank = Boolean(
      paymentMethod?.toLowerCase().includes('bank') ||
      paymentMethod?.toLowerCase().includes('scb') ||
      (paymentTab === 'other' && bkashNumber === '18246161201')
    );

    let destinationAccount = 'bKash Personal (01865333143)';
    if (paymentTab === 'banglaqr' || paymentMethod?.toLowerCase().includes('banglaqr')) {
      destinationAccount = 'BanglaQR Interoperable Code (StockSimulatorBD)';
    } else if (isBank) {
      destinationAccount = 'Standard Chartered Bank PLC (A/C: 18246161201, Branch: Motijheel)';
    } else if (paymentTab === 'bkash_pay' || paymentMethod?.toLowerCase().includes('payment')) {
      destinationAccount = 'bKash Merchant / Make Payment (01581401895)';
    } else if (paymentMethod?.toLowerCase().includes('other mfs') || paymentMethod?.toLowerCase().includes('nagad') || paymentMethod?.toLowerCase().includes('rocket') || paymentMethod?.toLowerCase().includes('cellfin')) {
      destinationAccount = 'Cellfin / Nagad / Rocket (01865333143)';
    }

    const emailResponse = await sendAdminAlertEmail({
      subject: `💰 [${paymentMethod || 'bKash Send Money'}] Recharge ৳${amount} (${finalCoins.toLocaleString()} coins) from ${userName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
          <div style="background: ${isBank ? 'linear-gradient(135deg, #1e40af 0%, #1e3a8a 100%)' : 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)'}; padding: 20px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 22px; font-weight: 800;">💰 New Coin Recharge Request</h1>
            <p style="color: #bfdbfe; margin: 4px 0 0 0; font-size: 13px;">via ${paymentMethod || 'bKash Send Money'}</p>
          </div>
          
          <div style="background: #ffffff; padding: 24px;">
            {/* Prominent Fund Origin Box */}
            <div style="background: ${isBank ? '#eff6ff' : '#f8fafc'}; border: 2px solid ${isBank ? '#3b82f6' : '#e2e8f0'}; border-radius: 10px; padding: 14px 18px; margin-bottom: 20px;">
              <div style="font-size: 11px; font-weight: 800; text-transform: uppercase; color: ${isBank ? '#1d4ed8' : '#64748b'}; letter-spacing: 0.5px;">
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
                  Please check your <strong>Standard Chartered Bank PLC</strong> account/app to confirm receipt of <strong>৳ ${amount}</strong> before approving.
                </div>
              ` : ''}
            </div>

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
                <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; font-weight: bold; color: #64748b;">Payment Method:</td>
                <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; color: #0f172a; font-weight: bold;">${paymentMethod || 'bKash Send Money'}</td>
              </tr>
              ${bankName ? `
              <tr>
                <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; font-weight: bold; color: #64748b;">Sending Bank:</td>
                <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; color: #1e40af; font-weight: 800;">🏦 ${bankName}</td>
              </tr>
              ` : ''}
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
                <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; font-weight: bold; color: #64748b;">Transaction ID / Ref:</td>
                <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; color: #0f172a; font-family: monospace; font-weight: bold; font-size: 15px; background: #f8fafc; padding-left: 6px;">${transactionId}</td>
              </tr>
              <tr>
                <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; font-weight: bold; color: #64748b;">${paymentMethod && paymentMethod.includes('Bank') ? 'Sender Account / Reference:' : 'Sender Number:'}</td>
                <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; color: #0f172a; font-family: monospace;">${bkashNumber}</td>
              </tr>
              ${whatsappNumber ? `
              <tr>
                <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; font-weight: bold; color: #64748b;">WhatsApp / Phone:</td>
                <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; color: #059669; font-weight: 800; font-family: monospace;">
                  <a href="https://wa.me/${whatsappNumber.replace(/[^0-9]/g, '')}" target="_blank" style="color: #059669; text-decoration: underline;">
                    ${whatsappNumber} 💬 (Open WhatsApp)
                  </a>
                </td>
              </tr>
              ` : ''}
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
