// Shown under a rejected Boss/recharge request: the admin's reason plus a
// WhatsApp link to dispute it.

import { AlertCircle } from 'lucide-react';
import { SUPPORT_WHATSAPP_URL } from '@/lib/rejectionReasons';

// Older rejections stored this placeholder; show the friendlier default instead.
const LEGACY_EMPTY = new Set(['No reason provided', '']);

export default function RejectionNotice({ reason }: { reason?: string | null }) {
  const shown = reason && !LEGACY_EMPTY.has(reason.trim()) ? reason : 'Payment could not be verified';
  return (
    <div className="mt-2 rounded-lg border border-rose-200 dark:border-rose-800/60 bg-rose-50 dark:bg-rose-950/30 px-3 py-2 text-[12px] leading-relaxed text-rose-800 dark:text-rose-300">
      <p className="flex items-start gap-1.5">
        <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
        <span>
          <strong className="font-bold">Reason:</strong> {shown}
        </span>
      </p>
      <p className="mt-1 pl-5 text-rose-700/90 dark:text-rose-300/80">
        Think we made a mistake?{' '}
        <a
          href={SUPPORT_WHATSAPP_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="font-bold underline underline-offset-2 hover:text-rose-900 dark:hover:text-rose-100"
        >
          Message us on WhatsApp
        </a>{' '}
        with your Transaction ID.
      </p>
    </div>
  );
}
