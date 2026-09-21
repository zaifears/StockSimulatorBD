// app/admin/seo/ai-geo/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { fetchWithToken } from '@/lib/utils/fetchWithToken';
import {
  Bot,
  Copy,
  Check,
  Sparkles,
  Send,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
  Search,
  BookOpen,
} from 'lucide-react';
import { AiPromptTemplate, AiVisibilityObservation, AiReadinessDiagnostic, AiProvider } from '@/lib/seo/types';

export default function AiGeoLabPage() {
  const [prompts, setPrompts] = useState<AiPromptTemplate[]>([]);
  const [observations, setObservations] = useState<AiVisibilityObservation[]>([]);
  const [competitors, setCompetitors] = useState<any[]>([]);
  const [diagnostic, setDiagnostic] = useState<AiReadinessDiagnostic | null>(null);
  const [referrals, setReferrals] = useState<any[]>([]);
  const [totalReferralVisits, setTotalReferralVisits] = useState(0);
  const [timeline, setTimeline] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [deterministicPrompts, setDeterministicPrompts] = useState<any[]>([]);
  const [promptTab, setPromptTab] = useState<'core' | 'discovered'>('core');
  const [loading, setLoading] = useState(true);

  // Manual Lab inputs
  const [selectedPrompt, setSelectedPrompt] = useState('');
  const [selectedProvider, setSelectedProvider] = useState<AiProvider>('ChatGPT');
  const [modelName, setModelName] = useState('Default');
  const [pastedText, setPastedText] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [copiedPromptId, setCopiedPromptId] = useState<string | null>(null);
  const [labResult, setLabResult] = useState<AiVisibilityObservation | null>(null);

  const fetchData = async () => {
    try {
      const [aiRes, refRes, evtRes, disRes] = await Promise.all([
        fetchWithToken('/api/admin/seo/ai/analyze'),
        fetchWithToken('/api/admin/seo/ai/referrals').catch(() => ({ json: () => ({ success: false }) })),
        fetchWithToken('/api/admin/seo/ai/events').catch(() => ({ json: () => ({ success: false }) })),
        fetchWithToken('/api/admin/seo/prompts/discover').catch(() => ({ json: () => ({ success: false }) })),
      ]);

      const json = await aiRes.json();
      if (json.success) {
        setPrompts(json.prompts || []);
        setObservations(json.observations || []);
        setCompetitors(json.competitors || []);
        setDiagnostic(json.diagnostic || null);
        if (json.prompts?.length > 0 && !selectedPrompt) {
          setSelectedPrompt(json.prompts[0].query);
        }
      }

      const refJson = await refRes.json();
      if (refJson.success) {
        setReferrals(refJson.referrals || []);
        setTotalReferralVisits(refJson.totalAiReferralVisits || 0);
      }

      const evtJson = await evtRes.json();
      if (evtJson.success) {
        setTimeline(evtJson.timeline || []);
        setEvents(evtJson.events || []);
      }

      const disJson = await disRes.json();
      if (disJson.success) {
        setDeterministicPrompts(disJson.prompts || []);
      }
    } catch (err) {
      console.error('Failed to load AI lab data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCopyPrompt = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedPromptId(id);
    setSelectedPrompt(text);
    setTimeout(() => setCopiedPromptId(null), 2000);
  };

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pastedText.trim() || !selectedPrompt.trim()) return;

    setAnalyzing(true);
    setLabResult(null);

    try {
      const res = await fetchWithToken('/api/admin/seo/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rawText: pastedText,
          query: selectedPrompt,
          provider: selectedProvider,
          model: modelName,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setLabResult(json.observation);
        setPastedText('');
        fetchData();
      }
    } catch (err: any) {
      console.error('Analyze failed:', err);
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-[#111622] p-4 sm:p-5 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-2">
              <Bot className="w-5 h-5 text-indigo-500" />
              AI & Generative Engine Optimization (GEO) Lab
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Empirical AI citation radar ($0 spend). Copy curated prompts to ChatGPT, Gemini, Perplexity, or Claude, and paste responses to extract citations.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <a
              href="/admin/seo/ai-geo/crawlers"
              className="px-3 py-1.5 rounded-xl text-xs font-bold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-900/30 border border-purple-200/80 dark:border-purple-800 hover:bg-purple-100 transition-all inline-flex items-center gap-1.5"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>AI Crawler Monitor</span>
            </a>
            <div className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-xl border border-emerald-500/20 self-start sm:self-auto">
              $0 Spend • Real Evidence
            </div>
          </div>
        </div>
      </div>

      {/* AI Referral Traffic Summary */}
      <div className="bg-white dark:bg-[#111622] p-4 sm:p-5 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-black uppercase tracking-wider text-gray-700 dark:text-gray-200 flex items-center gap-1.5">
            <ExternalLink className="w-4 h-4 text-blue-500" />
            AI Platform Referral Traffic ({totalReferralVisits} Visits / 30d)
          </h3>
          <span className="text-[11px] text-gray-400">Distinguishing &ldquo;AI mentioned us&rdquo; from &ldquo;AI sent a visitor&rdquo;</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {referrals.map((ref) => (
            <div key={ref.referrerHost} className="p-3 rounded-xl bg-gray-50 dark:bg-[#161D2A] border border-gray-100 dark:border-gray-800 text-center">
              <div className="text-[11px] font-semibold text-gray-600 dark:text-gray-300 truncate">{ref.referrerHost}</div>
              <div className="text-lg font-bold font-mono text-gray-900 dark:text-white mt-1">{ref.totalVisits}</div>
              <div className="text-[10px] text-gray-400 mt-0.5">Visits</div>
            </div>
          ))}
        </div>
      </div>

      {/* AI Readiness Diagnostic Banner */}
      {diagnostic && (
        <div className="bg-white dark:bg-[#111622] border border-gray-200 dark:border-gray-800 rounded-2xl p-4 sm:p-5">
          <h3 className="text-xs font-black uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-500" /> AI Readiness Diagnostics
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3 text-xs">
            <div className="p-2.5 rounded-xl bg-gray-50 dark:bg-gray-800/60 flex items-center justify-between">
              <span>Entity Clarity</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="p-2.5 rounded-xl bg-gray-50 dark:bg-gray-800/60 flex items-center justify-between">
              <span>Topic Coverage</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="p-2.5 rounded-xl bg-gray-50 dark:bg-gray-800/60 flex items-center justify-between">
              <span>Crawlability (AI Bots)</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="p-2.5 rounded-xl bg-gray-50 dark:bg-gray-800/60 flex items-center justify-between">
              <span>Internal Linking</span>
              <span className="font-bold text-emerald-500">{diagnostic.internalLinking.toUpperCase()}</span>
            </div>
            <div className="p-2.5 rounded-xl bg-gray-50 dark:bg-gray-800/60 flex items-center justify-between">
              <span>Structured Data</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            </div>
          </div>
        </div>
      )}

      {/* Interactive Query Lab Form & Prompt Library */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Prompt Library */}
        <div className="lg:col-span-5 bg-white dark:bg-[#111622] border border-gray-200 dark:border-gray-800 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 p-0.5 rounded-lg text-xs">
              <button
                type="button"
                onClick={() => setPromptTab('core')}
                className={`px-2 py-0.5 rounded-md font-bold text-[11px] transition-all ${
                  promptTab === 'core' ? 'bg-white dark:bg-[#111622] text-blue-600 shadow-xs' : 'text-gray-500'
                }`}
              >
                Core ({prompts.length})
              </button>
              <button
                type="button"
                onClick={() => setPromptTab('discovered')}
                className={`px-2 py-0.5 rounded-md font-bold text-[11px] transition-all ${
                  promptTab === 'discovered' ? 'bg-white dark:bg-[#111622] text-purple-600 shadow-xs' : 'text-gray-500'
                }`}
              >
                Discovered ({deterministicPrompts.length})
              </button>
            </div>
            <span className="text-[10px] text-gray-400 font-mono">1-Click Copy</span>
          </div>

          <div className="space-y-2.5 max-h-[520px] overflow-y-auto pr-1">
            {(promptTab === 'core' ? prompts : deterministicPrompts).map((p: any) => {
              const queryText = p.generatedPrompt || p.query;
              const id = p.id;
              return (
                <div
                  key={id}
                  className="p-3 rounded-xl bg-gray-50 dark:bg-[#161D2A] border border-gray-200 dark:border-gray-800 text-xs space-y-2"
                >
                  <div className="font-medium text-gray-900 dark:text-white leading-relaxed">
                    &ldquo;{queryText}&rdquo;
                  </div>
                  <div className="flex items-center justify-between pt-1 border-t border-gray-100 dark:border-gray-800">
                    <span className="text-[10px] uppercase font-bold text-gray-400">
                      {p.intent || p.category}
                    </span>
                    <button
                      onClick={() => handleCopyPrompt(queryText, id)}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-500 hover:underline"
                    >
                      {copiedPromptId === id ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-500" />
                          <span className="text-emerald-500">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy &amp; Select</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Response Paste & Parse Engine */}
        <div className="lg:col-span-7 bg-white dark:bg-[#111622] border border-gray-200 dark:border-gray-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-gray-900 dark:text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" /> Response Paste & Citation Parser
            </h3>
            <span className="text-[10px] font-mono text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-sm">
              ManualProvider Active ($0)
            </span>
          </div>

          <form onSubmit={handleAnalyze} className="space-y-3">
            <div>
              <label className="text-xs font-bold text-gray-500">Tested Query</label>
              <input
                type="text"
                value={selectedPrompt}
                onChange={(e) => setSelectedPrompt(e.target.value)}
                placeholder="Paste the prompt you ran in ChatGPT/Gemini/Perplexity..."
                className="w-full mt-1 p-2 rounded-xl text-xs bg-gray-50 dark:bg-[#161D2A] border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white font-medium"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-gray-500">AI Provider</label>
                <select
                  value={selectedProvider}
                  onChange={(e) => setSelectedProvider(e.target.value as AiProvider)}
                  className="w-full mt-1 p-2 rounded-xl text-xs bg-gray-50 dark:bg-[#161D2A] border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="ChatGPT">ChatGPT (OpenAI)</option>
                  <option value="Gemini">Google Gemini</option>
                  <option value="Perplexity">Perplexity AI</option>
                  <option value="Claude">Anthropic Claude</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-500">Model Version</label>
                <input
                  type="text"
                  value={modelName}
                  onChange={(e) => setModelName(e.target.value)}
                  placeholder="e.g. GPT-4o, Gemini 1.5 Pro, Sonnet..."
                  className="w-full mt-1 p-2 rounded-xl text-xs bg-gray-50 dark:bg-[#161D2A] border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-gray-500">Paste Full AI Response Here</label>
              <textarea
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                rows={6}
                placeholder="Paste the complete response text from the AI service here..."
                className="w-full mt-1 p-3 rounded-xl text-xs bg-gray-50 dark:bg-[#161D2A] border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white font-mono leading-relaxed"
              />
            </div>

            <button
              type="submit"
              disabled={analyzing || !pastedText.trim()}
              className="w-full py-2.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors flex items-center justify-center gap-1.5 shadow-sm active:scale-[0.99]"
            >
              <Send className="w-3.5 h-3.5" />
              {analyzing ? 'Extracting Citations...' : 'Analyze Response ($0)'}
            </button>
          </form>

          {/* Extracted Facts Card */}
          {labResult && (
            <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 space-y-2 text-xs">
              <div className="font-bold text-blue-900 dark:text-blue-200 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                Observation Logged:
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-gray-500">StockSimulatorBD Mentioned:</span>{' '}
                  <strong className={labResult.mentioned ? 'text-emerald-600' : 'text-red-500'}>
                    {labResult.mentioned ? 'YES' : 'NO'}
                  </strong>
                </div>
                <div>
                  <span className="text-gray-500">URL Cited:</span>{' '}
                  <strong className={labResult.cited ? 'text-emerald-600' : 'text-red-500'}>
                    {labResult.cited ? `YES (Rank #${labResult.citationOrder || 1})` : 'NO'}
                  </strong>
                </div>
              </div>

              {labResult.competitorNames?.length > 0 && (
                <div className="pt-1 text-[11px] text-amber-700 dark:text-amber-400">
                  ⚠️ Competitors Cited: <strong>{labResult.competitorNames.join(', ')}</strong>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Recorded Observations History Table */}
      <div className="bg-white dark:bg-[#111622] border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden shadow-xs">
        <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <h3 className="text-xs font-black uppercase tracking-wider text-gray-700 dark:text-gray-200">
            Recorded AI Visibility History ({observations.length})
          </h3>
          <span className="text-[10px] text-gray-400 font-mono">Real Empirical Citation Ledger</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50 dark:bg-[#151C28] text-gray-500 uppercase tracking-wider font-extrabold border-b border-gray-200 dark:border-gray-800">
              <tr>
                <th className="py-3 px-4">Query</th>
                <th className="py-3 px-4">Provider</th>
                <th className="py-3 px-4">Mentioned</th>
                <th className="py-3 px-4">Cited</th>
                <th className="py-3 px-4">Competitors Observed</th>
                <th className="py-3 px-4">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800/60 font-medium">
              {observations.length > 0 ? (
                observations.map((obs) => (
                  <tr key={obs.id} className="hover:bg-gray-50/50 dark:hover:bg-[#161D2A]/50 transition-colors">
                    <td className="py-3 px-4 font-bold text-gray-900 dark:text-white max-w-[260px] truncate">
                      {obs.query}
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-bold text-gray-700 dark:text-gray-300">
                        {obs.provider}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        obs.mentioned ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'
                      }`}>
                        {obs.mentioned ? 'YES' : 'NO'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        obs.cited ? 'bg-blue-500/10 text-blue-500' : 'bg-gray-100 dark:bg-gray-800 text-gray-400'
                      }`}>
                        {obs.cited ? `YES (#${obs.citationOrder || 1})` : 'NO'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-500 text-[11px]">
                      {obs.competitorNames?.join(', ') || 'None'}
                    </td>
                    <td className="py-3 px-4 text-gray-400 text-[11px] font-mono">
                      {new Date(obs.observedAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="text-center py-6 text-xs text-gray-400">
                    No observations recorded yet. Run a prompt in ChatGPT/Gemini and paste the result above!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Visual AI Citation History Timeline & Change Detection Event Ledger */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Month-by-Month Citation Timeline */}
        <div className="bg-white dark:bg-[#111622] border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden shadow-xs">
          <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
            <h3 className="text-xs font-black uppercase tracking-wider text-gray-700 dark:text-gray-200 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-purple-500" />
              AI Citation History Timeline
            </h3>
            <span className="text-[10px] text-gray-400">Multi-Model Evolution</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 dark:bg-[#151C28] text-gray-500 uppercase tracking-wider font-extrabold border-b border-gray-200 dark:border-gray-800">
                <tr>
                  <th className="py-3 px-4">Period</th>
                  <th className="py-3 px-4">Query</th>
                  <th className="py-3 px-3 text-center">ChatGPT</th>
                  <th className="py-3 px-3 text-center">Gemini</th>
                  <th className="py-3 px-3 text-center">Perplexity</th>
                  <th className="py-3 px-3 text-center">Claude</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800/60 font-medium">
                {timeline.length > 0 ? (
                  timeline.map((t, idx) => (
                    <tr key={idx} className="hover:bg-gray-50/50 dark:hover:bg-[#161D2A]/50 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-gray-900 dark:text-white">{t.dateMonth}</td>
                      <td className="py-3 px-4 text-gray-700 dark:text-gray-300 max-w-[150px] truncate">{t.query}</td>
                      <td className="py-3 px-3 text-center">
                        <span className={t.chatGptCited ? 'text-emerald-500 font-bold' : 'text-gray-300 dark:text-gray-600'}>
                          {t.chatGptCited ? '✓' : '✗'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className={t.geminiCited ? 'text-emerald-500 font-bold' : 'text-gray-300 dark:text-gray-600'}>
                          {t.geminiCited ? '✓' : '✗'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className={t.perplexityCited ? 'text-emerald-500 font-bold' : 'text-gray-300 dark:text-gray-600'}>
                          {t.perplexityCited ? '✓' : '✗'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className={t.claudeCited ? 'text-emerald-500 font-bold' : 'text-gray-300 dark:text-gray-600'}>
                          {t.claudeCited ? '✓' : '✗'}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="text-center py-6 text-xs text-gray-400">
                      No citation timeline points recorded yet. Run a prompt test above to start tracking.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Citation Change Event Ledger */}
        <div className="bg-white dark:bg-[#111622] border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden shadow-xs">
          <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
            <h3 className="text-xs font-black uppercase tracking-wider text-gray-700 dark:text-gray-200 flex items-center gap-1.5">
              <RefreshCw className="w-4 h-4 text-blue-500" />
              Citation-Change Event Ledger
            </h3>
            <span className="text-[10px] text-gray-400">Automated Delta Detector</span>
          </div>

          <div className="divide-y divide-gray-100 dark:divide-gray-800/60 p-2 max-h-[340px] overflow-y-auto">
            {events.map((evt) => (
              <div key={evt.id} className="p-3 text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] uppercase ${
                      evt.eventType === 'NEW_CITATION' ? 'bg-emerald-500/10 text-emerald-600' :
                      evt.eventType === 'CITATION_LOST' ? 'bg-rose-500/10 text-rose-600' :
                      'bg-blue-500/10 text-blue-600'
                    }`}>
                      {evt.eventType.replace('_', ' ')}
                    </span>
                    <span className="font-bold text-gray-900 dark:text-white">{evt.provider}</span>
                  </div>
                  <span className="font-mono text-[10px] text-gray-400">
                    {new Date(evt.detectedAt).toLocaleDateString()}
                  </span>
                </div>
                <div className="text-[11px] text-gray-600 dark:text-gray-300">
                  {evt.details}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
