'use client';

// Shared pieces for every screen that sets a password (reset page, change /
// set password dialog): a password input with a show/hide toggle, and the
// live rules list. Rules come from PASSWORD_RULES so they stay in step with
// sign-up and validatePassword.

import { useId, useState } from 'react';
import { Eye, EyeOff, Check, Circle } from 'lucide-react';
import { PASSWORD_RULES } from '@/lib/authUtils';

export const fieldLabelClass = 'block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2';

export const fieldInputClass =
  'w-full px-3 py-2.5 rounded-xl bg-gray-50 dark:bg-[#111418] border border-gray-200 dark:border-gray-800 ' +
  'text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 text-sm ' +
  'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow disabled:opacity-50';

export const primaryButtonClass =
  'w-full min-h-[44px] py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold text-sm ' +
  'shadow-lg shadow-blue-500/20 transform hover:-translate-y-0.5 active:scale-95 motion-reduce:transform-none transition-[transform,background-color,box-shadow] duration-200 ' +
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#1A1F26] ' +
  'disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2';

export const ghostButtonClass =
  'w-full min-h-[44px] py-2.5 px-4 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 ' +
  'text-gray-900 dark:text-gray-100 font-semibold text-sm active:scale-95 motion-reduce:transform-none transition-[transform,background-color] duration-200 ' +
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#1A1F26] ' +
  'disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2';

export const textLinkClass =
  'text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 hover:underline ' +
  'rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-50 disabled:no-underline';

export function Spinner() {
  return (
    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  );
}

interface PasswordInputProps {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: 'current-password' | 'new-password';
  placeholder?: string;
  disabled?: boolean;
  autoFocus?: boolean;
  describedBy?: string;
}

export function PasswordInput({
  label, name, value, onChange, autoComplete, placeholder, disabled, autoFocus, describedBy,
}: PasswordInputProps) {
  const id = useId();
  const [visible, setVisible] = useState(false);
  return (
    <div>
      <label htmlFor={id} className={fieldLabelClass}>{label}</label>
      <div className="relative">
        <input
          id={id}
          name={name}
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          placeholder={placeholder}
          disabled={disabled}
          autoFocus={autoFocus}
          aria-describedby={describedBy}
          maxLength={128}
          required
          className={`${fieldInputClass} pr-11`}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          disabled={disabled}
          aria-label={visible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
          className="absolute right-1 top-1/2 -translate-y-1/2 p-2 rounded-lg text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          {visible ? <EyeOff className="w-4 h-4" aria-hidden="true" /> : <Eye className="w-4 h-4" aria-hidden="true" />}
        </button>
      </div>
    </div>
  );
}

/** Ticks each rule as it is met, and says whether the two entries match. */
export function PasswordRules({ id, password, confirm }: { id: string; password: string; confirm: string }) {
  const matches = password === confirm;
  const met = 'text-blue-700 dark:text-blue-300';
  const unmet = 'text-gray-500 dark:text-gray-400';
  return (
    <div className="rounded-xl bg-gray-50 dark:bg-[#111418] border border-gray-200 dark:border-gray-800 px-3 py-2.5">
      <p className="text-[11px] font-semibold text-gray-600 dark:text-gray-300 mb-1">Your password needs:</p>
      <ul id={id} className="space-y-1" aria-label="Password requirements">
        {PASSWORD_RULES.map((rule) => {
          const ok = rule.test(password);
          return (
            <li key={rule.label} className={`flex items-center gap-1.5 text-xs ${ok ? met : unmet}`}>
              {ok ? <Check className="w-3.5 h-3.5 shrink-0" aria-hidden="true" /> : <Circle className="w-3 h-3 shrink-0" aria-hidden="true" />}
              <span>{rule.label}<span className="sr-only">{ok ? ' (done)' : ' (not yet)'}</span></span>
            </li>
          );
        })}
      </ul>
      {confirm && (
        <p aria-live="polite" className={`mt-1.5 flex items-center gap-1.5 text-xs ${matches ? met : 'text-amber-700 dark:text-amber-400'}`}>
          {matches ? <Check className="w-3.5 h-3.5 shrink-0" aria-hidden="true" /> : <Circle className="w-3 h-3 shrink-0" aria-hidden="true" />}
          {matches ? 'Passwords match' : 'Passwords do not match yet'}
        </p>
      )}
    </div>
  );
}

/** True when the password passes every rule and both entries match. */
export function isNewPasswordReady(password: string, confirm: string): boolean {
  return PASSWORD_RULES.every((rule) => rule.test(password)) && password === confirm;
}

type NoticeTone = 'info' | 'error' | 'caution';

const noticeTones: Record<NoticeTone, string> = {
  info: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800/50 text-blue-800 dark:text-blue-200',
  error: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800/50 text-red-700 dark:text-red-300',
  caution: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800/50 text-amber-900 dark:text-amber-200',
};

export function Notice({ tone, children }: { tone: NoticeTone; children: React.ReactNode }) {
  return (
    <div role={tone === 'error' ? 'alert' : 'status'} className={`rounded-2xl border p-3.5 text-sm leading-relaxed ${noticeTones[tone]}`}>
      {children}
    </div>
  );
}
