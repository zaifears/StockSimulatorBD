import React from 'react';
import { Briefcase } from 'lucide-react';

export default function MarketRulesCard() {
  return (
    <div className="bg-white dark:bg-[#15191E] rounded-xl border border-gray-200 dark:border-gray-800 p-5">
      <h4 className="font-bold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
        <Briefcase className="w-4 h-4 text-blue-500" />
        Market Rules
      </h4>
      <ul className="space-y-3 text-sm text-gray-600 dark:text-gray-400">
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
    </div>
  );
}