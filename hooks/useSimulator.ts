'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  getFirestore,
  doc,
  collection,
  onSnapshot,
  runTransaction,
  setDoc,
  getDoc,
  Unsubscribe
} from 'firebase/firestore';
import { useAuth } from '@/contexts/AuthContext';
import { getUpcomingHolidays } from '@/lib/bangladeshHolidays';
import { getFreshToken } from '@/lib/firebase';

// =====================================================
// PRECISION MONEY MATH UTILITIES
// Converts to paisa (integer) to avoid floating-point errors
// =====================================================
const toPaisa = (amount: number): number => Math.round(amount * 100);
const fromPaisa = (paisa: number): number => paisa / 100;

const moneyMultiply = (price: number, quantity: number): number => {
  return fromPaisa(toPaisa(price) * quantity);
};

const moneyAdd = (a: number, b: number): number => {
  return fromPaisa(toPaisa(a) + toPaisa(b));
};

const moneySubtract = (a: number, b: number): number => {
  return fromPaisa(toPaisa(a) - toPaisa(b));
};

const roundMoney = (amount: number): number => {
  return Math.round(amount * 100) / 100;
};

export interface Stock {
  symbol: string;
  ltp: number;
  change: number;
  changePercent: number;
  category?: string;
}

export interface PortfolioItem {
  symbol: string;
  quantity: number;
  averageBuyPrice: number;
  totalCost: number;
  purchaseDate: string;
}

export interface SimulatorState {
  balance: number;
  portfolio: PortfolioItem[];
  totalInvested: number;
  totalCurrentValue: number;
  totalGainLoss: number;
  gainLossPercent: number;
  realizedGainLoss: number;
}

export interface MarketInfo {
  stocks: Stock[];
  lastUpdated: string;
  totalStocks: number;
}

