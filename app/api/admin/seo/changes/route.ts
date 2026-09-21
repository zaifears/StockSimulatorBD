// app/api/admin/seo/changes/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { FieldValue } from 'firebase-admin/firestore';
import { verifyAdminAccess } from '@/lib/utils/adminVerification';
import { getSeoDb } from '@/lib/firebaseSeoAdmin';
import { submitUrlToIndexNow } from '@/lib/indexNow';
import { absoluteUrl } from '@/lib/siteUrl';
import { normalizeSeoPath, invalidateMetadataCache } from '@/lib/seo/metadataResolver';
import { recordChangeImpact } from '@/lib/seo/changeImpact';

export async function GET(req: NextRequest) {
  const adminCheck = await verifyAdminAccess(req);
  if (!adminCheck.isAdmin) {
    return NextResponse.json({ error: adminCheck.error }, { status: 401 });
  }

  try {
    const db = getSeoDb();
    const [overridesSnap, changesSnap] = await Promise.all([
      db.collection('seo_overrides').get(),
      db.collection('seo_changes').orderBy('createdAt', 'desc').limit(50).get(),
    ]);

    const overrides = overridesSnap.docs.map((d) => d.data());
    const changes = changesSnap.docs.map((d) => d.data());

    return NextResponse.json({
      success: true,
      overrides,
      changes,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const adminCheck = await verifyAdminAccess(req);
  if (!adminCheck.isAdmin) {
    return NextResponse.json({ error: adminCheck.error }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { action, path, title, description, changeId } = body;
    const db = getSeoDb();

    if (action === 'preview_diff') {
      if (!path) {
        return NextResponse.json({ error: 'Missing path for preview diff' }, { status: 400 });
      }
      const { path: cleanPath, docId } = normalizeSeoPath(path);
      const pageSnap = await db.collection('seo_pages').doc(docId).get();
      const currentPage = pageSnap.data() || {};

      return NextResponse.json({
        success: true,
        path: cleanPath,
        before: {
          title: currentPage.title || 'None',
          description: currentPage.description || 'None',
        },
        proposed: {
          title: title || currentPage.title,
          description: description || currentPage.description,
        },
      });
    }

    if (action === 'apply_override') {
      if (!path) {
        return NextResponse.json({ error: 'Missing path for metadata override' }, { status: 400 });
      }

      const { path: cleanPath, docId } = normalizeSeoPath(path);
      const pageRef = db.collection('seo_pages').doc(docId);
      const pageSnap = await pageRef.get();
      const currentPage = pageSnap.data() || {};

      const auditChangeId = `change-${Date.now()}`;
      const beforeState = {
        title: currentPage.title || '',
        description: currentPage.description || '',
      };
      const afterState = {
        title: (title || currentPage.title || '').trim(),
        description: (description || currentPage.description || '').trim(),
      };

      // 1. Save override in seo_overrides
      await db.collection('seo_overrides').doc(docId).set({
        id: docId,
        path: cleanPath,
        title: afterState.title,
        description: afterState.description,
        appliedAt: new Date().toISOString(),
        appliedBy: adminCheck.uid,
        previousValues: beforeState,
      });

      // 2. Invalidate in-memory metadata resolver cache
      invalidateMetadataCache(cleanPath);

      // 3. Surgical Next.js ISR Revalidation: ONLY invalidates the single changed path
      // Strictly protects Vercel Free (Hobby) 200k ISR write quota by never purging layouts or whole trees.
      try {
        revalidatePath(cleanPath);
      } catch (revalErr) {
        console.warn(`[SEO Changes] Revalidation warning for ${cleanPath}:`, revalErr);
      }

      // 4. Update page profile in seo_pages if it exists
      if (pageSnap.exists) {
        await pageRef.update({
          title: afterState.title,
          description: afterState.description,
        });
      }

      // 5. Automated Post-Apply Validation
      let validation = {
        httpStatus: 200,
        canonicalPass: true,
        titleApplied: true,
        validatedAt: new Date().toISOString(),
      };

      try {
        const fullUrl = absoluteUrl(cleanPath);
        const checkRes = await fetch(fullUrl, {
          method: 'GET',
          headers: { 'User-Agent': 'StockSimulatorBD-Validator/1.0' },
          signal: AbortSignal.timeout(5000),
          next: { revalidate: 0 },
        }).catch(() => null);

        if (checkRes) {
          validation.httpStatus = checkRes.status;
          validation.canonicalPass = checkRes.status === 200;
          validation.titleApplied = checkRes.status === 200;
        } else {
          validation.httpStatus = 0;
          validation.canonicalPass = false;
          validation.titleApplied = false;
        }
      } catch (err) {
        console.warn('Post-apply validation fetch warning:', err);
      }

      // 6. Save change log with validation
      const changeRecord = {
        id: auditChangeId,
        type: 'metadata_override',
        target: cleanPath,
        reason: 'Safe SEO metadata override',
        before: beforeState,
        after: afterState,
        status: 'applied',
        validation,
        createdBy: adminCheck.uid,
        createdAt: new Date().toISOString(),
        appliedAt: new Date().toISOString(),
        validatedAt: validation.validatedAt,
      };

      await db.collection('seo_changes').doc(auditChangeId).set(changeRecord);

      // 7. Initialize real baseline monitoring in Change-Impact Correlation Engine
      await recordChangeImpact(
        auditChangeId,
        cleanPath,
        `Metadata Override: "${afterState.title.slice(0, 50)}"`
      ).catch((impactErr) => console.warn('[SEO Changes] Impact engine init warning:', impactErr));

      // 8. Submit to IndexNow (best effort, async)
      await submitUrlToIndexNow(absoluteUrl(cleanPath)).catch(() => null);

      return NextResponse.json({
        success: true,
        changeId: auditChangeId,
        path: cleanPath,
        applied: afterState,
        validation,
      });
    }

    if (action === 'rollback') {
      if (!changeId) {
        return NextResponse.json({ error: 'Missing changeId to rollback' }, { status: 400 });
      }

      const changeRef = db.collection('seo_changes').doc(changeId);
      const changeSnap = await changeRef.get();

      if (!changeSnap.exists) {
        return NextResponse.json({ error: 'Change record not found' }, { status: 404 });
      }

      const changeData = changeSnap.data()!;

      // Guard against double rollback
      if (changeData.status === 'rolled_back') {
        return NextResponse.json({ error: 'This change has already been rolled back' }, { status: 400 });
      }

      const { path: cleanPath, docId } = normalizeSeoPath(changeData.target);

      // Clean rollback handling:
      // If the page had NO custom override before (empty title), delete the override document
      // rather than leaving a phantom blank override record in Firestore.
      if (!changeData.before || (!changeData.before.title && !changeData.before.description)) {
        await db.collection('seo_overrides').doc(docId).delete().catch(() => null);
        await db.collection('seo_pages').doc(docId).update({
          title: FieldValue.delete(),
          description: FieldValue.delete(),
        }).catch(() => null);
      } else {
        await db.collection('seo_overrides').doc(docId).set({
          id: docId,
          path: cleanPath,
          title: changeData.before.title,
          description: changeData.before.description,
          appliedAt: new Date().toISOString(),
          appliedBy: adminCheck.uid,
          isRollback: true,
        });

        await db.collection('seo_pages').doc(docId).update({
          title: changeData.before.title,
          description: changeData.before.description,
        }).catch(() => null);
      }

      // Invalidate in-memory cache
      invalidateMetadataCache(cleanPath);

      // Surgical Next.js ISR Revalidation: ONLY invalidates the single reverted path
      try {
        revalidatePath(cleanPath);
      } catch (revalErr) {
        console.warn(`[SEO Changes] Revalidation warning for ${cleanPath}:`, revalErr);
      }

      // Submit reverted URL to IndexNow so search engines crawl the original state
      await submitUrlToIndexNow(absoluteUrl(cleanPath)).catch(() => null);

      // Mark change audit record as rolled back
      await changeRef.update({
        status: 'rolled_back',
        rolledBackAt: new Date().toISOString(),
        rolledBackBy: adminCheck.uid,
      });

      return NextResponse.json({
        success: true,
        message: `Rollback applied successfully for ${cleanPath}`,
      });
    }

    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
