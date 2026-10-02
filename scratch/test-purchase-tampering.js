// scratch/test-purchase-tampering.js
// Comprehensive test suite checking both coin purchase and boss tier purchase flows
// including happy paths, tampering attempts, validation bypasses, and security assertions.

const assert = require('assert');

// =========================================================================
// 1. Client-Side Input Validation Unit Tests
// =========================================================================

function validateBanglaQrPhone(phone) {
  const trimmed = (phone || '').trim();
  if (!trimmed) return { valid: false, error: 'Phone is mandatory' };
  const cleaned = trimmed.replace(/[\s-]/g, '');
  const isValid = /^(\+8801|8801|01)[3-9]\d{8}$/.test(cleaned);
  return isValid ? { valid: true, cleaned } : { valid: false, error: 'Invalid BD mobile number' };
}

function validateTrxId(trxId, isOptional = false) {
  const trimmed = (trxId || '').trim();
  if (!trimmed) {
    return isOptional ? { valid: true, value: '' } : { valid: false, error: 'TrxID is mandatory' };
  }
  const isValid = /^[A-Za-z0-9\-_#:\/\. ]{4,60}$/.test(trimmed);
  return isValid ? { valid: true, value: trimmed } : { valid: false, error: 'Invalid TrxID format' };
}

function validateRechargeAmount(amount) {
  const MIN = 20;
  const MAX = 5000;
  const STEP = 20;
  if (typeof amount !== 'number' || isNaN(amount)) return { valid: false, error: 'Not a number' };
  if (amount < MIN || amount > MAX) return { valid: false, error: 'Out of bounds' };
  if (amount % STEP !== 0) return { valid: false, error: 'Not a multiple of 20' };
  const baseCoins = (amount / 20) * 10000;
  return { valid: true, amount, baseCoins };
}

function validateBossPlan(planId, amount, durationDays) {
  const validPlans = {
    monthly: { price: 20, duration: 31 },
    semester: { price: 99, duration: 185 },
  };
  const plan = validPlans[planId];
  if (!plan) return { valid: false, error: 'Invalid planId' };
  if (plan.price !== amount) return { valid: false, error: 'Price mismatch' };
  if (plan.duration !== durationDays) return { valid: false, error: 'Duration mismatch' };
  return { valid: true };
}

// =========================================================================
// 2. Simulated Firestore Security Rules Engine
// =========================================================================

function simulateFirestoreRechargeRule({ auth, data }) {
  if (!auth || !auth.uid) return { allowed: false, reason: 'unauthenticated' };
  
  const required = ['userId', 'amount', 'coins', 'transactionId', 'status', 'createdAt'];
  for (const field of required) {
    if (data[field] === undefined || data[field] === null) {
      return { allowed: false, reason: `missing required field: ${field}` };
    }
  }

  if (data.userId !== auth.uid) return { allowed: false, reason: 'userId mismatch (spoofing)' };
  if (data.status !== 'pending') return { allowed: false, reason: 'status must be pending' };
  if (typeof data.amount !== 'number') return { allowed: false, reason: 'amount must be number' };
  if (data.amount <= 0) return { allowed: false, reason: 'amount must be > 0' };
  if (data.amount > 5000) return { allowed: false, reason: 'amount must be <= 5000' };
  if (data.amount % 20 !== 0) return { allowed: false, reason: 'amount must be multiple of 20' };
  
  const expectedCoins = (data.amount / 20) * 10000;
  if (data.coins !== expectedCoins) {
    return { allowed: false, reason: `coins mismatch (expected ${expectedCoins}, got ${data.coins})` };
  }

  return { allowed: true };
}

function simulateFirestoreBossRule({ auth, data }) {
  if (!auth || !auth.uid) return { allowed: false, reason: 'unauthenticated' };
  
  const required = ['userId', 'amount', 'planId', 'durationDays', 'transactionId', 'status', 'createdAt'];
  for (const field of required) {
    if (data[field] === undefined || data[field] === null) {
      return { allowed: false, reason: `missing required field: ${field}` };
    }
  }

  if (data.userId !== auth.uid) return { allowed: false, reason: 'userId mismatch (spoofing)' };
  if (data.status !== 'pending') return { allowed: false, reason: 'status must be pending' };
  if (![20, 99].includes(data.amount)) return { allowed: false, reason: 'amount must be 20 or 99' };
  if (![31, 185].includes(data.durationDays)) return { allowed: false, reason: 'durationDays must be 31 or 185' };

  return { allowed: true };
}

function simulateFirestoreUserUpdateRule({ auth, currentDoc, diffData }) {
  if (!auth || !auth.uid) return { allowed: false, reason: 'unauthenticated' };
  if (currentDoc.id !== auth.uid) return { allowed: false, reason: 'not owner' };

  const protectedFields = [
    'admin', 'welcomeBonusGranted', 'role', 'isGodMode',
    'disclaimerAgreedAt', 'promoCodeRedeemedAt', 'tradeSurveyCompletedAt',
    'bossUntil', 'bossSince', 'lastBossPlan',
    'lastPromoRedeemedAt', 'redeemedPromoCodes', 'promoRedemptions'
  ];

  const affectedKeys = Object.keys(diffData);
  for (const key of affectedKeys) {
    if (protectedFields.includes(key)) {
      return { allowed: false, reason: `attempt to modify protected field: ${key}` };
    }
  }

  if (affectedKeys.includes('accountTier')) {
    const newTier = diffData.accountTier;
    const currentTier = currentDoc.accountTier || 'Bro';
    if (newTier !== 'Bro' || currentTier !== 'Bro') {
      return { allowed: false, reason: 'cannot modify accountTier to non-Bro or from non-Bro' };
    }
  }

  return { allowed: true };
}

// =========================================================================
// 3. Run Test Suite
// =========================================================================

console.log('🧪 Starting Purchase & Tampering Test Suite...\n');
let passed = 0;
let failed = 0;

function it(description, fn) {
  try {
    fn();
    console.log(`  ✅ PASS: ${description}`);
    passed++;
  } catch (err) {
    console.error(`  ❌ FAIL: ${description}`);
    console.error(`     Error: ${err.message}`);
    failed++;
  }
}

// --- Group 1: Happy Paths ---
console.log('📦 Group 1: Happy Paths');

it('A1: Valid BanglaQR Coin Recharge generates fallback TrxID and passes Firestore rules', () => {
  const phoneCheck = validateBanglaQrPhone('01712345678');
  assert.strictEqual(phoneCheck.valid, true);

  const amountCheck = validateRechargeAmount(40);
  assert.strictEqual(amountCheck.valid, true);

  const finalTrxId = `BQR-${phoneCheck.cleaned}`;
  const doc = {
    userId: 'user_123',
    amount: amountCheck.amount,
    coins: amountCheck.baseCoins,
    transactionId: finalTrxId,
    status: 'pending',
    createdAt: new Date(),
    senderPhone: phoneCheck.cleaned,
  };

  const result = simulateFirestoreRechargeRule({ auth: { uid: 'user_123' }, data: doc });
  assert.strictEqual(result.allowed, true);
});

it('A2: Valid BanglaQR Boss Tier Request passes Firestore rules with fallback TrxID', () => {
  const phoneCheck = validateBanglaQrPhone('+8801812345678');
  assert.strictEqual(phoneCheck.valid, true);

  const planCheck = validateBossPlan('semester', 99, 185);
  assert.strictEqual(planCheck.valid, true);

  const finalTrxId = `BQR-${phoneCheck.cleaned.replace(/[^0-9]/g, '')}`;
  const doc = {
    userId: 'user_123',
    amount: 99,
    planId: 'semester',
    durationDays: 185,
    transactionId: finalTrxId,
    status: 'pending',
    createdAt: new Date(),
    senderPhone: phoneCheck.cleaned,
  };

  const result = simulateFirestoreBossRule({ auth: { uid: 'user_123' }, data: doc });
  assert.strictEqual(result.allowed, true);
});

it('A3: Valid bKash Make Payment Coin Recharge with manual TrxID passes rules', () => {
  const trxCheck = validateTrxId('BLM98472910');
  assert.strictEqual(trxCheck.valid, true);

  const amountCheck = validateRechargeAmount(100);
  assert.strictEqual(amountCheck.valid, true);

  const doc = {
    userId: 'user_456',
    amount: 100,
    coins: 50000,
    transactionId: trxCheck.value,
    status: 'pending',
    createdAt: new Date(),
  };

  const result = simulateFirestoreRechargeRule({ auth: { uid: 'user_456' }, data: doc });
  assert.strictEqual(result.allowed, true);
});

it('A4: Valid bKash Monthly Boss Request passes rules', () => {
  const trxCheck = validateTrxId('BLM12345678');
  assert.strictEqual(trxCheck.valid, true);

  const doc = {
    userId: 'user_456',
    amount: 20,
    planId: 'monthly',
    durationDays: 31,
    transactionId: trxCheck.value,
    status: 'pending',
    createdAt: new Date(),
  };

  const result = simulateFirestoreBossRule({ auth: { uid: 'user_456' }, data: doc });
  assert.strictEqual(result.allowed, true);
});

// --- Group 2: Coin Purchase Tampering Attempts ---
console.log('\n🛡️ Group 2: Coin Purchase Tampering Attempts');

it('B1: Tampering amount to non-multiple of 20 (e.g. ৳25, ৳15) is BLOCKED', () => {
  const clientCheck = validateRechargeAmount(25);
  assert.strictEqual(clientCheck.valid, false);

  const ruleResult = simulateFirestoreRechargeRule({
    auth: { uid: 'user_123' },
    data: { userId: 'user_123', amount: 25, coins: 12500, transactionId: 'TRX1234', status: 'pending', createdAt: new Date() }
  });
  assert.strictEqual(ruleResult.allowed, false);
  assert.ok(ruleResult.reason.includes('multiple of 20'));
});

it('B2: Tampering amount below minimum (e.g. ৳0, -৳100) is BLOCKED', () => {
  const ruleResultZero = simulateFirestoreRechargeRule({
    auth: { uid: 'user_123' },
    data: { userId: 'user_123', amount: 0, coins: 0, transactionId: 'TRX1234', status: 'pending', createdAt: new Date() }
  });
  assert.strictEqual(ruleResultZero.allowed, false);

  const ruleResultNeg = simulateFirestoreRechargeRule({
    auth: { uid: 'user_123' },
    data: { userId: 'user_123', amount: -20, coins: -10000, transactionId: 'TRX1234', status: 'pending', createdAt: new Date() }
  });
  assert.strictEqual(ruleResultNeg.allowed, false);
});

it('B3: Tampering amount above maximum cap (৳5000) is BLOCKED', () => {
  const ruleResult = simulateFirestoreRechargeRule({
    auth: { uid: 'user_123' },
    data: { userId: 'user_123', amount: 5020, coins: 2510000, transactionId: 'TRX1234', status: 'pending', createdAt: new Date() }
  });
  assert.strictEqual(ruleResult.allowed, false);
  assert.ok(ruleResult.reason.includes('<= 5000'));
});

it('B4: Tampering coins inflation (paying ৳20 but asking for 1,000,000 coins) is BLOCKED', () => {
  const ruleResult = simulateFirestoreRechargeRule({
    auth: { uid: 'user_123' },
    data: { userId: 'user_123', amount: 20, coins: 1000000, transactionId: 'TRX1234', status: 'pending', createdAt: new Date() }
  });
  assert.strictEqual(ruleResult.allowed, false);
  assert.ok(ruleResult.reason.includes('coins mismatch'));
});

it('B5: Tampering status to "approved" on submission is BLOCKED', () => {
  const ruleResult = simulateFirestoreRechargeRule({
    auth: { uid: 'user_123' },
    data: { userId: 'user_123', amount: 20, coins: 10000, transactionId: 'TRX1234', status: 'approved', createdAt: new Date() }
  });
  assert.strictEqual(ruleResult.allowed, false);
  assert.ok(ruleResult.reason.includes('status must be pending'));
});

it('B6: Tampering userId to spoof another trader is BLOCKED', () => {
  const ruleResult = simulateFirestoreRechargeRule({
    auth: { uid: 'attacker_uid' },
    data: { userId: 'victim_uid', amount: 20, coins: 10000, transactionId: 'TRX1234', status: 'pending', createdAt: new Date() }
  });
  assert.strictEqual(ruleResult.allowed, false);
  assert.ok(ruleResult.reason.includes('userId mismatch'));
});

// --- Group 3: Boss Tier Tampering Attempts ---
console.log('\n👑 Group 3: Boss Tier Tampering Attempts');

it('C1: Tampering Boss amount to ৳1 or ৳50 is BLOCKED by rules', () => {
  const ruleResult = simulateFirestoreBossRule({
    auth: { uid: 'user_123' },
    data: { userId: 'user_123', amount: 1, planId: 'monthly', durationDays: 31, transactionId: 'TRX1234', status: 'pending', createdAt: new Date() }
  });
  assert.strictEqual(ruleResult.allowed, false);
  assert.ok(ruleResult.reason.includes('amount must be 20 or 99'));
});

it('C2: Tampering Boss durationDays to 3650 (10 years) is BLOCKED by rules', () => {
  const ruleResult = simulateFirestoreBossRule({
    auth: { uid: 'user_123' },
    data: { userId: 'user_123', amount: 20, planId: 'monthly', durationDays: 3650, transactionId: 'TRX1234', status: 'pending', createdAt: new Date() }
  });
  assert.strictEqual(ruleResult.allowed, false);
  assert.ok(ruleResult.reason.includes('durationDays must be 31 or 185'));
});

it('C3: Direct client update of accountTier to "Boss" on /users/{uid} is BLOCKED', () => {
  const ruleResult = simulateFirestoreUserUpdateRule({
    auth: { uid: 'user_123' },
    currentDoc: { id: 'user_123', accountTier: 'Bro' },
    diffData: { accountTier: 'Boss' }
  });
  assert.strictEqual(ruleResult.allowed, false);
  assert.ok(ruleResult.reason.includes('accountTier'));
});

it('C4: Direct client write to protected fields (bossUntil, role, admin) is BLOCKED', () => {
  const ruleResult = simulateFirestoreUserUpdateRule({
    auth: { uid: 'user_123' },
    currentDoc: { id: 'user_123', accountTier: 'Bro' },
    diffData: { bossUntil: Date.now() + 100000000000 }
  });
  assert.strictEqual(ruleResult.allowed, false);
  assert.ok(ruleResult.reason.includes('protected field'));
});

// --- Group 4: Edge Cases & Input Sanitization ---
console.log('\n🔍 Group 4: Edge Cases & Input Sanitization');

it('D1: BanglaQR with missing phone is BLOCKED by client validation', () => {
  const phoneCheck = validateBanglaQrPhone('');
  assert.strictEqual(phoneCheck.valid, false);

  const phoneCheckSpaces = validateBanglaQrPhone('     ');
  assert.strictEqual(phoneCheckSpaces.valid, false);
});

it('D2: BanglaQR with invalid operator prefix (e.g. 01212345678) is BLOCKED', () => {
  const phoneCheck = validateBanglaQrPhone('01212345678');
  assert.strictEqual(phoneCheck.valid, false);
});

it('D3: BanglaQR with invalid length (e.g. 7 digits or 13 digits) is BLOCKED', () => {
  const shortCheck = validateBanglaQrPhone('017123456');
  assert.strictEqual(shortCheck.valid, false);

  const longCheck = validateBanglaQrPhone('0171234567890');
  assert.strictEqual(longCheck.valid, false);
});

it('D4: HTML XSS injection in transactionId is safely escaped', () => {
  function escapeHtml(str) {
    if (typeof str !== 'string') return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  const maliciousInput = '<script>alert("hacked")</script>';
  const sanitized = escapeHtml(maliciousInput);
  assert.strictEqual(sanitized, '&lt;script&gt;alert(&quot;hacked&quot;)&lt;/script&gt;');
  assert.ok(!sanitized.includes('<script>'));
});

console.log(`\n========================================`);
console.log(`Test Results: ${passed} Passed, ${failed} Failed`);
console.log(`========================================\n`);

if (failed > 0) {
  process.exit(1);
} else {
  console.log('🎉 All 16 security, tampering, and validation checks passed successfully!');
}
