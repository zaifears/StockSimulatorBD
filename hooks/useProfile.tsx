import { useState, useEffect, useCallback } from 'react';
import { User, onAuthStateChanged, signOut, updateProfile as updateAuthProfile } from 'firebase/auth';
import { auth, getUserProfile, updateUserProfile, changePassword, UserProfile } from '../lib/firebase';
import { useRouter } from 'next/navigation';
import { useAuth } from '../contexts/AuthContext';

export const useProfile = () => {
  const { user: authUser, loading: authLoading } = useAuth();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<UserProfile>({});
  const [hasPassword, setHasPassword] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // ✅ FIXED: Removed early return that was blocking auth check
    
    // If still loading auth, don't do anything yet
    if (authLoading) {
      return;
    }
    
    // If auth loaded but no user, redirect to login
    if (!authUser) {
      router.push('/auth');
      return;
    }

    // User exists, set up listener
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        
        // ✅ Check if user has password auth (email/password signup)
        // Social auth users won't have 'password' in providerData
        const hasPasswordProvider = currentUser.providerData.some(
          provider => provider.providerId === 'password'
        );
        setHasPassword(hasPasswordProvider);
        
        const userProfile = await getUserProfile(currentUser.uid);
        setProfile(userProfile);
        setFormData(userProfile || {});
        if (!userProfile?.name) {
          setIsEditing(true);
        }
      } else {
        router.push('/auth');
      }
      setLoading(false);
    });
    
    return () => unsubscribe(); // Cleanup function
  }, [router, authUser, authLoading]);

  const handleLogout = useCallback(async () => {
    await signOut(auth);
    router.push('/');
  }, [router]);

  const handleSave = useCallback(async () => {
    if (!user || !formData.name) return;
    await updateUserProfile(user.uid, formData);
    setProfile(formData);
    setIsEditing(false);
  }, [user, formData]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  }, []);

  const handleEdit = useCallback(() => {
    setIsEditing(true);
  }, []);

  const handleCancel = useCallback(() => {
    setIsEditing(false);
    setFormData(profile || {});
  }, [profile]);

  const handleChangePassword = useCallback(async (currentPassword: string, newPassword: string) => {
    await changePassword(currentPassword, newPassword);
  }, []);

  const handleUpdateAvatar = useCallback(async (photoURL: string | null) => {
    if (!user) return;
    // 1. Update Firestore user document
    await updateUserProfile(user.uid, { photoURL: photoURL || null });
    
    // 2. Update Firebase Auth user profile
    try {
      if (auth.currentUser) {
        await updateAuthProfile(auth.currentUser, { photoURL: photoURL || '' });
      }
    } catch (authErr) {
      console.warn('⚠️ Could not sync photoURL to Firebase Auth user:', authErr);
    }

    // 3. Update local states
    setProfile(prev => prev ? { ...prev, photoURL: photoURL || null } : null);
    setFormData(prev => ({ ...prev, photoURL: photoURL || null }));
  }, [user]);

  const handleRemoveAvatar = useCallback(async () => {
    await handleUpdateAvatar(null);
  }, [handleUpdateAvatar]);

  return {
    user,
    profile,
    loading: loading || authLoading,
    isEditing,
    formData,
    handleLogout,
    handleSave,
    handleInputChange,
    handleEdit,
    handleCancel,
    handleChangePassword,
    hasPassword,  // ✅ NEW: Indicates if user can change password
    handleUpdateAvatar,
    handleRemoveAvatar,
  };
};
