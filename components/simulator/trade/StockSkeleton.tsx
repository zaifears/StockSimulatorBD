import React from 'react';

export default function StockSkeleton({ count = 10 }: { count?: number }) {
  return (
    <>
      {/* Desktop Skeleton */}
      <div className="hidden md:block bg-white dark:bg-[#161B22] border border-gray-200 dark:border-gray-800 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/30 h-10">
              <th className="px-5 lg:px-6 py-3.5"></th>
              <th className="px-5 lg:px-6 py-3.5"></th>
              <th className="px-5 lg:px-6 py-3.5"></th>
              <th className="hidden lg:table-cell px-5 lg:px-6 py-3.5"></th>
              <th className="hidden xl:table-cell px-5 lg:px-6 py-3.5"></th>
              <th className="px-5 lg:px-6 py-3.5"></th>
              <th className="px-5 lg:px-6 py-3.5"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {Array.from({ length: count }).map((_, i) => (
              <tr key={i} className="animate-pulse">
                <td className="px-5 lg:px-6 py-3.5"><div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16 mb-2"></div><div className="h-2 bg-gray-100 dark:bg-gray-800 rounded w-24"></div></td>
                <td className="px-5 lg:px-6 py-3.5 text-right"><div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16 ml-auto"></div></td>
                <td className="px-5 lg:px-6 py-3.5 text-right"><div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-12 ml-auto"></div></td>
                <td className="hidden lg:table-cell px-5 lg:px-6 py-3.5 text-right"><div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-14 ml-auto"></div></td>
                <td className="hidden xl:table-cell px-5 lg:px-6 py-3.5 text-right"><div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-14 ml-auto"></div></td>
                <td className="px-5 lg:px-6 py-3.5 text-center"><div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-8 mx-auto"></div></td>
                <td className="px-5 lg:px-6 py-3.5 text-right"><div className="flex justify-end gap-2"><div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-12"></div><div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-12"></div><div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-12"></div></div></td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>

      {/* Mobile Skeleton: standalone cards with grey resting zones */}
      <div className="md:hidden space-y-3 px-3.5 sm:px-0">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="bg-white dark:bg-[#161B22] border border-gray-200/80 dark:border-gray-800/80 rounded-2xl p-3.5 sm:p-4 shadow-xs animate-pulse">
            <div className="flex justify-between items-start mb-3">
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center gap-2">
                  <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-20"></div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-8"></div>
                </div>
                <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded w-28"></div>
                <div className="h-2.5 bg-gray-100 dark:bg-gray-800 rounded w-36"></div>
              </div>
              <div className="text-right space-y-1.5 shrink-0">
                <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-16 ml-auto"></div>
                <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-16 ml-auto"></div>
                <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded w-10 ml-auto"></div>
              </div>
            </div>
            <div className="flex gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
              <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded-xl w-16"></div>
              <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded-xl flex-1"></div>
              <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded-xl flex-1"></div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}