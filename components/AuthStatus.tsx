'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getUserProfile } from '../lib/firebase';
import { useRouter } from 'next/navigation';

export default function AuthStatus() {
    const { user, loading: authLoading } = useAuth();
    const [userName, setUserName] = useState<string | null>(null);
    const [userPhoto, setUserPhoto] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        const fetchUserName = async () => {
            if (user) {
                try {
                    const profile = await getUserProfile(user.uid);
                    setUserName(profile?.name || user.email?.split('@')[0] || 'User');
                    setUserPhoto(profile?.photoURL || user.photoURL || null);
                } catch {
                    setUserName(user.email?.split('@')[0] || 'User');
                    setUserPhoto(user.photoURL || null);
                }
            } else {
                setUserName(null);
                setUserPhoto(null);
            }
            setIsLoading(false);
        };

        if (!authLoading) {
            fetchUserName();
        }
    }, [user, authLoading]);

    const handleAuthAction = () => {
        if (user) {
            router.push('/profile');
        } else {
            router.push('/auth');
        }
    };

    // Helper function to get first name only
    const getFirstName = (fullName: string) => {
        return fullName.split(' ')[0];
    };

    // Show skeleton while loading
    if (authLoading || isLoading) {
        return (
            <div className="flex items-center">
                <div className="px-3 sm:px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-700 rounded-md">
                    <div className="h-4 w-12 sm:w-16 bg-white/30 rounded animate-pulse"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex items-center">
            <button
                onClick={handleAuthAction}
                className="px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-indigo-700 rounded-md hover:shadow-lg transition-all whitespace-nowrap flex items-center gap-2"
            >
                {user && userName ? (
                    <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full overflow-hidden bg-white/20 shrink-0 flex items-center justify-center border border-white/30">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={userPhoto || '/favicon.svg'}
                                alt="User Avatar"
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                    (e.currentTarget as HTMLImageElement).src = '/favicon.svg';
                                }}
                            />
                        </div>
                        <div className="flex items-baseline gap-1 sm:gap-1.5">
                            <span>Hi,</span>
                            {/* ✅ Show first name only on mobile, full name on desktop */}
                            <span className="font-bold">
                                <span className="sm:hidden">{getFirstName(userName)}</span>
                                <span className="hidden sm:inline">{userName}</span>
                            </span>
                        </div>
                    </div>
                ) : (
                    <span>Join</span>
                )}
            </button>
        </div>
    );
}
