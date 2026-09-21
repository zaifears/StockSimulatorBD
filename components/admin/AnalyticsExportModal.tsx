// components/admin/AnalyticsExportModal.tsx
'use client';

import React, { useState, useMemo } from 'react';
import {
  X,
  Copy,
  Check,
  Download,
  FileText,
  Code2,
  Sparkles,
  Bot,
  AlertCircle,
} from 'lucide-react';
import { SiteAnalyticsData } from '@/components/admin/SiteAnalyticsSection';
import {
  generateAdminAnalyticsMarkdown,
  generateAdminAnalyticsJson,
  downloadAnalyticsFile,
  AdminStatsContext,
} from '@/lib/utils/adminAnalyticsExporter';

interface AnalyticsExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: SiteAnalyticsData | null;
  stats?: AdminStatsContext;
  loading?: boolean;
}

export default function AnalyticsExportModal({
  isOpen,
  onClose,
  data,
  stats,
  loading = false,
}: AnalyticsExportModalProps) {
  const [activeTab, setActiveTab] = useState<'markdown' | 'json'>('markdown');
  const [copied, setCopied] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  const markdownContent = useMemo(() => {
    if (!data) return '';
    return generateAdminAnalyticsMarkdown(data, stats);
  }, [data, stats]);

  const jsonContent = useMemo(() => {
    if (!data) return '';
    return generateAdminAnalyticsJson(data, stats);
  }, [data, stats]);

  const currentContent = activeTab === 'markdown' ? markdownContent : jsonContent;

  const handleCopy = async () => {
    if (!currentContent) return;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(currentContent);
      } else {
        // Fallback for older browsers or insecure contexts
        const textArea = document.createElement('textarea');
        textArea.value = currentContent;
        textArea.style.position = 'fixed';
        textArea.style.left = '-9999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopied(true);
      setCopyFeedback(`Copied ${activeTab.toUpperCase()} to clipboard! Paste directly into your LLM.`);
      setTimeout(() => {
        setCopied(false);
        setCopyFeedback(null);
      }, 3000);
    } catch (err: any) {
      console.warn('Clipboard write failed, downloading file instead:', err);
      handleDownload();
      setCopyFeedback('Clipboard access denied — downloaded file to your device instead.');
      setTimeout(() => setCopyFeedback(null), 4000);
    }
  };

  const handleDownload = () => {
    if (!currentContent) return;
    const dateTag = new Date().toISOString().split('T')[0];
    if (activeTab === 'markdown') {
      downloadAnalyticsFile(`stocksimulatorbd-analytics-${dateTag}.md`, markdownContent, 'text/markdown;charset=utf-8');
    } else {
      downloadAnalyticsFile(`stocksimulatorbd-analytics-${dateTag}.json`, jsonContent, 'application/json;charset=utf-8');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="bg-white dark:bg-[#111622] border border-gray-200 dark:border-gray-800 w-full max-w-3xl rounded-2xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="export-modal-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 id="export-modal-title" className="text-base sm:text-lg font-black text-gray-900 dark:text-white flex items-center gap-2">
                Export Analytics for AI / LLM
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Empirical metrics formatted with structured prompts for ChatGPT, Claude, or Gemini.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Selection & Actions Bar */}
        <div className="px-4 sm:px-5 py-3 bg-gray-50/70 dark:bg-[#151C28] border-b border-gray-100 dark:border-gray-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 p-1 bg-gray-200/60 dark:bg-[#1A2232] rounded-xl self-start sm:self-auto">
            <button
              onClick={() => setActiveTab('markdown')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'markdown'
                  ? 'bg-white dark:bg-[#111622] text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              Markdown (Prompt-Ready)
            </button>
            <button
              onClick={() => setActiveTab('json')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'json'
                  ? 'bg-white dark:bg-[#111622] text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <Code2 className="w-3.5 h-3.5" />
              Raw JSON Data
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              disabled={loading || !data}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition-all shadow-xs active:scale-95 min-h-[38px]"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied!' : `Copy ${activeTab === 'markdown' ? 'Markdown' : 'JSON'}`}</span>
            </button>

            <button
              onClick={handleDownload}
              disabled={loading || !data}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-gray-700 dark:text-gray-200 bg-white dark:bg-[#16202D] border border-gray-200/80 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 transition-all shadow-xs active:scale-95 min-h-[38px]"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download .{activeTab === 'markdown' ? 'md' : 'json'}</span>
            </button>
          </div>
        </div>

        {/* Feedback Banner */}
        {copyFeedback && (
          <div className="px-4 sm:px-5 py-2 bg-emerald-50 dark:bg-emerald-950/40 border-b border-emerald-200 dark:border-emerald-800/60 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
            <Check className="w-3.5 h-3.5 shrink-0" />
            <span className="font-medium">{copyFeedback}</span>
          </div>
        )}

        {/* Content Preview Container */}
        <div className="p-4 sm:p-5 grow overflow-y-auto font-mono text-xs text-gray-800 dark:text-gray-200 bg-gray-50/50 dark:bg-[#0C1017]">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center text-center">
              <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin mb-3" />
              <p className="text-gray-500 font-sans">Compiling live platform metrics...</p>
            </div>
          ) : !data ? (
            <div className="py-16 text-center text-gray-400 font-sans">
              <AlertCircle className="w-8 h-8 mx-auto mb-2 text-amber-500" />
              <p className="font-semibold text-gray-700 dark:text-gray-300">No Analytics Loaded Yet</p>
              <p className="text-xs text-gray-500 mt-1">Please turn on Analytics or click Refresh on the dashboard to load data.</p>
            </div>
          ) : (
            <pre className="whitespace-pre-wrap break-words leading-relaxed select-all">
              {currentContent}
            </pre>
          )}
        </div>

        {/* Footer info note */}
        <div className="p-3 sm:p-4 bg-white dark:bg-[#111622] border-t border-gray-100 dark:border-gray-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-gray-500 dark:text-gray-400">
          <div className="flex items-center gap-1.5">
            <Bot className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
            <span>Includes instructions asking the LLM to review user acquisition, retention, trading velocity, and monetization.</span>
          </div>
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg text-xs font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors self-end sm:self-auto"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
