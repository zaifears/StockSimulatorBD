import React, { useState } from 'react';
import { LockIcon, EyeIcon, EyeOffIcon, CheckIcon, XIcon } from './ProfileIcons';

interface ChangePasswordFormProps {
  onClose: () => void;
  onSubmit: (currentPassword: string, newPassword: string) => Promise<void>;
  isLoading?: boolean;
}

function ChangePasswordForm({ onClose, onSubmit, isLoading = false }: ChangePasswordFormProps) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Password strength validation
  const getPasswordStrength = (password: string) => {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (password.match(/[a-z]/) && password.match(/[A-Z]/)) strength++;
    if (password.match(/[0-9]/)) strength++;
    if (password.match(/[^a-zA-Z0-9]/)) strength++;
    return strength;
  };

  const passwordStrength = getPasswordStrength(newPassword);
  const isPasswordValid = newPassword.length >= 8 && newPassword === confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError('All fields are required');
      return;
    }

    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (currentPassword === newPassword) {
      setError('New password must be different from current password');
      return;
    }

    try {
      await onSubmit(currentPassword, newPassword);
      setSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Failed to change password. Please check your current password.');
    }
  };

  const getStrengthColor = () => {
    if (passwordStrength <= 1) return 'bg-red-500';
    if (passwordStrength === 2) return 'bg-yellow-500';
    if (passwordStrength === 3) return 'bg-blue-500';
    return 'bg-green-500';
  };

  const getStrengthText = () => {
    if (!newPassword) return '';
    if (passwordStrength <= 1) return 'Weak';
    if (passwordStrength === 2) return 'Fair';
    if (passwordStrength === 3) return 'Good';
    return 'Strong';
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-md w-full border border-gray-200 dark:border-gray-800 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <LockIcon />
            <h2 className="text-lg font-bold text-white">Change Password</h2>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-white/20 p-1 rounded transition-colors active:scale-95"
            disabled={isLoading}
          >
            <XIcon />
          </button>
        </div>

        {/* Success Message */}
        {success && (
          <div className="bg-green-50 dark:bg-green-900/20 border-b border-green-200 dark:border-green-800 px-6 py-4 flex items-center gap-3">
            <CheckIcon />
            <span className="text-green-700 dark:text-green-300 font-semibold">
              Password changed successfully!
            </span>
          </div>
        )}

        {/* Form */}
        {!success && (
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {/* WebMCP Schema Injection */}
            <script 
              type="application/webmcp+json"
              dangerouslySetInnerHTML={{ __html: JSON.stringify({
                tools: [
                  {
                    name: "change_password",
                    description: "Change the user's account password.",
                    parameters: {
                      type: "object",
                      properties: {
                        current_password: { type: "string", description: "The user's current password" },
                        new_password: { type: "string", description: "The new password (min 8 characters)" },
                        confirm_password: { type: "string", description: "Confirmation of the new password" }
                      },
                      required: ["current_password", "new_password", "confirm_password"]
                    }
                  }
                ]
              }) }}
            />
            {/* Current Password */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Current Password
              </label>
              <div className="relative">
                <input
                  name="current_password"
                  type={showCurrentPassword ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter your current password"
                  disabled={isLoading}
                  autoComplete="current-password"
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-3.5 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                  disabled={isLoading}
                >
                  {showCurrentPassword ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
            </div>

            {/* New Password */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                New Password
              </label>
              <div className="relative">
                <input
                  name="new_password"
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter a new password (min 8 chars)"
                  disabled={isLoading}
                  autoComplete="new-password"
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-3.5 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                  disabled={isLoading}
                >
                  {showNewPassword ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>

              {/* Password Strength Indicator */}
              {newPassword && (
                <div className="mt-3 space-y-2">
                  <div className="flex gap-1">
                    {[...Array(4)].map((_, i) => (
                      <div
                        key={i}
                        className={`h-1 flex-1 rounded-full transition-colors ${
                          i < passwordStrength ? getStrengthColor() : 'bg-gray-300 dark:bg-gray-600'
                        }`}
                      />
                    ))}
                  </div>
                  <p className={`text-xs font-semibold ${
                    passwordStrength <= 1 ? 'text-red-600 dark:text-red-400' :
                    passwordStrength === 2 ? 'text-yellow-600 dark:text-yellow-400' :
                    passwordStrength === 3 ? 'text-blue-600 dark:text-blue-400' :
                    'text-green-600 dark:text-green-400'
                  }`}>
                    Strength: {getStrengthText()}
                  </p>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Confirm Password
              </label>
              <div className="relative">
                <input
                  name="confirm_password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm your new password"
                  disabled={isLoading}
                  autoComplete="new-password"
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-3.5 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                  disabled={isLoading}
                >
                  {showConfirmPassword ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
              {confirmPassword && newPassword !== confirmPassword && (
                <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                  Passwords do not match
                </p>
              )}
              {confirmPassword && newPassword === confirmPassword && (
                <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                  Passwords match ✓
                </p>
              )}
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-4 py-3">
                <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
              </div>
            )}

            {/* Buttons */}
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                disabled={isLoading}
                className="flex-1 px-4 py-3 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-semibold rounded-lg transition-all active:scale-95 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!isPasswordValid || isLoading}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold rounded-lg transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <span className="animate-spin">⏳</span> Updating...
                  </>
                ) : (
                  <>
                    <LockIcon /> Change Password
                  </>
                )}
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
