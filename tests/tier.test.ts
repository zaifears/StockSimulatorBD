import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseBossUntilMs,
  isBossActive,
  isBossExpired,
  isBossLifetime,
  getEffectiveTier,
} from '../lib/tier';

test('parseBossUntilMs parses various timestamp formats', () => {
  const ts = 1792750000000;
  assert.equal(parseBossUntilMs(ts), ts);
  assert.equal(parseBossUntilMs({ toMillis: () => ts }), ts);
  assert.equal(parseBossUntilMs({ toDate: () => new Date(ts) }), ts);
  assert.equal(parseBossUntilMs(new Date(ts).toISOString()), ts);
  assert.equal(parseBossUntilMs(null), 0);
  assert.equal(parseBossUntilMs(undefined), 0);
  assert.equal(parseBossUntilMs(0), 0);
  assert.equal(parseBossUntilMs('invalid-date'), 0);
});

test('isBossActive returns true for active future subscriptions', () => {
  const now = 1792750000000;
  const future = now + 1000 * 60 * 60 * 24 * 30; // 30 days later

  assert.equal(isBossActive({ accountTier: 'Boss', bossUntil: future }, now), true);
  assert.equal(isBossActive({ accountTier: 'Bro', bossUntil: future }, now), true);
});

test('isBossActive returns false for expired subscriptions even if accountTier is Boss in DB', () => {
  const now = 1792750000000;
  const past = now - 1000 * 60 * 60 * 24 * 2; // 2 days ago

  assert.equal(isBossActive({ accountTier: 'Boss', bossUntil: past }, now), false);
  assert.equal(isBossActive({ accountTier: 'Bro', bossUntil: past }, now), false);
  assert.equal(getEffectiveTier({ accountTier: 'Boss', bossUntil: past }, now), 'Bro');
});

test('isBossActive returns true for lifetime / permanent Boss (no bossUntil)', () => {
  const now = 1792750000000;
  assert.equal(isBossActive({ accountTier: 'Boss', bossUntil: null }, now), true);
  assert.equal(isBossActive({ accountTier: 'Boss', bossUntil: 0 }, now), true);
  assert.equal(isBossActive({ accountTier: 'Boss' }, now), true);
});

test('isBossActive returns false for standard Bro users', () => {
  const now = 1792750000000;
  assert.equal(isBossActive({ accountTier: 'Bro', bossUntil: null }, now), false);
  assert.equal(isBossActive({ accountTier: 'Bro', bossUntil: 0 }, now), false);
  assert.equal(isBossActive({ accountTier: 'Bro' }, now), false);
  assert.equal(isBossActive(null, now), false);
});

test('isBossExpired correctly identifies past subscriptions', () => {
  const now = 1792750000000;
  const past = now - 5000;
  const future = now + 5000;

  assert.equal(isBossExpired({ bossUntil: past }, now), true);
  assert.equal(isBossExpired({ bossUntil: future }, now), false);
  assert.equal(isBossExpired({ bossUntil: 0 }, now), false);
  assert.equal(isBossExpired({ bossUntil: null }, now), false);
});

test('isBossLifetime identifies permanent accounts', () => {
  assert.equal(isBossLifetime({ accountTier: 'Boss', bossUntil: 0 }), true);
  assert.equal(isBossLifetime({ accountTier: 'Boss', bossUntil: null }), true);
  assert.equal(isBossLifetime({ accountTier: 'Boss', bossUntil: 1792750000000 }), false);
  assert.equal(isBossLifetime({ accountTier: 'Bro', bossUntil: 0 }), false);
});
