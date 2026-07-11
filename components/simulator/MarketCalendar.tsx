'use client';
import React, { useState, useMemo, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar, ChevronDown, ChevronUp, Briefcase } from 'lucide-react';
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
  const [isOpen, setIsOpen] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);

  useEffect(() => {
    const isDesktop = window.matchMedia('(min-width: 1024px)').matches;
    setRulesOpen(isDesktop);
  }, []);

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
    const year = testDate.getFullYear();
    const month = String(testDate.getMonth() + 1).padStart(2, '0');
    const dayStr = String(day).padStart(2, '0');
    const dateStr = `${year}-${month}-${dayStr}`;
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
    <>
      {/* Market Calendar */}
      <div className="bg-white dark:bg-gray-900 rounded-none sm:rounded-xl border-y sm:border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm -mx-4 sm:mx-0">
        {/* Header - Clickable to Toggle */}
        <div
          className="p-4 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 flex justify-between items-center cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          onClick={() => setIsOpen(!isOpen)}
        >
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">Market Schedule</span>
          </div>
          {isOpen ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
        </div>

        {/* Collapsible Content */}
        {isOpen && (
          <div className="p-4">
            <div className="flex justify-between items-center mb-4">
              <button
                onClick={(e) => { e.stopPropagation(); setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1)); }}
                aria-label="Previous month"
                title="Previous month"
                className="p-1 hover:bg-gray-200 dark:hover:bg-gray-800 rounded text-gray-500"
              >
                <ChevronLeft className="w-4 h-4" aria-hidden="true" />
              </button>
              <span className="text-xs font-mono font-medium text-gray-700 dark:text-gray-300">
                {monthName}
              </span>
              <button
                onClick={(e) => { e.stopPropagation(); setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1)); }}
                aria-label="Next month"
                title="Next month"
                className="p-1 hover:bg-gray-200 dark:hover:bg-gray-800 rounded text-gray-500"
              >
                <ChevronRight className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>

            <div className="grid grid-cols-7 mb-2">
              {DAY_LABELS.map((label, index) => (
                <div key={`day-header-${index}`} className="text-center text-[10px] font-bold text-gray-400">
                  {label.short}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {monthData.padding.map((_, i) => <div key={`pad-${i}`} />)}
              {monthData.days.map(day => {
                const open = isMarketOpen(day);
                const isTodayDate = isToday(day);
                return (
                  <div
                    key={`day-${day}`}
                    className={`
                      aspect-square flex items-center justify-center rounded-md text-xs font-medium relative group
                      ${isTodayDate ? 'ring-1 ring-blue-500 ring-offset-1 dark:ring-offset-gray-900' : ''}
                      ${open
                        ? 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                        : 'text-gray-300 dark:text-gray-600 bg-gray-50 dark:bg-gray-800/30'
                      }
                    `}
                  >
                    {day}
                    {!open && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-[1px] h-4 bg-gray-300 dark:bg-gray-700 rotate-45"></div>
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
        )}
      </div>

      {/* Market Rules */}
      <div className="bg-white dark:bg-[#15191E] rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden mt-4">
        <div
          className="px-5 py-4 flex justify-between items-center cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
          onClick={() => setRulesOpen(!rulesOpen)}
        >
          <h4 className="font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-blue-500" />
            Market Rules
          </h4>
          {rulesOpen ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
        </div>
        {rulesOpen && (
          <ul className="space-y-3 text-sm text-gray-600 dark:text-gray-400 px-5 pb-5">
            <li className="flex gap-2 items-start">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0"></span>
              Trading hours: 10:00 AM - 2:15 PM (Sun-Thu).
            </li>
            <li className="flex gap-2 items-start">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0"></span>
              <span><strong>0.4% Commission</strong> charged on all buy/sell orders.</span>
            </li>
            <li className="flex gap-2 items-start">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-1.5 shrink-0"></span>
              <span><strong>T+1 Rule:</strong> Cannot sell shares on same day of purchase.</span>
            </li>
            <li className="flex gap-2 items-start">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0"></span>
              Prices delayed by 1-5 mins for free tier.
            </li>
          </ul>
        )}
      </div>
    </>
  );
}