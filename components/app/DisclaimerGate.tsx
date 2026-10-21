'use client';

// components/app/DisclaimerGate.tsx
// A hard, non-dismissible gate in front of the entire trading app shell
// (see components/app/AppShell.tsx). The app now reads closely enough like
// a real broker terminal that every authenticated user must explicitly
// agree, once, that it's an educational simulator with no real money before
// they can reach /trade, /trade/order, /portfolio, /coins, or /profile.
//
// Deliberately structural rather than a visual overlay: while agreement is
// unresolved, `children` (the real shell/content) simply never mounts —
// there is nothing to scroll behind, click through, or reveal by removing
// a DOM node, and no backdrop-click/Escape dismissal is wired up. The only
// way through is the Yes/No decision itself.
//
// Consent is recorded server-side (app/api/disclaimer/agree/route.ts) as
// users/{uid}.disclaimerAgreedAt — a field firestore.rules excludes from
// client writes, so it can't be spoofed. The trade route independently
// re-checks the same field, so this is real enforcement, not just a UI
// wall a devtools user could bypass.
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { doc, getFirestore, onSnapshot } from 'firebase/firestore';
import { useAuth } from '@/contexts/AuthContext';
import { fetchWithFreshToken } from '@/lib/utils/fetchWithToken';

type Status = 'loading' | 'pending' | 'agreed';

function useDisclaimerStatus(uid: string | undefined): Status {
  const [status, setStatus] = useState<Status>('loading');

  useEffect(() => {
    if (!uid) return;

    // Reset on every uid change. Without this, switching accounts (sign out,
    // sign in as someone else) would carry the previous user's 'agreed'
    // straight through, letting the second account skip the gate entirely
    // until its own snapshot arrived.
    setStatus('loading');

    const ref = doc(getFirestore(), 'users', uid);
    return onSnapshot(
      ref,
      (snap) => setStatus(snap.exists() && snap.data()?.disclaimerAgreedAt ? 'agreed' : 'pending'),
      (err) => {
        // Fail closed: an unreadable profile means we cannot show that this
        // person has agreed, and the whole point of the gate is that it is
        // not bypassable. Re-agreeing is harmless — the API is idempotent
        // and won't double-count the analytics tally.
        console.warn('Disclaimer status listener error:', err);
        setStatus('pending');
      }
    );
  }, [uid]);

  return status;
}

