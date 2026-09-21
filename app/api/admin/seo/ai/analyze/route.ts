// app/api/admin/seo/ai/analyze/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAccess } from '@/lib/utils/adminVerification';
import { getSeoDb } from '@/lib/firebaseSeoAdmin';
import { parseAiResponse, saveAiObservation, evaluateAiReadiness, getPersistentPrompts } from '@/lib/seo/aiLab';
import { generateSeoOpportunities } from '@/lib/seo/opportunities';
import { AiVisibilityObservation, SeoPageProfile, AiPromptTemplate } from '@/lib/seo/types';

export async function GET(req: NextRequest) {
  const adminCheck = await verifyAdminAccess(req);
  if (!adminCheck.isAdmin) {
    return NextResponse.json({ error: adminCheck.error }, { status: 401 });
  }

  try {
    const db = getSeoDb();

    const [prompts, obsSnap, compsSnap, pagesSnap] = await Promise.all([
      getPersistentPrompts(),
      db.collection('ai_visibility_results').orderBy('observedAt', 'desc').limit(50).get(),
      db.collection('ai_competitors').get(),
      db.collection('seo_pages').get(),
    ]);

    const observations: AiVisibilityObservation[] = obsSnap.docs.map((d) => d.data() as AiVisibilityObservation);
    const competitors = compsSnap.docs.map((d) => d.data());
    const pages = pagesSnap.docs.map((d) => d.data() as SeoPageProfile);

    const schemaCount = pages.filter((p) => p.schemaTypes && p.schemaTypes.length > 0).length;
    const orphanCount = pages.filter((p) => p.isOrphan).length;

    const diagnostic = evaluateAiReadiness(pages.length, schemaCount, orphanCount);

    return NextResponse.json({
      success: true,
      prompts,
      observations,
      competitors,
      diagnostic,
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
    const { action, rawText, query, provider, model, category, newPrompt } = body;
    const db = getSeoDb();

    // Support adding persistent prompts without deploying code
    if (action === 'create_prompt' && newPrompt) {
      const promptId = `prompt-${Date.now()}`;
      const template: AiPromptTemplate = {
        id: promptId,
        query: newPrompt.query,
        category: newPrompt.category || 'dse_trading',
        targetConcept: newPrompt.targetConcept || 'General',
        recommendedProviders: newPrompt.recommendedProviders || ['ChatGPT', 'Gemini', 'Perplexity', 'Claude'],
      };
      await db.collection('ai_prompts').doc(promptId).set(template);
      return NextResponse.json({ success: true, prompt: template });
    }

    if (!rawText || !query || !provider) {
      return NextResponse.json({ error: 'Missing required fields: rawText, query, provider' }, { status: 400 });
    }

    // Parse empirical facts using generic competitor extraction
    const observation = parseAiResponse(rawText, query, provider, model || 'Standard', category || 'dse_trading');

    // Persist into SEO Firebase
    await saveAiObservation(observation);

    // Trigger opportunity calculation
    await generateSeoOpportunities();

    return NextResponse.json({
      success: true,
      observation,
    });
  } catch (error: any) {
    console.error('AI Analyze Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
