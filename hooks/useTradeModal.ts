import { useState, useEffect, useTransition, useCallback } from 'react';

export function useTradeModal(executeTrade: (symbol: string, type: 'BUY' | 'SELL', qty: number) => Promise<void>) {
  const [showTradeModal, setShowTradeModal] = useState(false);
  const [selectedStock, setSelectedStock] = useState<string | null>(null);
  const [tradeType, setTradeType] = useState<'buy' | 'sell'>('buy');
  const [tradeQuantity, setTradeQuantity] = useState<number | ''>(1);
  const [tradeQuantityInput, setTradeQuantityInput] = useState('1');
  const [isPending, startTransition] = useTransition();

  // Scroll Lock Effect
  useEffect(() => {
    if (showTradeModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [showTradeModal]);

  // Debounce search updates
  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      if (tradeQuantityInput === '') {
        startTransition(() => setTradeQuantity(''));
        return;
      }
      const parsed = parseInt(tradeQuantityInput, 10);
      startTransition(() => {
        if (!isNaN(parsed) && parsed >= 0) {
          setTradeQuantity(parsed || '');
        }
      });
    }, 120);
    return () => window.clearTimeout(timeoutId);
  }, [tradeQuantityInput]);

  const openTradeModal = useCallback((symbol: string, type: 'buy' | 'sell', resetTransaction: () => void) => {
    setSelectedStock(symbol);
    setTradeType(type);
    setTradeQuantity(1);
    setTradeQuantityInput('1');
    resetTransaction();
    setShowTradeModal(true);
  }, []);

  const closeTradeModal = useCallback(() => {
    setShowTradeModal(false);
  }, []);

  const handleExecuteModalTrade = useCallback(async () => {
    if (!selectedStock || tradeQuantity === '' || tradeQuantity <= 0) return;
    await executeTrade(selectedStock, tradeType === 'buy' ? 'BUY' : 'SELL', tradeQuantity as number);
  }, [executeTrade, selectedStock, tradeType, tradeQuantity]);

  return {
    showTradeModal,
    selectedStock,
    tradeType,
    setTradeType,
    tradeQuantity,
    setTradeQuantity,
    tradeQuantityInput,
    setTradeQuantityInput,
    openTradeModal,
    closeTradeModal,
    handleExecuteModalTrade
  };
}