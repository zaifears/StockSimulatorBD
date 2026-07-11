'use client';

import React, { useState } from 'react';
import { useProfile } from '../../hooks/useProfile';
import ProfileLoadingScreen from '../../components/profile/ProfileLoadingScreen';
import ProfileHeader from '../../components/profile/ProfileHeader';
import ProfileDisplay from '../../components/profile/ProfileDisplay';
import ProfileEditForm from '../../components/profile/ProfileEditForm';
import ProfileActions from '../../components/profile/ProfileActions';
import ChangePasswordForm from '../../components/profile/ChangePasswordForm';
import CoinDisplay from '@/components/ui/CoinDisplay';
import { Wallet, ChevronRight } from 'lucide-react';

export default function ProfilePage() {
  const { 
    user, 
    profile, 
    loading, 
    isEditing, 
    formData, 
    handleLogout, 
    handleSave, 
    handleInputChange, 
    handleEdit, 
    handleCancel,
    handleChangePassword,
    hasPassword  // ✅ Check if user has password
  } = useProfile();

  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  if (loading) return <ProfileLoadingScreen />;
  if (!user) return null;

  return (
    <main className="min-h-screen flex flex-col w-full bg-white dark:bg-[#090E17] transition-colors duration-300 pb-safe overflow-x-hidden text-gray-800 dark:text-gray-200">
      
      {/* ✅ MODERN GRID BACKGROUND & GLOWS */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] dark:bg-[linear-gradient(to_right,#3b82f615_1px,transparent_1px),linear-gradient(to_bottom,#3b82f615_1px,transparent_1px)] pointer-events-none z-0"></div>
      
      <div className="absolute inset-0 pointer-events-none z-0" aria-hidden="true">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-lg h-[300px] bg-blue-500/10 dark:bg-blue-600/15 blur-[100px] rounded-full"></div>
        <div className="absolute top-40 right-10 w-64 h-64 bg-purple-500/10 dark:bg-purple-600/10 rounded-full blur-[100px]"></div>
      </div>

      <div className="relative z-10 flex-1">
        {/* Header Meta */}
        <ProfileHeader />

        {/* Main Content - Mobile Optimized */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16 md:pt-32 md:pb-24 animate-fade-in-up">
          
          <div className="text-center mb-8">
            <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight">
              Your <span className="text-blue-600 dark:text-blue-400">Profile</span>
            </h1>
          </div>

          <div className="bg-white/80 dark:bg-[#1A1F26]/90 backdrop-blur-xl rounded-[2rem] shadow-xl border border-gray-100 dark:border-gray-800 overflow-hidden">
            
            {/* ✅ PREMIUM COIN WIDGET SECTION */}
            <div className="bg-amber-50/50 dark:bg-amber-500/5 p-5 sm:p-8 border-b border-gray-100 dark:border-gray-800">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
                
                {/* Left side - Title */}
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-amber-100 dark:bg-amber-500/20 rounded-xl flex items-center justify-center border border-amber-200 dark:border-amber-500/30 flex-shrink-0">
                    <Wallet className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white mb-0.5">
                      StockSimBD Coins
                    </h3>
                    <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                      Your simulator balance
                    </p>
                  </div>
                </div>
                
                {/* Right side - Coin display and button */}
                <div className="flex items-center justify-between sm:justify-end gap-4 sm:gap-6 bg-white dark:bg-[#111418] p-3 sm:p-2 sm:pr-2 sm:pl-4 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
                  <div className="flex items-center shrink-0">
                    <CoinDisplay 
                      className="flex" 
                      size="default"
                      showLabel={false}
                    />
                  </div>
                  
                  <button
                    onClick={() => window.location.href = '/coins'}
                    className="flex items-center gap-1 px-4 py-2 sm:py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold transition-all duration-200 shadow-md shadow-blue-500/20 text-xs sm:text-sm whitespace-nowrap active:scale-95"
                  >
                    Manage <ChevronRight className="w-4 h-4 hidden sm:block" />
                  </button>
                </div>

              </div>
            </div>
            
            {/* ✅ PROFILE AVATAR SECTION */}
            <div className="p-8 sm:p-12 text-center border-b border-gray-100 dark:border-gray-800 relative overflow-hidden">
              
              <div className="relative inline-block mb-2">
                <div className="w-24 h-24 sm:w-28 sm:h-28 lg:w-32 lg:h-32 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 rounded-full p-2 shadow-inner border border-blue-100 dark:border-blue-800/50">
                  <div className="w-full h-full bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center shadow-lg">
                    <svg className="w-10 h-10 sm:w-12 sm:h-12 lg:w-14 lg:h-14 text-white" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                    </svg>
                  </div>
                </div>
                {/* Online Status Dot */}
                <div className="absolute bottom-1 right-1 sm:bottom-2 sm:right-2 w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 bg-emerald-500 rounded-full border-4 border-white dark:border-[#1A1F26] flex items-center justify-center shadow-sm"></div>
              </div>

            </div>

            {/* ✅ UPDATED: Enforce centering for all inner components */}
            <div className="p-6 sm:p-8 lg:p-10 max-w-2xl mx-auto flex flex-col items-center justify-center text-center">
              
              {!isEditing ? (
                <ProfileDisplay user={user} profile={profile} />
              ) : (
                <ProfileEditForm 
                  formData={formData} 
                  onInputChange={handleInputChange} 
                />
              )}
              
            </div>

            {/* ✅ ACTION BUTTONS (Footer of Card) */}
            <div className="bg-gray-50 dark:bg-[#111418] p-6 sm:p-8 border-t border-gray-100 dark:border-gray-800">
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
        </div>
      </div>

      {/* Change Password Modal */}
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

      <style jsx>{`
        @keyframes fade-in-up {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in-up {
          animation: fade-in-up 0.6s ease-out forwards;
        }
      `}</style>
    </main>
  );
}