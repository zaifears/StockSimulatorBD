/**
 * 🔒 Centralized Admin Verification Utility
 * 
 * Ensures all admin endpoints use consistent security checks
 * Uses Firebase custom claims (set via Firebase Admin SDK)
 */

import { getAdminAuth } from '@/lib/firebaseAdmin';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Verify that the request is from an authenticated admin user
 * 
 * Returns { isAdmin: true, uid: string } or { isAdmin: false, error: string }
 */
export async function verifyAdminAccess(req: NextRequest): Promise<
  { isAdmin: true; uid: string } | { isAdmin: false; error: string }
> {
  try {
    // Extract bearer token from Authorization header
    const authHeader = req.headers.get('authorization') || req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return {
        isAdmin: false,
        error: 'Missing or invalid Authorization header. Expected: Bearer <token>',
      };
    }

    const token = authHeader.substring(7).trim();

    // Get admin auth and verify token
    const adminAuth = getAdminAuth();

    let decodedToken;
    try {
      decodedToken = await adminAuth.verifyIdToken(token);
    } catch (error: any) {
      return {
        isAdmin: false,
        error: `Invalid token: ${error.message}`,
      };
    }

    // Admin status comes from the signed custom claim ONLY.
    //
    // This used to fall back to reading `users/{uid}.role === 'admin'` from
    // Firestore when the claim was absent — which meant the entire admin
    // boundary rested on one mutable document field, protected only by a
    // firestore.rules clause. That is a weaker guarantee than a claim baked
    // into a cryptographically signed token: rules can regress (and in this
    // project a rules regression sat undeployed in production for weeks),
    // Admin SDK writes bypass rules entirely, and any future code path that
    // writes to a user document becomes a potential privilege-escalation
    // vector. A custom claim can only be set with service-account
    // credentials — no client-side write can ever produce one.
    //
    // Grant the claim with set_admin_claim.mjs (or setAdminClaim below).
    // Note: a claim change only lands in a user's token when that token is
    // reissued — they must sign out and back in.
    if (decodedToken.admin !== true) {
      console.warn(`⚠️ User ${decodedToken.uid} attempted admin access without the admin claim`);
      return {
        isAdmin: false,
        error: 'User does not have admin privileges',
      };
    }

    return {
      isAdmin: true,
      uid: decodedToken.uid,
    };
  } catch (error: any) {
    console.error('❌ Admin verification error:', error);
    return {
      isAdmin: false,
      error: 'Internal server error during authentication',
    };
  }
}

/**
 * Middleware wrapper for admin-only endpoints
 * 
 * Usage:
 * export async function POST(req: NextRequest) {
 *   const adminCheck = await verifyAdminAccess(req);
 *   if (!adminCheck.isAdmin) {
 *     return NextResponse.json({ error: adminCheck.error }, { status: 401 });
 *   }
 *   // Admin code here...
 * }
 */
export const adminAuthMiddleware = async (req: NextRequest) => {
  const result = await verifyAdminAccess(req);
  
  if (!result.isAdmin) {
    return NextResponse.json(
      { 
        success: false, 
        error: result.error,
        timestamp: new Date().toISOString()
      },
      { status: 401 }
    );
  }
  
  return null; // Proceed with request
};

/**
 * 🆕 Helper to set admin custom claim for a user
 * Run this once when promoting a user to admin
 * 
 * Usage (in a secure admin panel):
 * await setAdminClaim('user_uid', true);
 */
export async function setAdminClaim(uid: string, isAdmin: boolean): Promise<void> {
  const adminAuth = getAdminAuth();

  await adminAuth.setCustomUserClaims(uid, { admin: isAdmin });
  console.log(`✅ Admin claim ${isAdmin ? 'granted' : 'revoked'} for user ${uid}`);
}

/**
 * Get admin status of a user
 */
export async function isUserAdmin(uid: string): Promise<boolean> {
  try {
    const adminAuth = getAdminAuth();
    
    const user = await adminAuth.getUser(uid);
    return user.customClaims?.admin === true;
  } catch (error) {
    console.error(`Failed to check admin status for ${uid}:`, error);
    return false;
  }
}
