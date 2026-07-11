'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Search, BarChart2 } from 'lucide-react';
import { DseStock } from '@/lib/dseStocks'; // Assuming this is your type

export default function StockGrid({ initialStocks }: { initialStocks: DseStock[] }) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredStocks = initialStocks.filter(stock => 
    stock.symbol.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (stock.name && stock.name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <section className="w-full py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="relative max-w-lg mx-auto mb-12">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            aria-label="Search stocks by symbol or name" // Added for accessibility
            placeholder="Search symbol or name (e.g. GP)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-6 py-4 rounded-2xl bg-white dark:bg-[#1A1F26] border border-gray-200 dark:border-gray-700 shadow-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all text-lg"
          />
        </div>

        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <BarChart2 className="w-6 h-6 text-blue-500" /> 
            Full List ({filteredStocks.length})
          </h2>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {filteredStocks.map((stock) => (
            <Link
              key={stock.symbol}
              href={`/stocks/${stock.symbol.toLowerCase()}`}
              className="group p-4 bg-white dark:bg-[#1A1F26] rounded-2xl border border-gray-100 dark:border-gray-800 hover:border-blue-400 dark:hover:border-blue-500 transition-all hover:shadow-lg hover:-translate-y-1"
            >
              <div className="font-extrabold text-lg text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400">
                {stock.symbol}
              </div>
              <div className="text-xs text-gray-500 truncate mt-1">
                {stock.name || 'Company Name'}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}