'use client';

// Change password (account has one) or set a first password (account only
// signs in with Google/GitHub/Facebook). Either way the account is signed
// out afterwards and sent to /auth: Firebase revokes every other session on
// a password change, and this one is ended on purpose so the next step is a
// fresh sign-in with the new password.
//
// A bottom sheet on phones, a centred dialog from `sm` up (DESIGN.md).

import React, { useEffect, useRef, useState } from 'react';
import { Mail, X } from 'lucide-react';
import { useEscapeKey } from '@/hooks/useEscapeKey';
import { useAuth } from '@/contexts/AuthContext';
import { changePassword, setInitialPassword, getFreshToken } from '@/lib/firebase';
import { requestPasswordReset } from '@/lib/passwordReset';
import { validatePassword } from '@/lib/authUtils';
import {
  PasswordInput, PasswordRules, Notice, Spinner, isNewPasswordReady,
  primaryButtonClass, ghostButtonClass, textLinkClass,
} from '@/components/auth/PasswordFields';
import { LockIcon } from './ProfileIcons';

interface ChangePasswordFormProps {
  /** 'change': has a password. 'set': social sign-in only, adding the first one. */
  mode: 'change' | 'set';
  /** The account's email, shown so it is clear which account this is for. */
  email: string;
  /** e.g. "Google"; named in 'set' mode. */
  providerName?: string;
  onClose: () => void;
}

type Step = 'form' | 'linkSent' | 'done';