export default function DisclaimerGate({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const uid = user?.uid;
  const status = useDisclaimerStatus(uid);
  // Answering "I Agree" flips this immediately for a snappy unlock, ahead of
  // the Firestore listener round-trip (which arrives moments later anyway
  // and simply confirms the same thing). Keyed by uid so it can never carry
  // over to a different account.
  const [agreedUid, setAgreedUid] = useState<string | null>(null);
  const optimisticallyAgreed = Boolean(uid && agreedUid === uid);

  if (status === 'agreed' || optimisticallyAgreed) {
    return <>{children}</>;
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-[#0B0E11]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    );
  }

  return <DisclaimerModal onAgreed={() => setAgreedUid(uid ?? null)} />;
}

function DisclaimerModal({ onAgreed }: { onAgreed: () => void }) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAgree = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetchWithFreshToken('/api/disclaimer/agree', { method: 'POST' });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Something went wrong');
      onAgreed();
    } catch (err: any) {
      setError(err.message || 'Could not record your agreement. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDecline = () => router.push('/');

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-white dark:bg-[#0B0E11] p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="disclaimer-title"
    >
      <div className="w-full max-w-lg max-h-full flex flex-col bg-white dark:bg-[#1A1F26] border border-gray-200 dark:border-gray-800 rounded-2xl shadow-xl overflow-hidden">
        <div className="px-5 sm:px-6 pt-5 pb-1 shrink-0">
          <h1 id="disclaimer-title" className="text-base font-bold text-gray-900 dark:text-white">
            Before You Continue
          </h1>
        </div>

        {/* The disclaimer text itself: plain, dense, unremarkable — the
            register a real legal notice reads in, not a marketing card. */}
        <div className="px-5 sm:px-6 py-3 overflow-y-auto text-[13px] leading-relaxed text-gray-500 dark:text-gray-400 space-y-4">
          <section lang="bn" className="space-y-2">
            <p>
              StockSimulatorBD একটি সম্পূর্ণ ফ্রি এডুকেশনাল প্ল্যাটফর্ম, এটি কোনো আসল ব্রোকারেজ হাউজ নয়।
            </p>
            <p>
              &ldquo;আমি সম্মত (I Agree)&rdquo; বাটনে ক্লিক করার মাধ্যমে আপনি নিশ্চিত করছেন যে আপনি নিচের বিষয়গুলো
              বুঝতে পেরেছেন এবং মেনে নিচ্ছেন:
            </p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>
                <strong className="text-gray-600 dark:text-gray-300">কোনো আসল টাকা বা ট্রেডিং নয়:</strong> এখানকার
                সমস্ত ব্যালেন্স এবং লেনদেন সম্পূর্ণ ভার্চুয়াল (নকল) টাকায় হয়, যার বাস্তবে কোনো মূল্য নেই। এই টাকা
                ক্যাশ করা, তোলা বা ট্রান্সফার করা যাবে না এবং ঢাকা স্টক এক্সচেঞ্জে (DSE) বাস্তবে কোনো শেয়ার কেনাবেচা
                হয় না।
              </li>
              <li>
                <strong className="text-gray-600 dark:text-gray-300">কোনো আর্থিক পরামর্শ নয়:</strong> এই
                প্ল্যাটফর্মটি শুধুমাত্র শেখা এবং প্র্যাকটিস করার জন্য। এখানকার কোনো কিছুই আর্থিক বা বিনিয়োগের পরামর্শ
                নয়। এই সিমুলেটরের ফলাফল বাস্তবে আপনার ট্রেডিংয়ে লাভের কোনো নিশ্চয়তা দেয় না।
              </li>
              <li>
                <strong className="text-gray-600 dark:text-gray-300">তথ্যের সীমাবদ্ধতা:</strong> এখানকার মার্কেট
                প্রাইস বা ড্যাটা দেরিতে আসতে পারে বা ভুল হতে পারে। এখানকার তথ্যের ওপর ভিত্তি করে বাস্তবে কোনো আর্থিক
                বা বিনিয়োগের সিদ্ধান্ত নেওয়া যাবে না।
              </li>
              <li>
                <strong className="text-gray-600 dark:text-gray-300">দায়মুক্তি:</strong> আপনি নিজ দায়িত্বে এই
                প্ল্যাটফর্মটি ব্যবহার করছেন। এখানকার অভিজ্ঞতার ওপর ভিত্তি করে আপনি বাস্তবে কোনো আর্থিক সিদ্ধান্ত
                নিলে বা কোনো ক্ষতির সম্মুখীন হলে StockSimulatorBD কোনোভাবেই তার জন্য দায়ী থাকবে না।
              </li>
            </ul>
          </section>

          <hr className="border-gray-100 dark:border-gray-800" />

          <section lang="en" className="space-y-2">
            <p>StockSimulatorBD is a free educational simulator, not a real brokerage.</p>
            <p>By clicking &ldquo;I Agree,&rdquo; you acknowledge and accept that:</p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>
                <strong className="text-gray-600 dark:text-gray-300">No Real Money or Trades:</strong> All balances
                and trades use virtual currency with zero real-world value. It cannot be withdrawn or converted to
                cash, and no orders are actually executed on the Dhaka Stock Exchange.
              </li>
              <li>
                <strong className="text-gray-600 dark:text-gray-300">No Financial Advice:</strong> This platform is
                for practice only. Nothing here constitutes investment advice, and simulation results do not
                guarantee real-world trading success.
              </li>
              <li>
                <strong className="text-gray-600 dark:text-gray-300">Data Limitations:</strong> Market data may be
                delayed or inaccurate and must not be used to make real financial decisions.
              </li>
              <li>
                <strong className="text-gray-600 dark:text-gray-300">No Liability:</strong> The platform is provided
                &ldquo;as is.&rdquo; StockSimulatorBD assumes no responsibility for any real-world financial
                decisions or losses resulting from your use of this tool.
              </li>
            </ul>
          </section>
        </div>

        <div className="px-5 sm:px-6 pb-5 sm:pb-6 pt-3 shrink-0 space-y-2.5">
          {error && (
            <p className="text-xs text-rose-600 dark:text-rose-400 bg-rose-500/10 rounded-lg px-3 py-2">{error}</p>
          )}
          <button
            type="button"
            onClick={handleAgree}
            disabled={submitting}
            className="w-full py-3.5 rounded-xl text-white font-extrabold text-base bg-blue-600 hover:bg-blue-700 disabled:opacity-70 shadow-lg shadow-blue-600/25 active:scale-[0.98] transition-all"
          >
            {submitting ? 'Please wait…' : 'I Agree — Continue'}
          </button>
          <button
            type="button"
            onClick={handleDecline}
            disabled={submitting}
            className="w-full py-2 text-xs font-semibold text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            I Do Not Agree
          </button>
        </div>
      </div>
    </div>
  );
}
