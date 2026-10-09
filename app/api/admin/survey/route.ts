// app/api/admin/survey/route.ts
// Unified Admin API retrieving:
// 1. Live Announcement & Notice telemetry: impressions, clicks, dismissals, CTR, and list of users who interacted.
// 2. Previous Community Poll & Survey responses: Domain renewal poll #1 results and user breakdown.
//
// Gated strictly to admins via `verifyAdminAccess`.

import { NextRequest, NextResponse } from 'next/server';
import { getFirestore } from 'firebase-admin/firestore';
import { verifyAdminAccess } from '@/lib/utils/adminVerification';
import { VALID_DOMAIN_CHOICES } from '@/lib/surveyConstants';

// Ensure Firebase Admin is initialized
import '@/lib/firebaseAdmin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const adminCheck = await verifyAdminAccess(req);
    if (!adminCheck.isAdmin) {
      return NextResponse.json(
        { success: false, error: adminCheck.error || 'Unauthorized access' },
        { status: 403 }
      );
    }

    const db = getFirestore();

    // =========================================================================
    // 1. FETCH ANNOUNCEMENT & NOTICE TELEMETRY
    // =========================================================================
    const [noticesSnap, eventsSnap, surveySnap] = await Promise.all([
      db.collection('analytics_notices').get(),
      db.collection('notice_events').orderBy('createdAt', 'desc').limit(200).get(),
      db.collection('survey_responses').get(),
    ]);

    // Aggregate campaign stats
    const campaigns: any[] = [];
    let aggImpressions = 0;
    let aggClicks = 0;
    let aggCopies = 0;
    let aggDismissals = 0;
    let aggSubmissions = 0;

    noticesSnap.forEach((doc) => {
      const data = doc.data() || {};
      const imp = Number(data.totalImpressions) || 0;
      const clk = Number(data.totalClicks) || 0;
      const cop = Number(data.totalCopies) || 0;
      const dis = Number(data.totalDismissals) || 0;
      const sub = Number(data.totalSubmissions) || 0;
      const ctr = imp > 0 ? Number(((clk / imp) * 100).toFixed(2)) : 0;

      aggImpressions += imp;
      aggClicks += clk;
      aggCopies += cop;
      aggDismissals += dis;
      aggSubmissions += sub;

      campaigns.push({
        campaignId: doc.id,
        totalImpressions: imp,
        totalClicks: clk,
        totalCopies: cop,
        totalDismissals: dis,
        totalSubmissions: sub,
        ctr,
        lastEventAt: data.lastEventAt?.toDate ? data.lastEventAt.toDate().toISOString() : null,
      });
    });

    const overallCtr = aggImpressions > 0 ? Number(((aggClicks / aggImpressions) * 100).toFixed(2)) : 0;

    // Resolve user details for events where userEmail wasn't embedded
    const uidsToFetch = new Set<string>();
    eventsSnap.forEach((doc) => {
      const data = doc.data();
      if (data.uid && !data.userEmail) {
        uidsToFetch.add(data.uid);
      }
    });

    const userMap: Record<string, { email: string | null; name: string | null }> = {};
    if (uidsToFetch.size > 0) {
      const uidChunks = Array.from(uidsToFetch).slice(0, 50); // limit to avoid huge multi-lookups
      await Promise.all(
        uidChunks.map(async (uid) => {
          try {
            const userDoc = await db.collection('users').doc(uid).get();
            if (userDoc.exists) {
              const uData = userDoc.data();
              userMap[uid] = {
                email: uData?.email || null,
                name: uData?.displayName || null,
              };
            }
          } catch {
            // Ignore single user fetch error
          }
        })
      );
    }

    const interactions: any[] = [];
    eventsSnap.forEach((doc) => {
      const data = doc.data();
      const uid = data.uid || null;
      const fallbackUser = uid ? userMap[uid] : null;

      interactions.push({
        id: doc.id,
        campaignId: data.campaignId || 'general',
        action: data.action || 'impression',
        uid,
        userEmail: data.userEmail || fallbackUser?.email || (uid ? `User (${uid.slice(0, 6)}…)` : 'Guest / Visitor'),
        displayName: data.displayName || fallbackUser?.name || null,
        clientIP: data.clientIP || null,
        userAgent: data.userAgent || null,
        metadata: data.metadata || null,
        createdAtIso: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : null,
      });
    });

    // =========================================================================
    // 2. FETCH PREVIOUS COMMUNITY POLL RESPONSES
    // =========================================================================
    const responses: any[] = [];
    let ratingSum = 0;
    const choiceCounts: Record<string, number> = {
      shahoriar_bd: 0,
      beg_crowdfund: 0,
      vercel_app: 0,
    };

    surveySnap.forEach((doc) => {
      const data = doc.data();
      const rating = Number(data.tradingExperience) || 0;
      ratingSum += rating;

      if (data.domainChoice && choiceCounts[data.domainChoice] !== undefined) {
        choiceCounts[data.domainChoice] += 1;
      }

      responses.push({
        id: doc.id,
        uid: data.uid,
        userEmail: data.userEmail || 'Anonymous',
        displayName: data.displayName || null,
        tradingExperience: rating,
        domainChoice: data.domainChoice,
        domainChoiceLabelEn: data.domainChoiceLabelEn || '',
        domainChoiceLabelBn: data.domainChoiceLabelBn || '',
        submittedAtIso: data.submittedAtIso || (data.submittedAt?.toDate ? data.submittedAt.toDate().toISOString() : null),
      });
    });

    // Sort responses by submittedAt descending
    responses.sort((a, b) => {
      const timeA = a.submittedAtIso ? new Date(a.submittedAtIso).getTime() : 0;
      const timeB = b.submittedAtIso ? new Date(b.submittedAtIso).getTime() : 0;
      return timeB - timeA;
    });

    const totalPollResponses = responses.length;
    const averageExperience = totalPollResponses > 0 ? Number((ratingSum / totalPollResponses).toFixed(1)) : 0;

    const choiceStats = Object.keys(choiceCounts).map((key) => {
      const count = choiceCounts[key];
      const percentage = totalPollResponses > 0 ? Math.round((count / totalPollResponses) * 100) : 0;
      const optionInfo = VALID_DOMAIN_CHOICES.find((opt) => opt.id === key);
      return {
        id: key,
        labelEn: optionInfo?.labelEn || key,
        labelBn: optionInfo?.labelBn || key,
        count,
        percentage,
      };
    });

    return NextResponse.json({
      success: true,
      announcement: {
        campaigns,
        activeCampaign: campaigns[0]?.campaignId || 'current_announcement',
        stats: {
          totalImpressions: aggImpressions,
          totalClicks: aggClicks,
          totalCopies: aggCopies,
          totalDismissals: aggDismissals,
          totalSubmissions: aggSubmissions,
          ctr: overallCtr,
        },
        interactions,
      },
      previousPoll: {
        stats: {
          totalResponses: totalPollResponses,
          averageExperience,
          choiceStats,
        },
        responses,
      },
      // Root-level stats & responses for backward-compatible clients
      stats: {
        totalResponses: totalPollResponses,
        averageExperience,
        choiceStats,
      },
      responses,
    });
  } catch (error: any) {
    console.error('Error fetching admin survey & announcement data:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to fetch data' },
      { status: 500 }
    );
  }
}
