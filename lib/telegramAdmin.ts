// lib/telegramAdmin.ts
// Server-only helper to send administrative alerts directly to Telegram
// via Telegram Bot API, with optional fallback/ping to Uptime Kuma push URLs.

import { SITE_URL } from './siteUrl';

export interface SendTelegramAlertResult {
  success: boolean;
  messageId?: number;
  error?: string;
  skipped?: boolean;
}

export interface TelegramBossAlertData {
  userName: string;
  userEmail: string;
  planName: string;
  amount: number;
  durationDays: number;
  paymentMethod?: string;
  destinationAccount?: string;
  transactionId: string;
  senderPhone?: string;
  bankName?: string;
}

export interface TelegramRechargeAlertData {
  userName: string;
  userEmail: string;
  amount: number;
  coins: number;
  bonusCoins?: number;
  totalCoins?: number;
  isBoss?: boolean;
  accountTier?: string;
  paymentMethod?: string;
  destinationAccount?: string;
  transactionId: string;
  senderPhone?: string;
  bankName?: string;
}

function escapeTelegramHtml(str: unknown, maxLen = 120): string {
  if (typeof str !== 'string') return '';
  const truncated = str.trim().slice(0, maxLen);
  return truncated
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Sends a direct message via Telegram Bot API to the configured ADMIN chat.
 * Requires TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID environment variables.
 */
export async function sendTelegramAdminMessage({
  text,
  parseMode = 'HTML',
  disableWebPagePreview = true,
}: {
  text: string;
  parseMode?: 'HTML' | 'MarkdownV2';
  disableWebPagePreview?: boolean;
}): Promise<SendTelegramAlertResult> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN?.trim();
  const chatId = process.env.TELEGRAM_CHAT_ID?.trim();
  const topicId =
    process.env.TELEGRAM_TOPIC_ID?.trim() ||
    process.env.TELEGRAM_MESSAGE_THREAD_ID?.trim();

  if (!botToken || !chatId) {
    return {
      success: false,
      skipped: true,
      error: 'TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID not configured',
    };
  }

  try {
    const payload: Record<string, any> = {
      chat_id: chatId,
      text: text.slice(0, 4000), // Hard guard against Telegram 4096-char payload limits
      parse_mode: parseMode,
      disable_web_page_preview: disableWebPagePreview,
    };

    if (topicId && !isNaN(Number(topicId))) {
      payload.message_thread_id = Number(topicId);
    }

    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(6000),
    });

    const data = await response.json();
    if (!response.ok || !data.ok) {
      console.error('❌ Telegram Bot API error:', data.description || response.statusText);
      return {
        success: false,
        error: data.description || `HTTP ${response.status}`,
      };
    }

    return {
      success: true,
      messageId: data.result?.message_id,
    };
  } catch (err: any) {
    console.error('❌ Telegram fetch failed:', err?.message);
    return {
      success: false,
      error: err?.message || 'Network error sending Telegram message',
    };
  }
}

/**
 * Pings Uptime Kuma push monitor or custom webhook URL if configured.
 * Useful for keeping an Uptime Kuma event monitor green or forwarding to status.shahoriar.bd.
 */
export async function pingUptimeKumaPush(
  message?: string
): Promise<{ success: boolean; error?: string; skipped?: boolean }> {
  const pushUrl =
    process.env.UPTIME_KUMA_PUSH_URL?.trim() ||
    process.env.STATUS_PUSH_URL?.trim();

  if (!pushUrl) {
    return { success: false, skipped: true };
  }

  // Strict SSRF guard: ensure protocol is HTTP or HTTPS
  if (!pushUrl.startsWith('https://') && !pushUrl.startsWith('http://')) {
    return { success: false, error: 'Invalid push monitor URL protocol' };
  }

  try {
    const url = new URL(pushUrl);
    url.searchParams.set('status', 'up');
    if (message) {
      url.searchParams.set('msg', message.slice(0, 100));
    }
    url.searchParams.set('ping', '1');

    const res = await fetch(url.toString(), {
      method: 'GET',
      signal: AbortSignal.timeout(4000),
    });

    return { success: res.ok };
  } catch (err: any) {
    return { success: false, error: err?.message };
  }
}

/**
 * Dispatches a formatted Boss Tier request notification to Telegram.
 */