export const useSimulator = () => {
  const { user } = useAuth();
  const db = getFirestore();
  
  const [marketInfo, setMarketInfo] = useState<MarketInfo | null>(null);
  const [simulatorState, setSimulatorState] = useState<SimulatorState>({
    balance: 10000,
    portfolio: [],
    totalInvested: 0,
    totalCurrentValue: 0,
    totalGainLoss: 0,
    gainLossPercent: 0,
    realizedGainLoss: 0
  });
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [transactionStatus, setTransactionStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [transactionMessage, setTransactionMessage] = useState('');
  const [bangladeshHolidays, setBangladeshHolidays] = useState<string[]>([]);
  
  const marketUnsubscribe = useRef<Unsubscribe | null>(null);
  const categoriesUnsubscribe = useRef<Unsubscribe | null>(null);
  const stateUnsubscribe = useRef<Unsubscribe | null>(null);
  const [categoryMap, setCategoryMap] = useState<Record<string, string>>({});

  const COMMISSION_RATE = 0.004; // 0.4% DSE Commission

  // ── 1. Load Bangladesh Holidays ──
  useEffect(() => {
    const loadHolidays = async () => {
      try {
        const holidays = await getUpcomingHolidays();
        setBangladeshHolidays(holidays);
      } catch (err) {
        console.warn('Failed to load holidays:', err);
        setBangladeshHolidays([]);
      }
    };
    loadHolidays();
  }, []);

  // ── 2. Polling Market Data ──
  useEffect(() => {
    if (!user) { setLoading(false); return; }
    let isMounted = true;
    let intervalId: NodeJS.Timeout;

    const fetchMarketData = async () => {
      // Efficiency Upgrade: Do not waste Firebase reads if the user is on another tab
      if (document.hidden) return;

      try {
        const appId = process.env.NEXT_PUBLIC_SIMULATOR_APP_ID || 'stocksimulatorbd-dse-v1';
        const marketRef = doc(db, 'artifacts', appId, 'public', 'data', 'market_info', 'latest');
        const snapshot = await getDoc(marketRef);

        if (snapshot.exists() && isMounted) {
          const data = snapshot.data() as MarketInfo;
          const mergedStocks = data.stocks.map(stock => {
            const calculatedChangePercent = stock.changePercent !== undefined 
              ? stock.changePercent 
              : (stock.ltp - stock.change > 0 ? (stock.change / (stock.ltp - stock.change)) * 100 : 0);
              
            return {
              ...stock,
              changePercent: calculatedChangePercent,
              category: categoryMap[stock.symbol] || stock.category
            };
          });
          setMarketInfo({ ...data, stocks: mergedStocks });
        } else if (isMounted) {
          setMarketInfo({ stocks: [], lastUpdated: new Date().toISOString(), totalStocks: 0 });
        }
      } catch (err) {
        if (isMounted) setError('Failed to load market data');
      }
    };

    fetchMarketData();
    intervalId = setInterval(fetchMarketData, 180000); 

    // Fetch immediately when the user comes back to the tab
    const handleVisibilityChange = () => {
      if (!document.hidden) fetchMarketData();
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => { 
      isMounted = false; 
      clearInterval(intervalId); 
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user, db, categoryMap]);

  // ── 3. Categories Listener ──
  useEffect(() => {
    if (!user) return;
    try {
      const appId = process.env.NEXT_PUBLIC_SIMULATOR_APP_ID || 'stocksimulatorbd-dse-v1';
      const categoriesRef = doc(db, 'artifacts', appId, 'public', 'data', 'market_info', 'categories');
      categoriesUnsubscribe.current = onSnapshot(categoriesRef, (snapshot) => {
        if (snapshot.exists()) setCategoryMap(snapshot.data().categories || {});
      });
    } catch (err) { console.warn('Categories listener error:', err); }

    return () => { if (categoriesUnsubscribe.current) categoriesUnsubscribe.current(); };
  }, [user, db]);

  // ── 4. Simulator State Listener ──
  useEffect(() => {
    if (!user) { setLoading(false); return; }
    try {
      const appId = process.env.NEXT_PUBLIC_SIMULATOR_APP_ID || 'stocksimulatorbd-dse-v1';
      const stateRef = doc(db, 'artifacts', appId, 'users', user.uid, 'simulator', 'state');
      
      stateUnsubscribe.current = onSnapshot(stateRef, async (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data() as Omit<SimulatorState, 'totalCurrentValue' | 'totalGainLoss' | 'gainLossPercent'>;
          setSimulatorState(prev => ({
            ...data,
            portfolio: data.portfolio || [],
            realizedGainLoss: data.realizedGainLoss || 0,
            totalCurrentValue: calculatePortfolioValue(data.portfolio || [], marketInfo?.stocks || []),
            totalGainLoss: calculateGainLoss(data.portfolio || [], marketInfo?.stocks || []),
            gainLossPercent: calculateGainLossPercent(data.portfolio || [], marketInfo?.stocks || [])
          }));
        } else {
          // Initialize shell for new users
          const initialState = { balance: 0, portfolio: [], totalInvested: 0, realizedGainLoss: 0 };
          await setDoc(stateRef, initialState, { merge: true });
        }
        setLoading(false);
      });
    } catch (err) {
      setError('Failed to initialize state listener');
      setLoading(false);
    }

    return () => { if (stateUnsubscribe.current) stateUnsubscribe.current(); };
  }, [user, db, marketInfo]);

  // ── 5. Math Calculations ──
  const calculatePortfolioValue = (portfolio: PortfolioItem[], stocks: Stock[]): number => {
    const total = portfolio.reduce((sum, item) => {
      const stock = stocks.find(s => s.symbol === item.symbol);
      if (!stock || !stock.ltp || stock.ltp <= 0 || stock.ltp > 100000) return sum;
      return moneyAdd(sum, moneyMultiply(stock.ltp, item.quantity));
    }, 0);
    return roundMoney(total);
  };

  const calculateGainLoss = (portfolio: PortfolioItem[], stocks: Stock[]): number => {
    const currentValue = calculatePortfolioValue(portfolio, stocks);
    const invested = portfolio.reduce((total, item) => moneyAdd(total, item.totalCost), 0);
    return roundMoney(moneySubtract(currentValue, invested));
  };

  const calculateGainLossPercent = (portfolio: PortfolioItem[], stocks: Stock[]): number => {
    const invested = portfolio.reduce((total, item) => moneyAdd(total, item.totalCost), 0);
    if (invested === 0) return 0;
    return roundMoney((calculateGainLoss(portfolio, stocks) / invested) * 100);
  };

  const isMarketOpen = useCallback(() => {
    const now = new Date();
    const bdTime = new Date(now.getTime() + (6 * 60 * 60 * 1000)); // UTC+6
    const hour = bdTime.getUTCHours();
    const minute = bdTime.getUTCMinutes();
    const dayOfWeek = bdTime.getUTCDay();
    
    const dateStr = `${bdTime.getUTCFullYear()}-${String(bdTime.getUTCMonth() + 1).padStart(2, '0')}-${String(bdTime.getUTCDate()).padStart(2, '0')}`;

    if (dayOfWeek === 5 || dayOfWeek === 6 || bangladeshHolidays.includes(dateStr)) return false;
    return (hour >= 10 && (hour < 14 || (hour === 14 && minute <= 15)));
  }, [bangladeshHolidays]);

  // ── 6. UNIFIED TRADE EXECUTION ENGINE ──
  const executeTrade = useCallback(async (symbol: string, type: 'BUY' | 'SELL', quantity: number) => {
    if (!user || !marketInfo) {
      setTransactionStatus('error');
      setTransactionMessage('User not authenticated or market data not loaded');
      throw new Error('Not authenticated');
    }

    if (!isMarketOpen()) {
      setTransactionStatus('error');
      setTransactionMessage('Market is closed. Orders are only allowed during market hours (10:00 AM - 2:15 PM).');
      throw new Error('Market Closed');
    }

    if (!Number.isInteger(quantity) || quantity <= 0) {
      setTransactionStatus('error');
      setTransactionMessage('Quantity must be a positive integer');
      throw new Error('Invalid Quantity');
    }

    const stock = marketInfo.stocks.find(s => s.symbol === symbol);
    if (!stock || stock.ltp <= 0) {
      setTransactionStatus('error');
      setTransactionMessage('Stock not found or invalid price');
      throw new Error('Invalid Stock');
    }

    // Security check
    const freshToken = await getFreshToken(true);
    if (!freshToken) {
      setTransactionStatus('error');
      setTransactionMessage('Authentication expired. Please refresh.');
      throw new Error('Auth Expired');
    }

    setTransactionStatus('processing');
    setTransactionMessage(`Processing ${type} order for ${quantity} shares...`);

    try {
      const appId = process.env.NEXT_PUBLIC_SIMULATOR_APP_ID || 'stocksimulatorbd-dse-v1';
      const stateRef = doc(db, 'artifacts', appId, 'users', user.uid, 'simulator', 'state');
      const historyColRef = collection(db, 'artifacts', appId, 'users', user.uid, 'simulator', 'trade_history');

      await runTransaction(db, async (transaction) => {
        const stateDoc = await transaction.get(stateRef);
        if (!stateDoc.exists()) throw new Error('Simulator state not found');

        const currentState = stateDoc.data() as SimulatorState;
        const portfolio = [...(currentState.portfolio || [])];
        const itemIndex = portfolio.findIndex(item => item.symbol === symbol);
        const existingItem = itemIndex >= 0 ? portfolio[itemIndex] : null;

        const grossValue = moneyMultiply(stock.ltp, quantity);
        const commission = roundMoney(grossValue * COMMISSION_RATE);

        if (type === 'BUY') {
          const totalCost = moneyAdd(grossValue, commission);
          
          if (currentState.balance < totalCost) {
            throw new Error(`Insufficient balance. Required: ৳${totalCost.toFixed(2)}`);
          }

          if (existingItem) {
            const newTotalCost = moneyAdd(existingItem.totalCost, totalCost);
            const newQuantity = existingItem.quantity + quantity;
            portfolio[itemIndex] = {
              ...existingItem,
              quantity: newQuantity,
              averageBuyPrice: roundMoney(newTotalCost / newQuantity),
              totalCost: newTotalCost
            };
          } else {
            portfolio.push({
              symbol,
              quantity,
              averageBuyPrice: roundMoney(totalCost / quantity),
              totalCost: totalCost,
              purchaseDate: new Date().toISOString()
            });
          }

          transaction.set(stateRef, {
            ...currentState,
            balance: moneySubtract(currentState.balance, totalCost),
            portfolio,
            totalInvested: moneyAdd(currentState.totalInvested || 0, totalCost)
          });

        } else if (type === 'SELL') {
          if (!existingItem || existingItem.quantity < quantity) {
            throw new Error(`Insufficient shares. You own ${existingItem?.quantity || 0}.`);
          }

          // T+1 Rule
          const bdOptions = { timeZone: 'Asia/Dhaka' };
          const purchaseDateStr = new Date(existingItem.purchaseDate).toLocaleDateString('en-CA', bdOptions);
          const todayDateStr = new Date().toLocaleDateString('en-CA', bdOptions);
          
          if (purchaseDateStr === todayDateStr) {
            throw new Error('T+1 Rule: Cannot sell shares on the same day of purchase.');
          }

          const netProceeds = moneySubtract(grossValue, commission);
          
          // Cost Basis of shares being sold
          const averageCost = existingItem.averageBuyPrice;
          const costOfSoldShares = moneyMultiply(averageCost, quantity);
          const realizedGain = moneySubtract(netProceeds, costOfSoldShares);

          if (existingItem.quantity === quantity) {
            portfolio.splice(itemIndex, 1);
          } else {
            portfolio[itemIndex] = {
              ...existingItem,
              quantity: existingItem.quantity - quantity,
              totalCost: moneySubtract(existingItem.totalCost, costOfSoldShares)
            };
          }

          transaction.set(stateRef, {
            ...currentState,
            balance: moneyAdd(currentState.balance, netProceeds),
            portfolio,
            totalInvested: moneySubtract(currentState.totalInvested || 0, costOfSoldShares),
            realizedGainLoss: moneyAdd(currentState.realizedGainLoss || 0, realizedGain)
          });
        }

        // Write to Trade History
        const newHistoryRef = doc(historyColRef);
        transaction.set(newHistoryRef, {
          symbol,
          type,
          quantity,
          price: stock.ltp,
          commission,
          totalAmount: type === 'BUY' ? -(moneyAdd(grossValue, commission)) : moneySubtract(grossValue, commission),
          timestamp: new Date().toISOString()
        });
      });

      setTransactionStatus('success');
      setTransactionMessage(`Successfully ${type === 'BUY' ? 'bought' : 'sold'} ${quantity} shares of ${symbol}.`);

    } catch (err: any) {
      console.error(`[Trade Engine] ${type} error:`, err);
      setTransactionStatus('error');
      setTransactionMessage(err.message || `Failed to execute ${type} order.`);
    }
  }, [user, marketInfo, db, isMarketOpen]);

  const resetTransaction = useCallback(() => {
    setTransactionStatus('idle');
    setTransactionMessage('');
  }, []);

  return {
    marketInfo,
    simulatorState,
    loading,
    error,
    transactionStatus,
    transactionMessage,
    executeTrade,
    isMarketOpen,
    resetTransaction
  };
};