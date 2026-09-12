'use client';

// components/shared/BankSelector.tsx
// Searchable dropdown selector for all 62 scheduled banks in Bangladesh.
// Sourced from Bangladesh Bank official directory: https://www.bb.org.bd/en/index.php/links/links/9

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Building2, Search, Check, ChevronDown, X, ExternalLink } from 'lucide-react';

export const BANGLADESH_BANKS: string[] = [
  'AB Bank PLC',
  'Agrani Bank PLC',
  'Al-Arafah Islami Bank PLC',
  'Bangladesh Commerce Bank Limited',
  'Bangladesh Development Bank PLC',
  'Bangladesh Krishi Bank',
  'Bank Al-Falah Limited',
  'Bank Asia PLC.',
  'BASIC Bank PLC. (Bangladesh Small Industries and Commerce Bank PLC.)',
  'Bengal Commercial Bank PLC.',
  'BRAC Bank PLC',
  'Citibank N.A',
  'Citizens Bank PLC',
  'City Bank PLC',
  'Commercial Bank of Ceylon Limited',
  'Community Bank Bangladesh PLC.',
  'Dhaka Bank PLC',
  'Dutch-Bangla Bank PLC',
  'Eastern Bank PLC',
  'Export Import Bank of Bangladesh PLC',
  'First Security Islami Bank PLC',
  'Global Islami Bank PLC',
  'Habib Bank Ltd.',
  'ICB Islamic Bank Ltd.',
  'IFIC Bank PLC',
  'Islami Bank Bangladesh PLC',
  'Jamuna Bank PLC',
  'Janata Bank PLC',
  'Meghna Bank PLC',
  'Mercantile Bank PLC',
  'Midland Bank Limited',
  'Modhumoti Bank PLC',
  'Mutual Trust Bank PLC',
  'National Bank of Pakistan',
  'National Bank PLC',
  'National Credit & Commerce Bank PLC',
  'NRB Bank PLC',
  'NRBC Bank PLC',
  'One Bank PLC',
  'Padma Bank PLC',
  'Prime Bank PLC',
  'Probashi Kollyan Bank',
  'Pubali Bank PLC',
  'Rajshahi Krishi Unnayan Bank',
  'Rupali Bank PLC',
  'Sammilito Islami Bank PLC',
  'SBAC Bank PLC',
  'Shahjalal Islami Bank PLC',
  'Shimanto Bank PLC',
  'Social Islami Bank PLC',
  'Sonali Bank PLC',
  'Southeast Bank PLC',
  'Standard Chartered Bank',
  'Standard Islami Bank PLC',
  'State Bank of India',
  'The Hong Kong and Shanghai Banking Corporation. Ltd.',
  'The Premier Bank PLC',
  'Trust Bank PLC',
  'Union Bank PLC',
  'United Commercial Bank PLC',
  'Uttara Bank PLC',
  'Woori Bank',
];

// Common acronyms and aliases mapped to bank names for fast searching
const BANK_ALIASES: Record<string, string[]> = {
  'Dutch-Bangla Bank PLC': ['dbbl', 'dutch bangla', 'rocket'],
  'Eastern Bank PLC': ['ebl'],
  'BRAC Bank PLC': ['brac', 'astha', 'bbl'],
  'Standard Chartered Bank': ['scb', 'stan chart', 'standard chartered'],
  'City Bank PLC': ['city', 'citytouch', 'cbl'],
  'Islami Bank Bangladesh PLC': ['ibbl', 'cellfin', 'islamic bank'],
  'Mutual Trust Bank PLC': ['mtb', 'mtb smart'],
  'United Commercial Bank PLC': ['ucb', 'upay'],
  'Social Islami Bank PLC': ['sibl'],
  'First Security Islami Bank PLC': ['fsibl'],
  'National Credit & Commerce Bank PLC': ['ncc', 'nccb'],
  'Al-Arafah Islami Bank PLC': ['aibl'],
  'Shahjalal Islami Bank PLC': ['sjibl'],
  'The Hong Kong and Shanghai Banking Corporation. Ltd.': ['hsbc'],
  'Citibank N.A': ['citi'],
  'Export Import Bank of Bangladesh PLC': ['exim', 'exim bank'],
};

interface BankSelectorProps {
  selectedBank: string;
  onSelectBank: (bank: string) => void;
  required?: boolean;
  className?: string;
  error?: string;
}

