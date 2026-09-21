// app/admin/seo/llm-export/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { fetchWithToken } from '@/lib/utils/fetchWithToken';
import { FileText, Copy, Check, Download, Code, Sparkles, RefreshCw } from 'lucide-react';

export default function LlmExportPage() {
  const [markdown, setMarkdown] = useState('');
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [copiedJson, setCopiedJson] = useState(false);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const res = await fetchWithToken('/api/admin/seo/llm-export?format=markdown');
      const text = await res.text();
      setMarkdown(text);
    } catch (err) {
      console.error('Failed to generate LLM brief:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, []);

  const handleCopyMarkdown = () => {
    navigator.clipboard.writeText(markdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleCopyJson = async () => {
    try {
      const res = await fetchWithToken('/api/admin/seo/llm-export?format=json');
      const json = await res.json();
      navigator.clipboard.writeText(JSON.stringify(json, null, 2));
      setCopiedJson(true);
      setTimeout(() => setCopiedJson(false), 2500);
    } catch (err) {
      console.error('Failed to copy JSON:', err);
    }
  };

  const handleDownloadMd = () => {
    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `stocksimulatorbd-seo-report-${new Date().toISOString().split('T')[0]}.md`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#111622] p-4 sm:p-5 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xs">
        <div>
          <h2 className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-500" />
            LLM Search & GEO Intelligence Brief Exporter
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            1-Click export engineered for downstream reasoning models (Claude 3.7 Sonnet, GPT-4o, Gemini 1.5/2.0). Strictly distinguishes observed facts from hypotheses.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={fetchReport}
            disabled={loading}
            className="p-2 rounded-xl text-xs font-bold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 transition-colors"
            title="Refresh Brief"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={handleCopyMarkdown}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-all"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied Markdown!' : 'Copy Markdown'}</span>
          </button>
          <button
            onClick={handleCopyJson}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            {copiedJson ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Code className="w-3.5 h-3.5" />}
            <span>{copiedJson ? 'Copied JSON!' : 'Copy JSON'}</span>
          </button>
          <button
            onClick={handleDownloadMd}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download .md</span>
          </button>
        </div>
      </div>

      {/* Report Preview */}
      <div className="bg-white dark:bg-[#111622] border border-gray-200 dark:border-gray-800 rounded-2xl p-5 shadow-xs">
        <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800 mb-4">
          <div className="text-xs font-bold text-gray-500 uppercase tracking-wider">
            Live Brief Preview ({markdown.split('\n').length} lines)
          </div>
          <span className="text-[10px] font-mono text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-sm">
            Machine-Readable Format
          </span>
        </div>

        {loading ? (
          <div className="py-24 text-center text-xs text-gray-500">
            Generating real-time intelligence report...
          </div>
        ) : (
          <pre className="p-4 rounded-xl bg-gray-50 dark:bg-[#0C101A] border border-gray-200 dark:border-gray-800 text-xs font-mono text-gray-800 dark:text-gray-200 overflow-x-auto whitespace-pre-wrap leading-relaxed max-h-[600px] overflow-y-auto">
            {markdown}
          </pre>
        )}
      </div>
    </div>
  );
}
