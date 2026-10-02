// app/api/boss/send-request-email/route.ts
// Send email notification to admin when a Boss tier upgrade request is submitted

import { NextRequest, NextResponse } from 'next/server';
import { SITE_URL } from '@/lib/siteUrl';
import { sendAdminAlertEmail } from '@/lib/resendAdmin';
import { sendTelegramBossAlert, pingUptimeKumaPush } from '@/lib/telegramAdmin';
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
    const isRateAllowed = await checkPersistentRateLimit(`boss-email:${uid}`, {
      maxRequests: 3,
      windowMs: 60_000,
    });
    if (!isRateAllowed) {
      return NextResponse.json(
        { success: false, error: 'Too many notification attempts. Please wait a minute.' },
        { status: 429 }
      );
    }

    const { emailData } = await request.json() as { emailData: BossEmailData };

    if (!emailData || !emailData.requestId || !emailData.transactionId) {
      return NextResponse.json(
        { success: false, error: 'Missing required emailData fields' },
        { status: 400 }
      );
    }

    // 🔒 3. Verify request document existence and ownership in Firestore
    const db = getAdminDb();
    const requestSnap = await db.collection('boss_requests').doc(emailData.requestId).get();
    if (!requestSnap.exists) {
      return NextResponse.json(
        { success: false, error: 'Boss upgrade request not found' },
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

    // 🔒 4. Authoritative Data Derivation:
    // Read financial & security fields directly from the verified Firestore requestDoc,
    // preventing any client-side payload tampering of amount, durationDays, or TrxID.
    const authoritativeAmount =
      typeof requestDoc.amount === 'number' ? requestDoc.amount : (Number(emailData.amount) || 20);
    const authoritativeDuration =
      typeof requestDoc.durationDays === 'number' ? requestDoc.durationDays : (Number(emailData.durationDays) || 31);
    const authoritativePlanName =
      authoritativeDuration === 185
        ? '6 Months (185 Days, Save 18%)'
        : '1 Month (31 Days)';
    const authoritativeTrxId = String(requestDoc.transactionId || emailData.transactionId || '').trim();
    const authoritativePhone = String(
      requestDoc.senderPhone ||
      requestDoc.whatsappNumber ||
      emailData.senderPhone ||
      emailData.whatsappNumber ||
      ''
    ).trim();
    const authoritativeMethod = String(requestDoc.paymentMethod || emailData.paymentMethod || 'BanglaQR').trim();
    const authoritativeTab = String(requestDoc.paymentTab || emailData.paymentTab || 'banglaqr').trim();
    const authoritativeBank = requestDoc.bankName
      ? String(requestDoc.bankName).trim()
      : (emailData.bankName ? String(emailData.bankName).trim() : undefined);
    const authoritativeCreatedAt = requestDoc.createdAt
      ? (typeof requestDoc.createdAt.toDate === 'function'
          ? requestDoc.createdAt.toDate().toISOString()
          : new Date(requestDoc.createdAt).toISOString())
      : new Date().toISOString();

    const userSnap = await db.collection('users').doc(uid).get();
    const userData = userSnap.data();

    // 🔒 5. HTML Sanitize inputs before injecting into email/telegram templates
    const userName = escapeHtml(emailData.userName || userData?.displayName || decodedToken.name || 'Trader');
    const userEmail = escapeHtml(emailData.userEmail || userData?.email || decodedToken.email || '');
    const planName = escapeHtml(authoritativePlanName);
    const transactionId = escapeHtml(authoritativeTrxId);
    const senderPhone = escapeHtml(authoritativePhone);
    const whatsappNumber = escapeHtml(authoritativePhone);
    const paymentMethod = escapeHtml(authoritativeMethod);
    const paymentTab = escapeHtml(authoritativeTab);
    const bankName = authoritativeBank ? escapeHtml(authoritativeBank) : undefined;
    const amount = authoritativeAmount;
    const durationDays = authoritativeDuration;
    const createdAt = authoritativeCreatedAt;
    const requestId = emailData.requestId;

    let destinationAccount = 'bKash Personal (01865333143)';
    if (paymentTab === 'banglaqr' || paymentMethod?.toLowerCase().includes('banglaqr')) {
      destinationAccount = 'BanglaQR Interoperable Code (StockSimulatorBD)';
    } else if (paymentMethod?.toLowerCase().includes('bank') || paymentMethod?.toLowerCase().includes('scb') || (paymentTab === 'other' && emailData.bkashNumber === '18246161201')) {
      destinationAccount = 'Standard Chartered Bank PLC (A/C: 18246161201, Branch: Motijheel)';
    } else if (paymentTab === 'bkash_pay' || paymentMethod?.toLowerCase().includes('payment')) {
      destinationAccount = 'bKash Merchant / Make Payment (01581401895)';
    } else if (paymentMethod?.toLowerCase().includes('other mfs') || paymentMethod?.toLowerCase().includes('nagad') || paymentMethod?.toLowerCase().includes('rocket') || paymentMethod?.toLowerCase().includes('cellfin')) {
      destinationAccount = 'Cellfin / Nagad / Rocket (01865333143)';
    }

    const bkashNumber = escapeHtml(emailData.bkashNumber || destinationAccount);

    const isBank = Boolean(
      paymentMethod?.toLowerCase().includes('bank') ||
      paymentMethod?.toLowerCase().includes('scb') ||
      (paymentTab === 'other' && emailData.bkashNumber === '18246161201')
    );

    const emailPromise = sendAdminAlertEmail({
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
              ${whatsappNumber ? `
              <tr>
                <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; color: #64748b; font-weight: bold;">WhatsApp / Phone:</td>
                <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; color: #059669; font-weight: 800; font-family: monospace;">
                  <a href="https://wa.me/${whatsappNumber.replace(/[^0-9]/g, '')}" target="_blank" style="color: #059669; text-decoration: underline;">
                    ${whatsappNumber} 💬 (Open WhatsApp)
                  </a>
                </td>
              </tr>
              ` : ''}
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

    // 🚀 Dispatch Email, Telegram, and Uptime Kuma alerts concurrently
    const [emailResult, telegramResult, kumaResult] = await Promise.allSettled([
      emailPromise,
      sendTelegramBossAlert({
        userName,
        userEmail,
        planName,
        amount,
        durationDays,
        paymentMethod,
        destinationAccount,
        transactionId,
        senderPhone: senderPhone || whatsappNumber,
        bankName,
      }),
      pingUptimeKumaPush(`Boss Upgrade: ৳${amount} (${planName}) by ${userName}`),
    ]);

    const emailSent =
      emailResult.status === 'fulfilled' && emailResult.value.success;
    const telegramSent =
      telegramResult.status === 'fulfilled' && telegramResult.value.success;

    if (!emailSent && emailResult.status === 'fulfilled' && emailResult.value.error) {
      console.warn('⚠️ Admin notification email failed:', emailResult.value.error);
    }
    if (
      !telegramSent &&
      telegramResult.status === 'fulfilled' &&
      telegramResult.value.error &&
      !telegramResult.value.skipped
    ) {
      console.warn('⚠️ Admin Telegram alert failed:', telegramResult.value.error);
    }

    return NextResponse.json({
      success: true,
      message: 'Admin notification processed',
      emailSent,
      telegramSent,
      emailId:
        emailResult.status === 'fulfilled' ? emailResult.value.emailId : undefined,
    });
  } catch (error: any) {
    console.error('❌ Boss email error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