export default function BankSelector({
  selectedBank,
  onSelectBank,
  required = false,
  className = '',
  error = '',
}: BankSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent | TouchEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen]);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    } else {
      setSearchQuery('');
    }
  }, [isOpen]);

  // Filter banks by name or alias
  const filteredBanks = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return BANGLADESH_BANKS;

    return BANGLADESH_BANKS.filter((bank) => {
      if (bank.toLowerCase().includes(q)) return true;
      const aliases = BANK_ALIASES[bank];
      if (aliases && aliases.some((alias) => alias.includes(q) || q.includes(alias))) {
        return true;
      }
      return false;
    });
  }, [searchQuery]);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5 uppercase tracking-wide flex items-center justify-between">
        <span className="flex items-center gap-1.5">
          <Building2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
          <span>Sending Bank Account {required && <span className="text-rose-500">*</span>}</span>
        </span>
        {selectedBank && (
          <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-bold">
            ✓ Bank Selected
          </span>
        )}
      </label>

      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        className={`w-full h-11 px-3.5 rounded-xl border text-left flex items-center justify-between gap-2 transition-all text-xs sm:text-sm bg-white dark:bg-[#111620] shadow-xs active:scale-[0.99] ${
          error
            ? 'border-rose-400 dark:border-rose-600 ring-2 ring-rose-500/20'
            : isOpen
            ? 'border-blue-500 ring-2 ring-blue-500/20'
            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${
            selectedBank
              ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-400'
          }`}>
            <Building2 className="w-3.5 h-3.5" />
          </div>
          {selectedBank ? (
            <span className="font-bold text-gray-900 dark:text-white truncate">
              {selectedBank}
            </span>
          ) : (
            <span className="text-gray-400 dark:text-gray-500 truncate">
              Select your bank (e.g. City Bank, BRAC Bank, EBL)...
            </span>
          )}
        </div>
        <ChevronDown className={`w-4 h-4 text-gray-400 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Popover */}
      {isOpen && (
        <div className="absolute z-50 left-0 right-0 mt-1.5 bg-white dark:bg-[#161c28] border border-gray-200 dark:border-gray-700 rounded-2xl shadow-xl overflow-hidden animate-in fade-in-0 zoom-in-95 duration-150">
          {/* Search Header */}
          <div className="p-2.5 border-b border-gray-100 dark:border-gray-800 bg-gray-50/70 dark:bg-[#111620]">
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search bank name or acronym (e.g. EBL, BRAC, City, DBBL)..."
                className="w-full pl-9 pr-8 py-2 text-xs bg-white dark:bg-[#1a2232] border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <div className="flex items-center justify-between text-[10px] text-gray-400 mt-1.5 px-1">
              <span>Showing {filteredBanks.length} of {BANGLADESH_BANKS.length} banks</span>
              {searchQuery && <span className="text-blue-500 font-medium">Filtered</span>}
            </div>
          </div>

          {/* Banks List */}
          <div role="listbox" className="max-h-60 overflow-y-auto divide-y divide-gray-50 dark:divide-gray-800/60 p-1">
            {filteredBanks.length === 0 ? (
              <div className="py-8 text-center text-xs text-gray-400">
                <Building2 className="w-6 h-6 mx-auto mb-1.5 opacity-40" />
                <span>No scheduled bank found for &ldquo;{searchQuery}&rdquo;</span>
              </div>
            ) : (
              filteredBanks.map((bank) => {
                const isSelected = selectedBank === bank;
                return (
                  <button
                    key={bank}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => {
                      onSelectBank(bank);
                      setIsOpen(false);
                    }}
                    className={`w-full px-3 py-2.5 rounded-xl text-left text-xs font-medium transition-all flex items-center justify-between gap-2 ${
                      isSelected
                        ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-bold'
                        : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800/70'
                    }`}
                  >
                    <span className="truncate">{bank}</span>
                    {isSelected && (
                      <Check className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Bangladesh Bank Directory Source Citation Note (Requested by user) */}
      <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
        This list has been taken from{' '}
        <a
          href="https://www.bb.org.bd/en/index.php/links/links/9"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 dark:text-blue-400 underline hover:text-blue-700 dark:hover:text-blue-300 font-semibold inline-flex items-center gap-0.5"
        >
          <span>Bangladesh Bank</span>
          <ExternalLink className="w-2.5 h-2.5 inline" />
        </a>{' '}
        website.
      </p>

      {error && (
        <p className="text-xs text-rose-600 dark:text-rose-400 font-semibold mt-1">
          {error}
        </p>
      )}
    </div>
  );
}
