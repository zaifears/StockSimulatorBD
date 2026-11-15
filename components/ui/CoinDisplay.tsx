'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../contexts/AuthContext';
import { loadFirebase, subscribeWhenReady } from '@/lib/firebaseLoader';

interface CoinDisplayProps {
  className?: string;
  showLabel?: boolean;
  onClick?: (() => void) | null;
  size?: 'small' | 'default' | 'large';
}

const CoinDisplay: React.FC<CoinDisplayProps> = ({ className = '', showLabel = true, onClick = null, size = 'default' }) => {
  const { user } = useAuth();
  const router = useRouter();
  const [coins, setCoins] = useState(0);
  const [loading, setLoading] = useState(true);

  // Size variants - smaller text for large numbers
  const sizeClasses = {
    small: {
      container: 'gap-1',
      coin: 'w-4 h-4',
      number: 'text-[10px]',
      label: 'text-[8px]'
    },
    default: {
      container: 'gap-1.5',
      coin: 'w-5 h-5',
      number: 'text-xs',
      label: 'text-[9px]'
    },
    large: {
      container: 'gap-2',
      coin: 'w-7 h-7',
      number: 'text-sm',
      label: 'text-[10px]'
    }
  };

  const currentSize = sizeClasses[size as keyof typeof sizeClasses] || sizeClasses.default;

  // Fast coin redirect handler
  const handleCoinClick = () => {
    if (onClick && typeof onClick === 'function') {
      onClick();
    } else {
      router.push('/coins');
    }
  };

  // Real-time coin updates from simulator state (balance = coins)
  useEffect(() => {
    if (!user?.uid) {
      setCoins(0);
      setLoading(false);
      return;
    }

    setLoading(true);
    
    // Read balance from simulator state (BDT is now Coin)
    const uid = user.uid;
    return subscribeWhenReady(async () => {
    const { db, doc, onSnapshot } = await loadFirebase();
    const appId = process.env.NEXT_PUBLIC_SIMULATOR_APP_ID || 'stocksimulatorbd-dse-v1';
    const stateRef = doc(db, 'artifacts', appId, 'users', uid, 'simulator', 'state');
    return onSnapshot(
      stateRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setCoins(Math.floor(data.balance || 0));
        } else {
          setCoins(0); // No state yet — bonus will create it
        }
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching coins:', error);
        setCoins(0);
        setLoading(false);
      }
    );
    });
  }, [user?.uid]);

  // If not logged in, show only the coin icon with updated tooltip
  if (!user) {
    return (
      <div 
        className={`flex items-center ${currentSize.container} cursor-pointer hover:scale-105 transition-transform duration-200 ${className}`}
        onClick={handleCoinClick}
        title="Join StockSimulatorBD to start trading"
      >
        <div className="relative">
          <Image
            src="/coin/coin.png"
            alt="StockSimulatorBD Coin"
            width={24}
            height={24}
            className={`${currentSize.coin} object-contain`}
            priority
            unoptimized={false}
          />
          {/* Subtle glow effect */}
          <div className="absolute inset-0 bg-amber-400/20 rounded-full opacity-0 hover:opacity-100 transition-opacity duration-300 blur-sm"></div>
        </div>
      </div>
    );
  }

  // If logged in, show coin icon + number in modern design with click functionality
  return (
    <div 
      className={`flex items-center ${currentSize.container} cursor-pointer hover:scale-105 transition-transform duration-200 ${className}`}
      onClick={handleCoinClick}
      title={`You have ${coins.toLocaleString()} Coins - Click to manage`}
    >
      {/* Coin Icon */}
      <div className="relative flex-shrink-0">
        <Image
          src="/coin/coin.png"
          alt="StockSimulatorBD Coin"
          width={24}
          height={24}
          className={`${currentSize.coin} object-contain transition-transform duration-200`}
          priority
          unoptimized={false}
        />
        {/* Subtle glow effect on hover */}
        <div className="absolute inset-0 bg-amber-400/30 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-sm"></div>
      </div>
      
      {/* Coin Count - Compact for large numbers */}
      {showLabel ? (
        <div className="flex flex-col min-w-0">
          <span className={`${currentSize.number} font-bold text-gray-800 dark:text-white transition-colors duration-200 tabular-nums`}>
            {loading ? (
              <div className="w-8 h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
            ) : (
              coins >= 1000000 
                ? `${(coins / 1000000).toFixed(1)}M`
                : coins >= 10000 
                  ? `${(coins / 1000).toFixed(1)}K`
                  : coins.toLocaleString()
            )}
          </span>
          <span className={`${currentSize.label} text-gray-500 dark:text-gray-400 -mt-0.5 font-medium`}>
            Coins
          </span>
        </div>
      ) : (
        <span className={`${currentSize.number} font-bold text-gray-800 dark:text-white min-w-0 transition-colors duration-200 tabular-nums`}>
          {loading ? (
            <div className="w-6 h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
          ) : (
            coins >= 1000000 
              ? `${(coins / 1000000).toFixed(1)}M`
              : coins >= 10000 
                ? `${(coins / 1000).toFixed(1)}K`
                : coins.toLocaleString()
          )}
        </span>
      )}
    </div>
  );
};

export default CoinDisplay;
