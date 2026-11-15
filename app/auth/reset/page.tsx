'use client'

// /auth/reset?oobCode=… — where the "reset your password" email lands
// (app/api/auth/password-reset builds the link). Checks the one-time code,
// takes a new password, then signs this browser out so the next step is a
// fresh sign-in. Firebase revokes every other session on a password change.
// Also accepts Firebase's own link format (?mode=resetPassword&oobCode=…).

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { loadFirebase, USER_CACHE_KEY } from '@/lib/firebaseLoader'
import { validatePassword } from '@/lib/authUtils'
import {
  PasswordInput, PasswordRules, Notice, Spinner, isNewPasswordReady,
  primaryButtonClass, ghostButtonClass,
} from '@/components/auth/PasswordFields'

type Step = 'checking' | 'form' | 'invalid' | 'offline' | 'done'

const isDeadLink = (code: string) =>
  code.includes('expired-action-code') || code.includes('invalid-action-code') ||
  code.includes('user-not-found') || code.includes('user-disabled')

export default function ResetPasswordPage() {
  const [step, setStep] = useState<Step>('checking')
  const [oobCode, setOobCode] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const code = params.get('oobCode') || ''
    const mode = params.get('mode')
    if (!code || (mode && mode !== 'resetPassword')) {
      setStep('invalid')
      return
    }
    let cancelled = false
    setStep('checking')
    ;(async () => {
      try {
        const fb = await loadFirebase()
        const address = await fb.verifyPasswordResetCode(fb.auth, code)
        if (cancelled) return
        setOobCode(code)
        setEmail(address)
        setStep('form')
      } catch (err: any) {
        if (cancelled) return
        setStep(isDeadLink(String(err?.code || '')) ? 'invalid' : 'offline')
      }
    })()
    return () => { cancelled = true }
  }, [attempt])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (saving) return
    const check = validatePassword(password)
    if (!check.isValid) { setError(check.message); return }
    if (password !== confirm) { setError('The two passwords do not match.'); return }

    setSaving(true)
    setError('')
    try {
      const fb = await loadFirebase()
      await fb.confirmPasswordReset(fb.auth, oobCode, password)
      // Whoever was signed in here is signed out: the next step is a fresh
      // sign-in with the new password.
      try { localStorage.removeItem(USER_CACHE_KEY) } catch { /* ignore */ }
      try { if (fb.auth.currentUser) await fb.signOut(fb.auth) } catch { /* session is revoked anyway */ }
      setPassword('')
      setConfirm('')
      setStep('done')
    } catch (err: any) {
      const code = String(err?.code || '')
      if (isDeadLink(code)) setStep('invalid')
      else if (code.includes('weak-password') || code.includes('password-does-not-meet-requirements')) {
        setError('That password is too weak. Use 8 to 64 characters with an uppercase and a lowercase letter.')
      } else if (code.includes('network-request-failed')) {
        setError('Network problem. Check your connection and try again.')
      } else {
        setError('Could not save the new password. Please try again.')
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-white dark:bg-[#090E17] flex flex-col items-center justify-center px-4 pt-24 pb-12 sm:pt-28">
      <div className="w-full max-w-md font-spaceGrotesk">
        <div className="bg-white dark:bg-[#1A1F26] rounded-3xl p-5 sm:p-8 shadow-xl shadow-gray-200/50 dark:shadow-none border border-gray-100 dark:border-gray-800">

          {step === 'checking' && (
            <div className="flex flex-col items-center gap-3 py-10 text-gray-600 dark:text-gray-300" role="status">
              <Spinner />
              <p className="text-sm">Checking your reset link…</p>
            </div>
          )}

          {step === 'form' && (
            <>
              <h1 className="font-coolvetica text-2xl sm:text-4xl font-normal text-gray-900 dark:text-white mb-2">
                Choose a <span className="text-blue-600 dark:text-blue-400">new password</span>
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mb-6 text-sm">
                For <strong className="font-semibold text-gray-900 dark:text-white break-all">{email}</strong>
              </p>

              <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                {/* Lets password managers file the new password under the right account. */}
                <input type="email" name="email" autoComplete="username" value={email} readOnly tabIndex={-1} aria-hidden="true" className="sr-only" />
                <PasswordInput
                  label="New password"
                  name="new-password"
                  value={password}
                  onChange={(v) => { setPassword(v); setError('') }}
                  autoComplete="new-password"
                  placeholder="Create a password"
                  disabled={saving}
                  autoFocus
                  describedBy="reset-password-rules"
                />
                <PasswordInput
                  label="Confirm new password"
                  name="confirm-password"
                  value={confirm}
                  onChange={(v) => { setConfirm(v); setError('') }}
                  autoComplete="new-password"
                  placeholder="Re-enter password"
                  disabled={saving}
                />
                <PasswordRules id="reset-password-rules" password={password} confirm={confirm} />

                {error && <Notice tone="error">{error}</Notice>}

                <button type="submit" disabled={saving || !isNewPasswordReady(password, confirm)} className={primaryButtonClass}>
                  {saving ? (<><Spinner /> Saving…</>) : 'Save new password'}
                </button>
                <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                  Saving signs you out on every device. You will sign in again with the new password.
                </p>
              </form>
            </>
          )}

          {step === 'done' && (
            <div role="status">
              <h1 className="font-coolvetica text-2xl sm:text-4xl font-normal text-gray-900 dark:text-white mb-2">
                Password <span className="text-blue-600 dark:text-blue-400">updated</span>
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mb-6 text-sm leading-relaxed">
                You have been signed out on every device. Sign in with your new password to continue.
              </p>
              <Link href="/auth" className={primaryButtonClass}>Sign in</Link>
            </div>
          )}

          {step === 'invalid' && (
            <>
              <h1 className="font-coolvetica text-2xl sm:text-4xl font-normal text-gray-900 dark:text-white mb-2">
                This link has <span className="text-blue-600 dark:text-blue-400">expired</span>
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mb-6 text-sm leading-relaxed">
                Reset links work once and last 1 hour. Request a fresh link and open it straight away.
              </p>
              <div className="space-y-3">
                <Link href="/auth?forgot=1" className={primaryButtonClass}>Send a new link</Link>
                <Link href="/auth" className={ghostButtonClass}>Back to sign in</Link>
              </div>
            </>
          )}

          {step === 'offline' && (
            <>
              <h1 className="font-coolvetica text-2xl sm:text-4xl font-normal text-gray-900 dark:text-white mb-2">
                Could not <span className="text-blue-600 dark:text-blue-400">check the link</span>
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mb-6 text-sm leading-relaxed">
                This looks like a connection problem, not a problem with your link. Check your internet and try again.
              </p>
              <button type="button" onClick={() => setAttempt((n) => n + 1)} className={primaryButtonClass}>Try again</button>
            </>
          )}

        </div>
      </div>
    </div>
  )
}
