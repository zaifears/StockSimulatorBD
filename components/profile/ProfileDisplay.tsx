import React from 'react';
import Link from 'next/link';
import { User } from 'firebase/auth';
import { Crown, Shield } from 'lucide-react';
import { UserProfile } from '../../lib/firebase';

interface ProfileDisplayProps {
  user: User;
  profile: UserProfile | null;
}

function ProfileDisplay({ user, profile }: ProfileDisplayProps) {
  return (
  <div className="animate-fade-in-up">
    <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
      {profile?.name || user.email?.split('@')[0] || 'User'}
    </h2>
    <p className="text-gray-600 dark:text-gray-400 mb-6 break-all">{user.email}</p>
    
    {/* Profile Tags */}
    <div className="flex flex-wrap justify-center items-center gap-3">
      {/* Account Tier Tag */}
      {profile?.accountTier === 'Boss' ? (
        <Link
          href="/boss"
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-amber-500/20 via-yellow-500/20 to-amber-500/20 border border-amber-500/40 text-amber-700 dark:text-amber-300 text-xs font-black uppercase tracking-wider hover:brightness-110 transition-all shadow-sm"
        >
          <Crown className="w-3.5 h-3.5 text-amber-500 fill-current" />
          <span>Boss Tier (Pro)</span>
        </Link>
      ) : (
        <Link
          href="/boss"
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 text-xs font-bold hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-all"
          title="Click to upgrade to Boss"
        >
          <Shield className="w-3.5 h-3.5 text-blue-500" />
          <span>Account Tier: Bro (Free)</span>
          <span className="text-[10px] uppercase tracking-wider font-extrabold px-1.5 py-0.2 rounded bg-amber-500 text-gray-950 ml-1">Upgrade</span>
        </Link>
      )}

      {profile?.age && (
        <span className="bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs font-medium px-3 py-1.5 rounded-full border border-gray-200 dark:border-gray-700">
          {profile.age} years old
        </span>
      )}
      {profile?.status && (
        <span className="bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs font-medium px-3 py-1.5 rounded-full border border-gray-200 dark:border-gray-700">
          {profile.status}
        </span>
      )}
    </div>
  </div>
  );
}

ProfileDisplay.displayName = 'ProfileDisplay';
export default React.memo(ProfileDisplay);
