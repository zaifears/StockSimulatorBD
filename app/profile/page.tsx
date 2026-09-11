'use client';

// app/profile/page.tsx
// Profile screen — app-shell version. Same underlying hooks/useProfile.tsx
// logic (edit form, password change, logout) as before; only the outer
// chrome changed from a full marketing-page hero (grid background, glows,
// ProfileHeader spacer) to compact cards consistent with the rest of the
// authenticated app.
import React, { useState } from 'react';
import { useProfile } from '../../hooks/useProfile';
import LoadingSpinner from '@/components/LoadingSpinner';
import ProfileDisplay from '../../components/profile/ProfileDisplay';
import ProfileEditForm from '../../components/profile/ProfileEditForm';
import ProfileActions from '../../components/profile/ProfileActions';
import ChangePasswordForm from '../../components/profile/ChangePasswordForm';
import AppShell from '@/components/app/AppShell';
import { useSharedSimulator } from '@/contexts/SimulatorContext';
import { Wallet, ChevronRight, Crown, Shield } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import BossBadge from '@/components/ui/BossBadge';

export default function ProfilePage() {
  return (
    <AppShell redirectPath="/profile" redirectMessage="Please sign in to view your profile">
      <ProfileScreen />
    </AppShell>
  );
}

function ProfileScreen() {
  const {
    user, profile, loading, isEditing, formData,
    handleLogout, handleSave, handleInputChange, handleEdit, handleCancel,
    handleChangePassword, hasPassword,
  } = useProfile();
  const { simulatorState } = useSharedSimulator();
  const { isBoss } = useAuth();

  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  if (loading) return <LoadingSpinner />;
  if (!user) return null;

  return (
    <div className="max-w-2xl mx-auto px-4 pt-4 pb-6">
      <h1 className="text-lg font-extrabold text-gray-900 dark:text-white mb-4">Profile</h1>

      <div className="bg-white dark:bg-[#1A1F26] border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden">
        {/* Balance widget */}
        <Link
          href="/coins"
          className="flex items-center justify-between gap-4 p-4 bg-amber-50/50 dark:bg-amber-500/5 border-b border-gray-100 dark:border-gray-800 hover:bg-amber-50 dark:hover:bg-amber-500/10 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 shrink-0 bg-amber-100 dark:bg-amber-500/20 rounded-xl flex items-center justify-center border border-amber-200 dark:border-amber-500/30">
              <Wallet className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <div className="text-sm font-bold text-gray-900 dark:text-white">
                {Math.floor(simulatorState.balance).toLocaleString()} Coins
              </div>
              <p className="text-[11px] text-gray-500 dark:text-gray-400">Your simulator balance</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />
        </Link>

        {/* Tier status widget */}
        <Link
          href={isBoss ? "/profile/tier" : "/boss"}
          className="flex items-center justify-between gap-4 p-4 border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 shrink-0 rounded-xl flex items-center justify-center border ${
              isBoss
                ? 'bg-amber-100 dark:bg-amber-500/20 border-amber-300 dark:border-amber-500/40 text-amber-600 dark:text-amber-400'
                : 'bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/30 text-blue-600 dark:text-blue-400'
            }`}>
              {isBoss ? <Crown className="w-5 h-5 fill-current" /> : <Shield className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-gray-900 dark:text-white">
                  {isBoss ? 'Boss Tier (Pro)' : 'Bro Tier (Free)'}
                </span>
                {isBoss ? (
                  <BossBadge size="xs" interactive={false} />
                ) : (
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                    Upgrade Available
                  </span>
                )}
              </div>
              <p className="text-[11px] text-gray-500 dark:text-gray-400">
                {isBoss ? 'View active perks & subscription details' : 'Unlock Risk Radar, +10% bonus coins & lifetime history'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {!isBoss && (
              <span className="text-xs font-bold text-gray-950 bg-gradient-to-r from-amber-400 to-yellow-500 px-2.5 py-1 rounded-lg shadow-sm">
                Upgrade
              </span>
            )}
            <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />
          </div>
        </Link>

        {/* Avatar */}
        <div className="p-6 text-center border-b border-gray-100 dark:border-gray-800">
          <div className="relative inline-block">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 rounded-full p-1.5 border border-blue-100 dark:border-blue-800/50">
              <div className="w-full h-full bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                </svg>
              </div>
            </div>
            <div className="absolute bottom-0 right-0 w-5 h-5 bg-emerald-500 rounded-full border-[3px] border-white dark:border-[#1A1F26]" />
          </div>
        </div>

        {/* Details / edit form */}
        <div className="p-5 flex flex-col items-center text-center">
          {!isEditing ? (
            <ProfileDisplay user={user} profile={profile} />
          ) : (
            <ProfileEditForm formData={formData} onInputChange={handleInputChange} />
          )}
        </div>

        {/* Actions */}
        <div className="bg-gray-50 dark:bg-[#111418] p-5 border-t border-gray-100 dark:border-gray-800">
          <ProfileActions
            isEditing={isEditing}
            onEdit={handleEdit}
            onLogout={handleLogout}
            onCancel={handleCancel}
            onSave={handleSave}
            onChangePassword={() => setShowChangePasswordModal(true)}
            hasPassword={hasPassword}
          />
        </div>
      </div>

      {showChangePasswordModal && (
        <ChangePasswordForm
          onClose={() => setShowChangePasswordModal(false)}
          onSubmit={async (currentPassword, newPassword) => {
            setIsChangingPassword(true);
            try {
              await handleChangePassword(currentPassword, newPassword);
            } finally {
              setIsChangingPassword(false);
            }
          }}
          isLoading={isChangingPassword}
        />
      )}
    </div>
  );
}
