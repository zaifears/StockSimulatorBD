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
  /** True when the account has a password: the button reads "Change Password". */
  hasPassword?: boolean;
  /** Social-only account with an email: the button reads "Set Password". */
  canSetPassword?: boolean;
}

// Shared sizing so the three actions always match: equal grid columns, one
// fixed height, a label that never wraps. Only the colour differs per action.
// Sized so "Change Password" (176px at text-sm/px-3) fits the narrowest
// three-column case: 181px per column at a 640px viewport.
const actionBtn =
  'w-full h-14 group flex items-center justify-center gap-2 px-3 whitespace-nowrap rounded-xl text-sm font-semibold ' +
  'transition-all duration-300 transform hover:scale-105 active:scale-95 motion-reduce:transform-none shadow-md hover:shadow-lg border ' +
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-900';

function ProfileActions({
  isEditing,
  onEdit,
  onLogout,
  onCancel,
  onSave,
  onChangePassword,
  hasPassword = false,
  canSetPassword = false
}: ProfileActionsProps) {
  const showPasswordButton = hasPassword || canSetPassword;
  if (!isEditing) {
    return (
      <div className={`grid grid-cols-1 gap-3 mx-auto ${showPasswordButton ?'sm:grid-cols-3 max-w-2xl' : 'sm:grid-cols-2 max-w-md'}`}>
        <button 
          onClick={onEdit} 
          className={`${actionBtn} bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800 focus-visible:ring-blue-500`}
        >
          <EditIcon />
          <span>Edit Profile</span>
        </button>
        
        {/* Change it, or (Google/GitHub/Facebook-only accounts) set the first one */}
        {showPasswordButton && (
          <button 
            onClick={onChangePassword} 
            className={`${actionBtn} bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100 border-gray-200 dark:border-gray-700 focus-visible:ring-blue-500`}
          >
            <LockIcon />
            <span>{hasPassword ? 'Change Password' : 'Set Password'}</span>
          </button>
        )}
        
        <form className="w-full" onSubmit={(e) => { e.preventDefault(); onLogout(); }}>
          {/* WebMCP Schema Injection */}
          <script type="application/webmcp+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
            tools: [{ name: "logout_user", description: "Log out of the current account." }]
          }) }} />
          <button 
            type="submit"
            className={`${actionBtn} bg-red-50 dark:bg-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/50 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800 focus-visible:ring-red-500`}
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
