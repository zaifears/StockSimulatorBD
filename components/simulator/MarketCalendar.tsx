'use client';

import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { formatDateToDDMMYYYY } from '@/lib/dateFormatter';

interface MarketCalendarProps {
  holidays: string[];
}

const DAY_LABELS = [
  { short: 'Sun', full: 'Sunday' },
  { short: 'Mon', full: 'Monday' },
  { short: 'Tue', full: 'Tuesday' },
  { short: 'Wed', full: 'Wednesday' },
  { short: 'Thu', full: 'Thursday' },
  { short: 'Fri', full: 'Friday' },
  { short: 'Sat', full: 'Saturday' }
];

export default function MarketCalendar({ holidays }: MarketCalendarProps) {
  // Get today's date in Bangladesh timezone
  const getBDToday = () => {
    const now = new Date();
    const bdTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Dhaka' }));
    return new Date(bdTime.getFullYear(), bdTime.getMonth(), bdTime.getDate());
  };

  const today = getBDToday();
  const [currentDate, setCurrentDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));

  const getDaysInMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const getFirstDayOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay();

  const isMarketOpen = (day: number) => {
    const testDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    const dayOfWeek = testDate.getDay();
    
    // Format date as YYYY-MM-DD without timezone conversion issues
    const year = testDate.getFullYear();
    const month = String(testDate.getMonth() + 1).padStart(2, '0');
    const dayStr = String(day).padStart(2, '0');
    const dateStr = `${year}-${month}-${dayStr}`;
    
    // Closed Fri(5), Sat(6) or Holidays
    if (dayOfWeek === 5 || dayOfWeek === 6) return false;
    if (holidays.includes(dateStr)) return false;
    return true;
  };

  const monthData = useMemo(() => {
    const daysInMonth = getDaysInMonth(currentDate);
    const firstDay = getFirstDayOfMonth(currentDate);
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    const padding = Array.from({ length: firstDay }, () => null);
    return { days, padding };
  }, [currentDate]);

  const isToday = (day: number) => {
    return day === today.getDate() && 
           currentDate.getMonth() === today.getMonth() &&
           currentDate.getFullYear() === today.getFullYear();
  };

  const monthName = currentDate.toLocaleString('en-US', { month: 'long', year: 'numeric' });

  return (
    <div className="bg-white dark:bg-gray-900 rounded-none sm:rounded-xl border-y sm:border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm -mx-4 sm:mx-0">
      {/* Header Widget */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
        <div className="flex justify-between items-center mb-2">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">Market Schedule</span>
          </div>
          <div className="text-xs text-gray-500">Today: {formatDateToDDMMYYYY(today)}</div>
        </div>
        <div className="flex items-center gap-1 justify-between">
           <button 
             onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))}
             aria-label="Previous month"
             title="Previous month"
             className="p-1 hover:bg-gray-200 dark:hover:bg-gray-800 rounded text-gray-500"
           >
             <ChevronLeft className="w-4 h-4" aria-hidden="true" />
           </button>
           <span className="text-xs font-mono font-medium text-gray-700 dark:text-gray-300 flex-1 text-center">
             {monthName}
           </span>
           <button 
             onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))}
             aria-label="Next month"
             title="Next month"
             className="p-1 hover:bg-gray-200 dark:hover:bg-gray-800 rounded text-gray-500"
           >
             <ChevronRight className="w-4 h-4" aria-hidden="true" />
           </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="p-4">
        <div className="grid grid-cols-7 mb-2">
          {DAY_LABELS.map((label, index) => (
            <div key={`day-header-${index}`} className="text-center text-[10px] font-bold text-gray-400">{label.short}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {monthData.padding.map((_, i) => <div key={`pad-${i}`} />)}
          {monthData.days.map(day => {
            const isOpen = isMarketOpen(day);
            const isTodayDate = isToday(day);
            
            return (
              <div 
                key={`day-${day}`}
                className={`
                  aspect-square flex items-center justify-center rounded-md text-xs font-medium relative group
                  ${isTodayDate ? 'ring-1 ring-blue-500 ring-offset-1 dark:ring-offset-gray-900' : ''}
                  ${isOpen 
                    ? 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800' 
                    : 'text-gray-300 dark:text-gray-600 bg-gray-50 dark:bg-gray-800/30'
                  }
                `}
              >
                {day}
                {!isOpen && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-[1px] h-4 bg-gray-300 dark:bg-gray-700 rotate-45"></div>
                  </div>
                )}
                {/* Tooltip for closed days */}
                {!isOpen && (
                  <div className="hidden group-hover:block absolute bottom-full mb-1 z-10 px-2 py-1 bg-gray-900 text-white text-[10px] rounded whitespace-nowrap">
                    Closed
                  </div>
                )}
              </div>
            );
          })}
        </div>
        
        <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800 flex justify-between text-[10px] text-gray-500">
           <div className="flex items-center gap-1">
             <div className="w-2 h-2 rounded-full bg-gray-200 dark:bg-gray-700"></div>
             <span>Market Open</span>
           </div>
           <div className="flex items-center gap-1">
             <div className="w-2 h-2 rounded-full bg-gray-100 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700"></div>
             <span>Closed</span>
           </div>
        </div>
      </div>
    </div>
  );
}