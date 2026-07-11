import React, { RefObject, forwardRef } from 'react';
import { Search, Activity, Briefcase, Clock } from 'lucide-react';

interface Props {
  activeTab: 'market' | 'portfolio';
  onTabChange: (tab: 'market' | 'portfolio') => void;
  marketOpen: boolean;
  nextUpdateIn: number;
  searchInput: string;
  onSearchChange: (value: string) => void;
  searchInputRef: RefObject<HTMLInputElement | null>;
  isPending: boolean;
}

const MarketToolbar = forwardRef<HTMLDivElement, Props>(({ 
  activeTab, 
  onTabChange, 
  marketOpen, 
  nextUpdateIn, 
  searchInput, 
  onSearchChange, 
  searchInputRef, 
  isPending 
}, ref) => {
  
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const searchWebMcpSchema = {
    tools: [
      {
        name: "search_dse_ticker",
        description: "Search the Dhaka Stock Exchange market directory by company name or ticker symbol.",
        parameters: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "The stock ticker symbol (e.g., GP) or company name to search for."
            }
          },
          required: ["query"]
        }
      }
    ]
  };

  return (
    <div 
      ref={ref} 
      className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 bg-white/95 dark:bg-[#15191E]/95 backdrop-blur-xl p-3 sm:p-2.5 -mx-4 sm:mx-0 px-4 sm:px-2.5 rounded-none sm:rounded-2xl border-y sm:border border-gray-200 dark:border-gray-800 shadow-md sm:shadow-sm sticky top-16 z-40 sm:z-30"
    >
      {/* WebMCP Schema Injection */}
      <script 
        type="application/webmcp+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(searchWebMcpSchema) }}
      />

      <div className="flex items-center gap-2 w-full sm:w-auto">
        <div className="flex items-center gap-1 sm:gap-2 h-12 sm:h-14 bg-gray-50 dark:bg-gray-900/50 p-1 sm:p-1.5 rounded-xl border border-gray-100 dark:border-gray-800/50">
          {(['market', 'portfolio'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => onTabChange(tab)}
              className={`px-3 sm:px-5 h-full text-xs sm:text-sm font-bold rounded-lg sm:rounded-[10px] transition-all duration-200 flex items-center justify-center gap-1.5 sm:gap-2.5 ${
                activeTab === tab 
                ? 'bg-white dark:bg-[#1E2329] text-blue-600 dark:text-blue-400 shadow-sm border border-gray-200 dark:border-gray-700' 
                : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 border border-transparent'
              }`}
            >
              {tab === 'market' ? <Activity className="w-4 h-4" /> : <Briefcase className="w-4 h-4" />}
              <span className="capitalize text-[10px] sm:text-sm">{tab}</span>
            </button>
          ))}
        </div>

        <div className={`flex flex-col justify-center px-3 sm:px-6 h-12 sm:h-14 rounded-xl transition-all border shadow-sm flex-1 sm:flex-none sm:min-w-[160px] relative overflow-hidden ${
            marketOpen 
              ? 'bg-gradient-to-br from-emerald-600 to-emerald-700 text-white border-emerald-500/50 shadow-emerald-500/20' 
              : 'bg-gradient-to-br from-gray-600 to-gray-700 text-white border-gray-500/50 shadow-gray-500/20 opacity-90'
          }`}
        >
          <div className="flex items-center gap-1.5 sm:gap-2.5 mb-0.5">
            <div className={`w-2 h-2 rounded-full ring-2 ring-white/20 flex-shrink-0 ${marketOpen ? 'bg-white animate-pulse shadow-[0_0_8px_rgba(255,255,255,0.8)]' : 'bg-white/60'}`}></div>
            <span className="text-xs sm:text-sm font-bold tracking-tight truncate">{marketOpen ? 'OPEN' : 'CLOSED'}</span>
          </div>
          <div className="flex items-center gap-1 text-[10px] sm:text-[11px] font-medium text-white/90">
            <Clock className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-white/80 flex-shrink-0" />
            <span className="truncate font-mono">{marketOpen ? `Next update in: ${formatTime(nextUpdateIn)}` : 'Updates paused'}</span>
          </div>
        </div>
      </div>

      {/* Semantic Form for WebMCP Agent */}
      <form 
        onSubmit={(e) => e.preventDefault()}
        className="relative h-10 sm:h-14 w-full sm:w-auto sm:flex-1 sm:max-w-xs sm:min-w-[180px] sm:ml-auto"
      >
        <div className="absolute inset-y-0 left-0 flex items-center pl-3 sm:pl-4 cursor-text" onClick={() => searchInputRef.current?.focus()}>
          <Search className="w-4 h-4 text-gray-400" />
        </div>
        <input
          ref={searchInputRef}
          name="query"
          type="text"
          placeholder="Search companies..."
          value={searchInput}
          onChange={e => onSearchChange(e.target.value)}
          aria-label="Search DSE Stocks"
          className="w-full h-full pl-9 sm:pl-10 pr-3 sm:pr-4 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium placeholder:text-gray-400"
        />
        {isPending && <div className="absolute inset-y-0 right-3 flex items-center text-[10px] font-semibold text-blue-500">Updating...</div>}
      </form>
    </div>
  );
});

MarketToolbar.displayName = 'MarketToolbar';
export default MarketToolbar;