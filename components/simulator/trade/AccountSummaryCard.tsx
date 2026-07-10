import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Activity, TrendingUp, TrendingDown, ChevronDown, ChevronUp } from 'lucide-react';
import type { SimulatorState } from '@/hooks/useSimulator';

interface Props {
  simulatorState: SimulatorState;
  marketOpen: boolean;
}

export default function AccountSummaryCard({ simulatorState, marketOpen }: Props) {
  const router = useRouter();
  const [showDetails, setShowDetails] = useState(false); // New state for mobile toggle
  const realized = simulatorState.realizedGainLoss || 0;
  const unrealized = simulatorState.totalGainLoss;
  const net = realized + unrealized;

  return (
    <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-none sm:rounded-xl p-4 sm:p-6 text-white shadow-md sm:shadow-lg relative overflow-hidden -mx-4 sm:mx-0">
      <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
      
      <div className="flex items-center justify-between mb-2 sm:mb-3">
        <h3 className="text-blue-100 text-[10px] sm:text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 sm:gap-2">
          <Activity className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          DSE Terminal
        </h3>
        <span className={`text-[10px] sm:text-xs font-medium px-2 py-0.5 sm:py-1 rounded-full ${marketOpen ? 'bg-emerald-500/30 text-emerald-200' : 'bg-rose-500/30 text-rose-200'}`}>
          {marketOpen ? '● Live' : '○ Closed'}
        </span>
      </div>

      <div className="mb-3 sm:mb-4 flex sm:block items-end justify-between">
        <div>
          <div className="text-blue-200 text-[10px] uppercase mb-0.5 sm:mb-1">Net Equity</div>
          <div className="text-2xl sm:text-3xl font-bold font-mono tracking-tight">
            ৳{(simulatorState.balance + simulatorState.totalCurrentValue).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>
        <div className="sm:hidden text-right">
          <div className="text-blue-200 text-[10px] uppercase mb-0.5">Buying Power</div>
          <div className="font-mono font-semibold text-lg text-emerald-300">
            ৳{simulatorState.balance.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </div>
        </div>
      </div>
      
      {/* Mobile Toggle Button */}
      <button 
        onClick={() => setShowDetails(!showDetails)}
        className="sm:hidden w-full py-1.5 bg-white/10 rounded-lg text-[10px] font-bold uppercase flex items-center justify-center gap-1 mb-2 hover:bg-white/20"
      >
        {showDetails ? 'Hide Details' : 'View Detailed Assets'}
        {showDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </button>

      {/* Grid: Visible on desktop always, visible on mobile only when showDetails is true */}
      <div className={`${showDetails ? 'grid' : 'hidden'} sm:grid grid-cols-2 gap-3 pt-4 border-t border-white/20 mb-4`}>
        <div className="bg-white/10 rounded-lg p-3">
          <div className="text-blue-200 text-[10px] uppercase">Buying Power</div>
          <div className="font-mono font-semibold text-sm sm:text-lg">৳{simulatorState.balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
        </div>
        <div className="bg-white/10 rounded-lg p-3">
          <div className="text-blue-200 text-[10px] uppercase">Total Invested</div>
          <div className="font-mono font-semibold text-sm sm:text-lg">৳{simulatorState.totalInvested.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
        </div>
        <div className="bg-white/10 rounded-lg p-3">
          <div className="text-blue-200 text-[10px] uppercase">Portfolio Value</div>
          <div className="font-mono font-semibold text-sm sm:text-lg">৳{simulatorState.totalCurrentValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
        </div>
        <div className="bg-white/10 rounded-lg p-3">
          <div className="text-blue-200 text-[10px] uppercase">Total Return</div>
          <div className={`font-mono font-semibold text-sm sm:text-lg flex items-center gap-1 ${simulatorState.totalGainLoss >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
            {simulatorState.totalGainLoss >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {simulatorState.gainLossPercent.toFixed(2)}%
          </div>
        </div>
      </div>

      <div className={`${showDetails ? 'block' : 'hidden'} sm:block space-y-2 mb-4`}>
        <div className="bg-white/10 rounded-lg px-3 py-2.5 flex justify-between items-center">
          <span className="text-blue-200 text-[10px] uppercase">Realized P&L</span>
          <span className={`font-mono font-bold text-xs ${realized >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
            {realized >= 0 ? '+' : ''}৳{realized.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
        <div className="bg-white/10 rounded-lg px-3 py-2.5 flex justify-between items-center">
          <span className="text-blue-200 text-[10px] uppercase">Unrealized P&L</span>
          <span className={`font-mono font-bold text-xs ${unrealized >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
            {unrealized >= 0 ? '+' : ''}৳{unrealized.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
      </div>

      <p className="text-blue-200 text-[9px] mb-4">*Simulated currency for educational purposes</p>
      
      <button
        onClick={() => router.push('/coins')}
        className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg font-semibold text-xs transition-all border border-white/30"
      >
        Add Credit
      </button>
    </div>
  );
}