export async function sendTelegramBossAlert(
  data: TelegramBossAlertData
): Promise<SendTelegramAlertResult> {
  const userName = escapeTelegramHtml(data.userName, 60);
  const userEmail = escapeTelegramHtml(data.userEmail, 80);
  const planName = escapeTelegramHtml(data.planName, 60);
  const method = escapeTelegramHtml(data.paymentMethod || 'BanglaQR', 60);
  const destination = escapeTelegramHtml(
    data.destinationAccount || 'StockSimulatorBD',
    80
  );
  const trxId = escapeTelegramHtml(data.transactionId, 60);
  const rawPhone = data.senderPhone ? data.senderPhone.trim() : '';
  const phoneEscaped = rawPhone ? escapeTelegramHtml(rawPhone, 30) : null;
  const rawDigits = rawPhone.replace(/[^0-9]/g, '');
  const bank = data.bankName ? escapeTelegramHtml(data.bankName, 60) : null;
  const adminUrl = `${SITE_URL}/admin/tier`;

  const phoneLine = phoneEscaped
    ? (rawDigits.length >= 10
        ? `📱 <b>Phone / WhatsApp:</b> <code>${phoneEscaped}</code> (<a href="https://wa.me/${rawDigits}">Chat</a>)`
        : `📱 <b>Phone:</b> <code>${phoneEscaped}</code>`)
    : `📱 <b>Phone:</b> <i>Not provided</i>`;

  const lines = [
    `👑 <b>NEW BOSS TIER REQUEST</b>`,
    ``,
    `👤 <b>Trader:</b> ${userName}`,
    `📧 <b>Email:</b> ${userEmail}`,
    `💎 <b>Plan:</b> ${planName} (${data.durationDays} Days)`,
    `💵 <b>Amount:</b> ৳${data.amount.toFixed(2)} BDT`,
    `💳 <b>Method:</b> ${method}`,
    `🎯 <b>Target:</b> ${destination}`,
    ...(bank ? [`🏦 <b>Bank:</b> ${bank}`] : []),
    `🔢 <b>TrxID / Ref:</b> <code>${trxId}</code>`,
    phoneLine,
    ``,
    `🔗 <a href="${adminUrl}">Open Admin Panel to Review</a>`,
  ];

  return sendTelegramAdminMessage({ text: lines.join('\n') });
}

/**
 * Dispatches a formatted Coin Recharge request notification to Telegram.
 */
export async function sendTelegramRechargeAlert(
  data: TelegramRechargeAlertData
): Promise<SendTelegramAlertResult> {
  const userName = escapeTelegramHtml(data.userName, 60);
  const userEmail = escapeTelegramHtml(data.userEmail, 80);
  const amount = data.amount.toFixed(2);
  const totalCoins = (data.totalCoins || data.coins).toLocaleString();
  const bonusCoins = data.bonusCoins
    ? `(+${data.bonusCoins.toLocaleString()} bonus)`
    : '';
  const tier =
    data.isBoss || data.accountTier === 'Boss'
      ? '👑 Boss Tier (+10%)'
      : 'Bro Tier';
  const method = escapeTelegramHtml(data.paymentMethod || 'BanglaQR', 60);
  const destination = escapeTelegramHtml(
    data.destinationAccount || 'StockSimulatorBD',
    80
  );
  const trxId = escapeTelegramHtml(data.transactionId, 60);
  const rawPhone = data.senderPhone ? data.senderPhone.trim() : '';
  const phoneEscaped = rawPhone ? escapeTelegramHtml(rawPhone, 30) : null;
  const rawDigits = rawPhone.replace(/[^0-9]/g, '');
  const bank = data.bankName ? escapeTelegramHtml(data.bankName, 60) : null;
  const adminUrl = `${SITE_URL}/admin/recharge/pending`;

  const phoneLine = phoneEscaped
    ? (rawDigits.length >= 10
        ? `📱 <b>Phone / WhatsApp:</b> <code>${phoneEscaped}</code> (<a href="https://wa.me/${rawDigits}">Chat</a>)`
        : `📱 <b>Phone:</b> <code>${phoneEscaped}</code>`)
    : `📱 <b>Phone:</b> <i>Not provided</i>`;

  const lines = [
    `💰 <b>NEW COIN RECHARGE REQUEST</b>`,
    ``,
    `👤 <b>Trader:</b> ${userName}`,
    `📧 <b>Email:</b> ${userEmail}`,
    `🏷️ <b>Tier:</b> ${tier}`,
    `💵 <b>Amount:</b> ৳${amount} BDT`,
    `🪙 <b>Coins:</b> ${totalCoins} ${bonusCoins}`.trim(),
    `💳 <b>Method:</b> ${method}`,
    `🎯 <b>Target:</b> ${destination}`,
    ...(bank ? [`🏦 <b>Bank:</b> ${bank}`] : []),
    `🔢 <b>TrxID:</b> <code>${trxId}</code>`,
    phoneLine,
    ``,
    `🔗 <a href="${adminUrl}">Open Admin Panel to Review</a>`,
  ];

  return sendTelegramAdminMessage({ text: lines.join('\n') });
}
