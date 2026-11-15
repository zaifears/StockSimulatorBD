import { collection, getCountFromServer } from 'firebase/firestore';
import { db, ensureFirebase } from '@/lib/firebase';

// Cache user count for 5 minutes
let cachedCount: number | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export async function getUserCount(): Promise<number> {
  // Initialises Firebase if this browser had no session when it loaded
  // (see lib/firebase.ts ensureFirebase). Idempotent.
  ensureFirebase();
  const now = Date.now();
  
  // Return cached value if still valid
  if (cachedCount !== null && (now - cacheTimestamp) < CACHE_DURATION) {
    return cachedCount;
  }
  
  try {
    const usersCollection = collection(db, 'users');
    const snapshot = await getCountFromServer(usersCollection);
    const count = snapshot.data().count;
    
    // Update cache
    cachedCount = count;
    cacheTimestamp = now;
    
    return count;
  } catch (error) {
    console.error('Failed to fetch user count:', error);
    // Return cached value if available, otherwise 0
    return cachedCount || 0;
  }
}
