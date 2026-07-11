import React from 'react';
import { UserProfile } from '../../lib/firebase';
import { EditIcon, LogoutIcon, LockIcon } from './ProfileIcons';

interface ProfileActionsProps {
  isEditing: boolean;
  onEdit: () => void;
  onLogout: () => void;
  onCancel: () => void;
  onSave: () => void;
  onChangePassword: () => void;
  hasPassword?: boolean;  // ✅ NEW: Show password button only if user has password
}

function ProfileActions({
  isEditing,
  onEdit,
  onLogout,
  onCancel,
  onSave,
  onChangePassword,
  hasPassword = false
}: ProfileActionsProps) {
  if (!isEditing) {
    return (
      <div className={`flex flex-col ${hasPassword ? 'sm:flex-row' : 'sm:flex-row'} gap-4 ${hasPassword ? 'max-w-2xl' : 'max-w-md'} mx-auto`}>
        <button 
          onClick={onEdit} 
          className="group flex items-center justify-center gap-3 flex-1 px-6 py-4 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded-xl font-semibold transition-all duration-300 transform hover:scale-105 shadow-md hover:shadow-lg border border-blue-200 dark:border-blue-800"
        >
          <EditIcon />
          <span>Edit Profile</span>
        </button>
        
        {/* ✅ Only show Change Password button if user has password */}
        {hasPassword && (
          <button 
            onClick={onChangePassword} 
            className="group flex items-center justify-center gap-3 flex-1 px-6 py-4 bg-purple-50 dark:bg-purple-900/30 hover:bg-purple-100 dark:hover:bg-purple-900/50 text-purple-700 dark:text-purple-300 rounded-xl font-semibold transition-all duration-300 transform hover:scale-105 shadow-md hover:shadow-lg border border-purple-200 dark:border-purple-800"
          >
            <LockIcon />
            <span>Change Password</span>
          </button>
        )}
        
        <form onSubmit={(e) => { e.preventDefault(); onLogout(); }}>
          {/* WebMCP Schema Injection */}
          <script type="application/webmcp+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
            tools: [{ name: "logout_user", description: "Log out of the current account." }]
          }) }} />
          <button 
            type="submit"
            className="w-full group flex items-center justify-center gap-3 px-6 py-4 bg-red-50 dark:bg-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/50 text-red-700 dark:text-red-300 rounded-xl font-semibold transition-all duration-300 transform hover:scale-105 shadow-md hover:shadow-lg border border-red-200 dark:border-red-800"
          >
            <LogoutIcon />
            <span>Logout</span>
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
      <button 
        onClick={onCancel} 
        className="px-6 py-4 bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-600/50 text-gray-700 dark:text-gray-300 rounded-xl font-semibold transition-all duration-300 border border-gray-200 dark:border-gray-600"
      >
        Cancel
      </button>
      
      <button 
        onClick={onSave} 
        className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold py-4 px-6 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
      >
        Save Changes
      </button>
    </div>
  );
}

ProfileActions.displayName = 'ProfileActions';
export default React.memo(ProfileActions);
