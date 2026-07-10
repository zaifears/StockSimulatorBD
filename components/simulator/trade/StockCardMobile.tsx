import React from 'react';
import Link from 'next/link';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { getCompanyName } from '@/lib/dseCompanyNames';
import type { Stock, PortfolioItem } from '@/hooks/useSimulator';

const getCategoryColor = (category?: string) => {
  switch(category) {
    case 'A': return { badge: 'bg-green-500/10 text-green-700 dark:text-green-300' };
    case 'B': return { badge: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-300' };
    case 'N': return { badge: 'bg-blue-500/10 text-blue-700 dark:text-blue-300' };
    case 'Z': return { badge: 'bg-red-500/10 text-red-700 dark:text-red-300' };
    default: return { badge: 'bg-gray-500/10 text-gray-600 dark:text-gray-400' };
  }
};

interface Props {
  stock: Stock;
  portfolioItem?: PortfolioItem;
  marketOpen: boolean;
  variant: 'market' | 'portfolio';
  onTrade: (symbol: string, type: 'buy' | 'sell') => void;
}

export default function StockCardMobile({ stock, portfolioItem, marketOpen, variant, onTrade }: Props) {
  const isUp = stock.change >= 0;
  const companyName = getCompanyName(stock.symbol);

  if (variant === 'portfolio' && portfolioItem) {
    const avgCost = portfolioItem.averageBuyPrice;
    const currentValue = stock.ltp * portfolioItem.quantity;
    const investedValue = avgCost * portfolioItem.quantity;
    const pnl = currentValue - investedValue;
    const pnlPercent = investedValue > 0 ? (pnl / investedValue) * 100 : 0;
    const isPnlUp = pnl >= 0;

    return (
      <div className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-bold text-base text-gray-900 dark:text-gray-100">{stock.symbol}</span>
              {stock.category && <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${getCategoryColor(stock.category).badge}`}>{stock.category}</span>}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded-full font-medium">{portfolioItem.quantity} shares</span>
            </div>
            {companyName && <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 truncate">{companyName}</p>}
          </div>
          <div className="text-right flex-shrink-0">
            <div className="font-mono font-bold text-base text-gray-900 dark:text-white">৳{stock.ltp.toFixed(2)}</div>
            <div className={`flex items-center justify-end gap-0.5 text-xs font-semibold ${isUp ? 'text-emerald-500' : 'text-rose-500'}`}>
              {isUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
              <span>{isUp ? '+' : ''}{stock.changePercent.toFixed(2)}%</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center justify-between mb-3 py-1.5 px-2.5 rounded-lg bg-gray-50 dark:bg-gray-800/60">
          <div>
            <span className="text-[10px] text-gray-500 dark:text-gray-400 uppercase">Avg Cost</span>
            <div className="font-mono text-sm font-medium text-gray-800 dark:text-gray-200">৳{avgCost.toFixed(2)}</div>
          </div>
          <div className="text-right">
            <span className="text-[10px] text-gray-500 dark:text-gray-400 uppercase">P&L</span>
            <div className={`font-mono text-sm font-bold ${isPnlUp ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
              {isPnlUp ? '+' : ''}৳{pnl.toFixed(2)} 
              <span className="text-[10px] font-medium ml-1">({isPnlUp ? '+' : ''}{pnlPercent.toFixed(1)}%)</span>
            </div>
          </div>
        </div>
        
        <div className="flex gap-2">
          <Link href={`/stocks/${stock.symbol}`} className="flex items-center justify-center px-4 py-2 rounded-lg text-sm font-bold transition-all bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40 text-blue-600 dark:text-blue-400">Chart</Link>
          <button onClick={() => onTrade(stock.symbol, 'buy')} disabled={!marketOpen} className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${marketOpen ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm' : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'}`}>Buy</button>
          <button onClick={() => onTrade(stock.symbol, 'sell')} disabled={!marketOpen} className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${marketOpen ? 'bg-rose-500 hover:bg-rose-600 text-white shadow-sm' : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'}`}>Sell</button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-bold text-lg text-gray-900 dark:text-gray-100">{stock.symbol}</span>
            {stock.category && <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${getCategoryColor(stock.category).badge}`}>{stock.category}</span>}
          </div>
          {companyName && <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1">{companyName}</p>}
        </div>
        <div className="text-right">
          <div className="font-mono font-bold text-lg text-gray-900 dark:text-white">৳{stock.ltp.toFixed(2)}</div>
          <div className={`flex items-center justify-end gap-1 text-sm font-semibold ${isUp ? 'text-emerald-500' : 'text-rose-500'}`}>
            {isUp ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
            <span>{isUp ? '+' : ''}{stock.changePercent.toFixed(2)}%</span>
          </div>
        </div>
      </div>
      
      <div className="flex gap-2">
        <Link href={`/stocks/${stock.symbol}`} className="flex items-center justify-center px-4 py-2.5 rounded-lg text-sm font-bold transition-all bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40 text-blue-600 dark:text-blue-400">Chart</Link>
        <button onClick={() => onTrade(stock.symbol, 'buy')} disabled={!marketOpen} className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${marketOpen ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm' : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'}`}>Buy</button>
        <button onClick={() => onTrade(stock.symbol, 'sell')} disabled={!marketOpen} className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${marketOpen ? 'bg-rose-500 hover:bg-rose-600 text-white shadow-sm' : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'}`}>Sell</button>
      </div>
    </div>
  );
}