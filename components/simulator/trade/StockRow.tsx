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

export default function StockRow({ stock, portfolioItem, marketOpen, variant, onTrade }: Props) {
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
      <tr className="group hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
        <td className="px-5 py-3">
          <div className="flex flex-col">
            <span className="font-bold text-gray-900 dark:text-gray-100 group-hover:text-blue-500 transition-colors">{stock.symbol}</span>
            {companyName && <span className="text-[10px] text-gray-400 truncate max-w-[180px]" title={companyName}>{companyName}</span>}
          </div>
        </td>
        <td className="px-5 py-3 text-center">
          {stock.category ? (
            <span className={`inline-block px-2 py-1 rounded text-xs font-bold ${getCategoryColor(stock.category).badge}`}>{stock.category}</span>
          ) : <span className="text-gray-400 dark:text-gray-500 text-xs">-</span>}
        </td>
        <td className="px-5 py-3 text-right"><span className="font-mono font-semibold text-gray-900 dark:text-gray-100">{portfolioItem.quantity}</span></td>
        <td className="px-5 py-3 text-right"><span className="font-mono text-gray-700 dark:text-gray-300">৳{avgCost.toFixed(2)}</span></td>
        <td className="px-5 py-3 text-right"><span className="font-mono font-medium text-gray-900 dark:text-gray-100">৳{stock.ltp.toFixed(2)}</span></td>
        <td className="px-5 py-3 text-right">
          <div className={`inline-flex flex-col items-end ${isUp ? 'text-emerald-500' : 'text-rose-500'}`}>
            <span className="font-mono font-bold text-xs flex items-center gap-0.5">
              {isUp ? '+' : ''}{stock.changePercent.toFixed(2)}%
              {isUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
            </span>
          </div>
        </td>
        <td className="px-5 py-3 text-right">
          <div className={`inline-flex flex-col items-end ${isPnlUp ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
            <span className="font-mono font-bold text-sm">{isPnlUp ? '+' : ''}৳{pnl.toFixed(2)}</span>
            <span className="text-[10px] font-mono opacity-80">{isPnlUp ? '+' : ''}{pnlPercent.toFixed(2)}%</span>
          </div>
        </td>
        <td className="px-5 py-3 text-right">
          <div className="flex justify-end gap-1.5">
            <Link href={`/stocks/${stock.symbol}`} className="px-3 py-1.5 rounded text-xs font-semibold transition-all bg-blue-500/10 hover:bg-blue-500 text-blue-600 hover:text-white">Chart</Link>
            <button onClick={() => onTrade(stock.symbol, 'buy')} disabled={!marketOpen} className={`px-3 py-1.5 rounded text-xs font-semibold transition-all ${marketOpen ? 'bg-emerald-500/10 hover:bg-emerald-500 text-emerald-600 hover:text-white cursor-pointer' : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'}`}>Buy</button>
            <button onClick={() => onTrade(stock.symbol, 'sell')} disabled={!marketOpen} className={`px-3 py-1.5 rounded text-xs font-semibold transition-all ${marketOpen ? 'bg-rose-500/10 hover:bg-rose-500 text-rose-600 hover:text-white cursor-pointer' : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'}`}>Sell</button>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <tr className="group hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
      <td className="px-6 py-4">
        <div className="flex flex-col">
          <span className="font-bold text-gray-900 dark:text-gray-100 group-hover:text-blue-500 transition-colors">{stock.symbol}</span>
          {companyName && <span className="text-[10px] text-gray-400 truncate max-w-[200px]" title={companyName}>{companyName}</span>}
        </div>
      </td>
      <td className="px-6 py-4 text-right"><span className="font-mono font-medium text-gray-900 dark:text-gray-100">৳{stock.ltp.toFixed(2)}</span></td>
      <td className="px-6 py-4 text-right">
        <div className={`inline-flex flex-col items-end ${isUp ? 'text-emerald-500' : 'text-rose-500'}`}>
          <span className="font-mono font-bold text-xs flex items-center gap-1">
            {isUp ? '+' : ''}{stock.changePercent.toFixed(2)}%
            {isUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
          </span>
          <span className="text-[10px] opacity-70">{isUp ? '+' : ''}৳{stock.change.toFixed(2)}</span>
        </div>
      </td>
      <td className="px-6 py-4 text-center">
        {stock.category ? (
          <span className={`inline-block px-2 py-1 rounded text-xs font-bold ${getCategoryColor(stock.category).badge}`}>{stock.category}</span>
        ) : <span className="text-gray-400 dark:text-gray-500 text-xs">-</span>}
      </td>
      <td className="px-6 py-4 text-right">
        <div className="flex justify-end gap-2">
          <Link href={`/stocks/${stock.symbol}`} className="px-3 py-1.5 rounded text-xs font-semibold transition-all bg-blue-500/10 hover:bg-blue-500 text-blue-600 hover:text-white">Chart</Link>
          <button onClick={() => onTrade(stock.symbol, 'buy')} disabled={!marketOpen} className={`px-3 py-1.5 rounded text-xs font-semibold transition-all ${marketOpen ? 'bg-emerald-500/10 hover:bg-emerald-500 text-emerald-600 hover:text-white cursor-pointer' : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'}`}>Buy</button>
          <button onClick={() => onTrade(stock.symbol, 'sell')} disabled={!marketOpen} className={`px-3 py-1.5 rounded text-xs font-semibold transition-all ${marketOpen ? 'bg-rose-500/10 hover:bg-rose-500 text-rose-600 hover:text-white cursor-pointer' : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'}`}>Sell</button>
        </div>
      </td>
    </tr>
  );
}