function ChangePasswordForm({ mode, email, providerName, onClose }: ChangePasswordFormProps) {
  const { logout } = useAuth();
  const [step, setStep] = useState<Step>('form');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  // 'set' mode only: Firebase wants a fresh sign-in, so offer the email link.
  const [needsEmailLink, setNeedsEmailLink] = useState(false);
  const signOutTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isChange = mode === 'change';
  const title = isChange ? 'Change password' : 'Set a password';
  // Once the password is saved the dialog must not be dismissed: the sign-out
  // is already on its way.
  const canClose = !busy && step !== 'done';
  useEscapeKey(onClose, canClose);

  useEffect(() => () => { if (signOutTimer.current) clearTimeout(signOutTimer.current); }, []);

  const finish = () => {
    setStep('done');
    try {
      sessionStorage.setItem(
        'redirectMessage',
        isChange
          ? 'Password changed. Sign in with your new password.'
          : 'Password set. Sign in with your email and new password, or with ' + (providerName || 'your social account') + ' as before.'
      );
    } catch { /* ignore */ }
    // Leave the confirmation on screen long enough to read, then sign out.
    // logout() clears the session and goes to /auth.
    signOutTimer.current = setTimeout(() => {
      logout().catch(() => { window.location.assign('/auth'); });
    }, 1800);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setError('');
    setNeedsEmailLink(false);

    if (isChange && !currentPassword) { setError('Enter your current password.'); return; }
    const check = validatePassword(newPassword);
    if (!check.isValid) { setError(check.message); return; }
    if (newPassword !== confirmPassword) { setError('The two new passwords do not match.'); return; }
    if (isChange && currentPassword === newPassword) {
      setError('The new password must be different from the current one.');
      return;
    }

    setBusy(true);
    try {
      if (isChange) await changePassword(currentPassword, newPassword);
      else await setInitialPassword(newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      finish();
    } catch (err: any) {
      if (!isChange && err?.code === 'auth/requires-recent-login') setNeedsEmailLink(true);
      setError(err?.message || 'Could not save the password. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  // Forgot the current password, or Firebase wants a fresh sign-in: email a
  // link to /auth/reset for this account's own address.
  const handleEmailLink = async () => {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      const idToken = await getFreshToken();
      await requestPasswordReset({ email, idToken });
      setStep('linkSent');
    } catch (err: any) {
      setError(err?.message || 'Could not send the email. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-[4px] p-0 sm:p-4"
      onClick={() => { if (canClose) onClose(); }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="password-dialog-title"
        className="w-full sm:max-w-3xl max-h-[92dvh] overflow-y-auto bg-white dark:bg-[#1A1F26] rounded-t-2xl sm:rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xl p-5 sm:p-6 pb-[max(1.25rem,env(safe-area-inset-bottom))] font-spaceGrotesk"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-3 min-w-0">
            <span className="shrink-0 w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <LockIcon />
            </span>
            <h2 id="password-dialog-title" className="text-lg font-bold text-gray-900 dark:text-white">{title}</h2>
          </div>
          {canClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="shrink-0 p-2 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-800 active:scale-95 motion-reduce:transform-none transition-[transform,background-color] focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              <X className="w-5 h-5" aria-hidden="true" />
            </button>
          )}
        </div>

        {step === 'done' && (
          <Notice tone="info">
            <p className="font-semibold">{isChange ? 'Password changed' : 'Password set'}</p>
            <p className="mt-1 text-xs flex items-center gap-2">
              <Spinner /> Signing you out. Sign in again with your new password.
            </p>
          </Notice>
        )}

        {step === 'linkSent' && (
          <div className="space-y-4">
            <Notice tone="info">
              <p className="flex items-center gap-2 font-semibold">
                <Mail className="w-4 h-4 shrink-0" aria-hidden="true" /> Check your inbox
              </p>
              <p className="mt-1 text-xs leading-relaxed">
                We sent a link to <strong className="break-all">{email}</strong>. Open it to choose your password. It works once and expires in 1 hour, and may land in Spam or Promotions.
              </p>
            </Notice>
            <button type="button" onClick={onClose} className={ghostButtonClass}>Done</button>
          </div>
        )}

        {step === 'form' && (
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {isChange && (
              /* WebMCP Schema Injection */
              <script
                type="application/webmcp+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify({
                  tools: [
                    {
                      name: "change_password",
                      description: "Change the user's account password. The user is signed out afterwards.",
                      parameters: {
                        type: "object",
                        properties: {
                          current_password: { type: "string", description: "The user's current password" },
                          new_password: { type: "string", description: "The new password (8-64 characters, one uppercase and one lowercase letter)" },
                          confirm_password: { type: "string", description: "Confirmation of the new password" }
                        },
                        required: ["current_password", "new_password", "confirm_password"]
                      }
                    }
                  ]
                }) }}
              />
            )}

            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
              {isChange ? (
                <>For <strong className="font-semibold text-gray-900 dark:text-white break-all">{email}</strong>. You will be signed out on every device afterwards.</>
              ) : (
                <>You sign in with {providerName || 'a social account'}. Add a password to also sign in with <strong className="font-semibold text-gray-900 dark:text-white break-all">{email}</strong>. You will be signed out afterwards.</>
              )}
            </p>

            {/* Lets password managers file the password under the right account. */}
            <input type="email" name="email" autoComplete="username" value={email} readOnly tabIndex={-1} aria-hidden="true" className="sr-only" />

            <div className="grid gap-4 sm:grid-cols-2 sm:gap-x-6">
            <div className="space-y-4">
            {isChange && (
              <div>
                <PasswordInput
                  label="Current password"
                  name="current_password"
                  value={currentPassword}
                  onChange={(v) => { setCurrentPassword(v); setError(''); }}
                  autoComplete="current-password"
                  placeholder="Enter your current password"
                  disabled={busy}
                  autoFocus
                />
                <button type="button" onClick={handleEmailLink} disabled={busy} className={`${textLinkClass} mt-2`}>
                  Forgot it? Email me a reset link
                </button>
              </div>
            )}

            <PasswordInput
              label="New password"
              name="new_password"
              value={newPassword}
              onChange={(v) => { setNewPassword(v); setError(''); }}
              autoComplete="new-password"
              placeholder="Create a password"
              disabled={busy}
              autoFocus={!isChange}
              describedBy="profile-password-rules"
            />
            <PasswordInput
              label="Confirm new password"
              name="confirm_password"
              value={confirmPassword}
              onChange={(v) => { setConfirmPassword(v); setError(''); }}
              autoComplete="new-password"
              placeholder="Re-enter password"
              disabled={busy}
            />
            </div>
            <div className="space-y-4">
            <PasswordRules id="profile-password-rules" password={newPassword} confirm={confirmPassword} />

            {error && (
              <Notice tone={needsEmailLink ? 'caution' : 'error'}>
                <p>{error}</p>
                {needsEmailLink && (
                  <button type="button" onClick={handleEmailLink} disabled={busy} className={`${textLinkClass} mt-2`}>
                    Email me the link
                  </button>
                )}
              </Notice>
            )}
            </div>
            </div>

            <div className="flex flex-col-reverse sm:flex-row gap-3 pt-1">
              <button type="button" onClick={onClose} disabled={busy} className={ghostButtonClass}>Cancel</button>
              <button
                type="submit"
                disabled={busy || (isChange && !currentPassword) || !isNewPasswordReady(newPassword, confirmPassword)}
                className={primaryButtonClass}
              >
                {busy ? (<><Spinner /> Saving…</>) : title}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

ChangePasswordForm.displayName = 'ChangePasswordForm';
export default React.memo(ChangePasswordForm);
