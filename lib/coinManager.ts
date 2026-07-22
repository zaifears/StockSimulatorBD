// lib/coinManager.ts - CLIENT-SIDE (Add getCoinStatistics method)

import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase';

export class CoinManager {
  
  // 🪙 GET COIN BALANCE - With Auto-Recovery (Client-side)
  static async getCoinBalance(userId: string): Promise<number> {
    try {
      const userDocRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userDocRef);
      
      if (!userDoc.exists()) {
        console.warn('User document not found, attempting to create:', userId);
        
        // 🔧 AUTO-CREATE missing user document
        await this.createMissingUserDocument(userId);
        
        // Re-fetch after creation
        const newUserDoc = await getDoc(userDocRef);
        if (newUserDoc.exists()) {
          const userData = newUserDoc.data();
          return userData.coins || 0;
        }
        
        console.error('Failed to create user document for:', userId);
        return 0;
      }
      
      const userData = userDoc.data();
      return userData.coins || 0;
    } catch (error) {
      console.error('Error getting coin balance:', error);
      return 0;
    }
  }

  // 🛡️ AUTO-CREATE Missing User Document (Client-side safe)
  static async createMissingUserDocument(userId: string): Promise<void> {
    try {
      const { auth } = await import('./firebase');
      const currentUser = auth.currentUser;
      
      if (currentUser && currentUser.uid === userId) {
        const userDocRef = doc(db, 'users', userId);
        
        // 🔒 IMPORTANT: 'coins' and 'welcomeBonusGranted' are server-only fields
        // (see firestore.rules: users/{userId} write rule blocks these keys for owners).
        // The real coin balance lives in artifacts/{appId}/users/{userId}/simulator/state.balance
        // and welcome bonuses are granted exclusively via /api/auth/grant-social-bonus.
        // This client-side write must NEVER include those keys or Firestore will reject it.
        await setDoc(userDocRef, {
          name: currentUser.displayName || currentUser.email?.split('@')[0] || 'User',
          email: currentUser.email,
          age: null,
          status: 'Other',
          phone: '',
          provider: currentUser.providerData[0]?.providerId || 'email',
          createdAt: new Date().toISOString(),
          autoCreated: true
        }, { merge: true });
        
        console.log(`✅ Auto-created user document for ${userId} (coins/bonus handled server-side)`);
      }
    } catch (error) {
      console.error('Failed to create missing user document:', error);
    }
  }

  // ✅ CHECK IF USER HAS ENOUGH COINS (Client-side safe)
  static async hasEnoughCoins(userId: string, requiredCoins: number = 1): Promise<boolean> {
    try {
      const currentBalance = await this.getCoinBalance(userId);
      return currentBalance >= requiredCoins;
    } catch (error) {
      console.error('Error checking coins:', error);
      return false;
    }
  }

  // 📊 GET TRANSACTION HISTORY (Client-side safe - calls API)
  static async getTransactionHistory(userId: string, limitCount: number = 10): Promise<any[]> {
    try {
      // 🔒 Get Firebase ID token for authentication
      const { auth } = await import('./firebase');
      const currentUser = auth.currentUser;
      
      if (!currentUser) {
        throw new Error('User not authenticated');
      }
      
      const idToken = await currentUser.getIdToken();
      
      const response = await fetch(`/api/coins/transactions?userId=${userId}&limit=${limitCount}`, {
        headers: {
          'Authorization': `Bearer ${idToken}`
        }
      });
      const data = await response.json();
      return data.transactions || [];
    } catch (error) {
      console.error('Error getting transaction history:', error);
      return [];
    }
  }

  // 🆕 GET COIN STATISTICS (Client-side safe - calls API)
  static async getCoinStatistics(userId: string): Promise<{
    currentBalance: number;
    totalEarned: number;
    totalSpent: number;
    transactionCount: number;
    lastActivity: Date | null;
    topFeatures: Array<{ feature: string; count: number; totalAmount: number }>;
  }> {
    try {
      // 🔒 Get Firebase ID token for authentication
      const { auth } = await import('./firebase');
      const currentUser = auth.currentUser;
      
      if (!currentUser) {
        throw new Error('User not authenticated');
      }
      
      const idToken = await currentUser.getIdToken();
      
      const response = await fetch(`/api/coins/statistics?userId=${userId}`, {
        headers: {
          'Authorization': `Bearer ${idToken}`
        }
      });
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to get statistics');
      }

      return {
        currentBalance: data.statistics.currentBalance || 0,
        totalEarned: data.statistics.totalEarned || 0,
        totalSpent: data.statistics.totalSpent || 0,
        transactionCount: data.statistics.transactionCount || 0,
        lastActivity: data.statistics.lastActivity ? new Date(data.statistics.lastActivity) : null,
        topFeatures: data.statistics.topFeatures || []
      };
    } catch (error) {
      console.error('Error getting coin statistics:', error);
      return {
        currentBalance: 0,
        totalEarned: 0,
        totalSpent: 0,
        transactionCount: 0,
        lastActivity: null,
        topFeatures: []
      };
    }
  }
}
