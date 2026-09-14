'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X, ExternalLink, CheckCircle2, AlertCircle, Loader2, Trash2, Camera } from 'lucide-react';

interface AvatarUploadModalProps {
  currentPhotoURL?: string | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (photoURL: string | null) => Promise<void>;
}

type CheckStatus = 'idle' | 'checking' | 'valid' | 'invalid';

export default function AvatarUploadModal({
  currentPhotoURL,
  isOpen,
  onClose,
  onSave,
}: AvatarUploadModalProps) {
  const [urlInput, setUrlInput] = useState('');
  const [checkStatus, setCheckStatus] = useState<CheckStatus>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [previewSrc, setPreviewSrc] = useState<string>(currentPhotoURL || '/favicon.svg');
  const checkTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isOpen) {
      setUrlInput('');
      setCheckStatus('idle');
      setErrorMessage('');
      setPreviewSrc(currentPhotoURL || '/favicon.svg');
    }
  }, [isOpen, currentPhotoURL]);

  if (!isOpen) return null;

  // Real-time verification of image availability
  const verifyImage = (url: string) => {
    const trimmed = url.trim();
    if (!trimmed) {
      setCheckStatus('idle');
      setErrorMessage('');
      setPreviewSrc(currentPhotoURL || '/favicon.svg');
      return;
    }

    // Basic URL validation
    if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
      setCheckStatus('invalid');
      setErrorMessage('Please enter a valid URL starting with https://');
      setPreviewSrc('/favicon.svg');
      return;
    }

    // Friendly check if user pasted the ibb.co viewer page instead of Direct Link
    if (trimmed.includes('ibb.co/') && !trimmed.includes('i.ibb.co') && !trimmed.match(/\.(png|jpg|jpeg|webp|gif)$/i)) {
      setCheckStatus('invalid');
      setErrorMessage("This looks like an ImgBB page link. Please choose 'Direct Links' on ImgBB (e.g. https://i.ibb.co.com/.../your-profile-pic.png) so your photo renders directly.");
      setPreviewSrc('/favicon.svg');
      return;
    }

    setCheckStatus('checking');
    setErrorMessage('');

    // Probe the image in browser
    const img = new window.Image();
    let isCancelled = false;

    const timeoutId = setTimeout(() => {
      if (!isCancelled) {
        setCheckStatus('invalid');
        setErrorMessage('Image took too long to respond. Please verify the URL is public.');
        setPreviewSrc('/favicon.svg');
      }
    }, 7000);

    img.onload = () => {
      if (isCancelled) return;
      clearTimeout(timeoutId);
      setCheckStatus('valid');
      setErrorMessage('');
      setPreviewSrc(trimmed);
    };

    img.onerror = () => {
      if (isCancelled) return;
      clearTimeout(timeoutId);
      setCheckStatus('invalid');
      setErrorMessage('Unable to load image from this URL. Make sure the link is direct and publicly accessible.');
      setPreviewSrc('/favicon.svg');
    };

    img.src = trimmed;

    return () => {
      isCancelled = true;
      clearTimeout(timeoutId);
    };
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setUrlInput(val);

    if (checkTimeoutRef.current) {
      clearTimeout(checkTimeoutRef.current);
    }

    checkTimeoutRef.current = setTimeout(() => {
      verifyImage(val);
    }, 400);
  };

  const handleSavePicture = async () => {
    if (checkStatus !== 'valid' || !urlInput.trim()) return;
    setIsSaving(true);
    try {
      await onSave(urlInput.trim());
      onClose();
    } catch (err: any) {
      setCheckStatus('invalid');
      setErrorMessage(err?.message || 'Failed to save profile picture. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetToDefault = async () => {
    setIsSaving(true);
    try {
      await onSave(null);
      onClose();
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to reset profile picture.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSaving) onClose();
      }}
    >
      <div
        className="relative w-full max-w-lg bg-white dark:bg-[#16202D] border border-gray-200 dark:border-gray-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h2 id="modal-title" className="text-base font-bold text-gray-900 dark:text-white">
                Change Profile Picture
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Update your avatar using a direct ImgBB link
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isSaving}
            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* Avatar Preview Section */}
          <div className="flex flex-col sm:flex-row items-center gap-5 p-4 rounded-xl bg-gray-50 dark:bg-[#0F1621] border border-gray-100 dark:border-gray-800/80">
            <div className="relative shrink-0">
              <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-blue-500/30 dark:border-blue-400/40 p-0.5 bg-white dark:bg-gray-900 shadow-md">
                <div className="w-full h-full rounded-full overflow-hidden relative flex items-center justify-center bg-gray-100 dark:bg-gray-800">
                  {previewSrc ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={previewSrc}
                      alt="Avatar Preview"
                      className="w-full h-full object-cover"
                      onError={() => setPreviewSrc('/favicon.svg')}
                    />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src="/favicon.svg"
                      alt="Default Logo Avatar"
                      className="w-12 h-12 object-contain"
                    />
                  )}
                </div>
              </div>
            </div>

            <div className="flex-1 text-center sm:text-left">
              <div className="text-xs font-semibold text-gray-900 dark:text-white mb-1">
                Avatar Preview
              </div>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed">
                {checkStatus === 'valid'
                  ? 'Looking sharp! Click "Save Picture" below to set this as your avatar.'
                  : checkStatus === 'checking'
                  ? 'Testing image link availability...'
                  : checkStatus === 'invalid'
                  ? 'Preview unavailable — please enter a valid direct image URL.'
                  : 'Displays your custom photo, or the default StockSimulatorBD logo.'}
              </p>
            </div>
          </div>

          {/* Step-by-Step Instructions */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                How to upload via ImgBB
              </span>
              <a
                href="https://imgbb.com"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
              >
                <span>Open ImgBB</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <div className="p-3.5 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30 text-xs text-gray-700 dark:text-gray-300 space-y-2">
              <div className="flex items-start gap-2">
                <span className="shrink-0 w-5 h-5 rounded-full bg-blue-600 text-white text-[11px] font-bold flex items-center justify-center">
                  1
                </span>
                <span>
                  Go to <strong className="text-blue-600 dark:text-blue-400">imgbb.com</strong> and click <strong>Start Uploading</strong>.
                </span>
              </div>
              <div className="flex items-start gap-2">
                <span className="shrink-0 w-5 h-5 rounded-full bg-blue-600 text-white text-[11px] font-bold flex items-center justify-center">
                  2
                </span>
                <span>
                  In Auto-delete, choose <strong className="text-gray-900 dark:text-white">&quot;Don&apos;t autodelete&quot;</strong> so your photo stays active.
                </span>
              </div>
              <div className="flex items-start gap-2">
                <span className="shrink-0 w-5 h-5 rounded-full bg-blue-600 text-white text-[11px] font-bold flex items-center justify-center">
                  3
                </span>
                <span>
                  Click <strong>Upload</strong>. On the completion screen, open the dropdown and choose <strong className="text-gray-900 dark:text-white">&quot;Direct Links&quot;</strong>.
                </span>
              </div>
              <div className="flex items-start gap-2">
                <span className="shrink-0 w-5 h-5 rounded-full bg-blue-600 text-white text-[11px] font-bold flex items-center justify-center">
                  4
                </span>
                <span>
                  Copy the link and paste it into the box below.
                </span>
              </div>
            </div>
          </div>

          {/* URL Input Box */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300">
              Direct Image Link
            </label>
            <div className="relative">
              <input
                type="url"
                value={urlInput}
                onChange={handleInputChange}
                placeholder="e.g. https://i.ibb.co.com/R4g0ccPd/your-profile-pic.png"
                className="w-full px-4 py-3 text-xs sm:text-sm rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono transition-colors"
                disabled={isSaving}
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                {checkStatus === 'checking' && (
                  <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
                )}
                {checkStatus === 'valid' && (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                )}
                {checkStatus === 'invalid' && (
                  <AlertCircle className="w-4 h-4 text-rose-500" />
                )}
              </div>
            </div>

            {/* Verification Status Feedback */}
            {checkStatus === 'valid' && (
              <p className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                <span>Image verified and available!</span>
              </p>
            )}

            {checkStatus === 'invalid' && errorMessage && (
              <p className="text-xs text-rose-600 dark:text-rose-400 flex items-start gap-1.5 leading-tight">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </p>
            )}

            <p className="text-[11px] text-gray-400 dark:text-gray-500">
              Format: Direct link ending in .png, .jpg, .jpeg, or .webp (e.g. <span className="font-mono">https://i.ibb.co.com/R4g0ccPd/your-profile-pic.png</span>)
            </p>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-gray-50 dark:bg-[#11161F] border-t border-gray-100 dark:border-gray-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Reset button */}
          {currentPhotoURL ? (
            <button
              type="button"
              onClick={handleResetToDefault}
              disabled={isSaving}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl transition-colors border border-transparent hover:border-rose-200 dark:hover:border-rose-900/50"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Reset to Default Logo</span>
            </button>
          ) : (
            <div className="hidden sm:block" />
          )}

          {/* Action buttons */}
          <div className="w-full sm:w-auto flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="flex-1 sm:flex-none px-4 py-2 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-xl transition-colors"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleSavePicture}
              disabled={checkStatus !== 'valid' || isSaving}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-all shadow-sm shadow-blue-500/20 active:scale-95"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>Save Picture</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
