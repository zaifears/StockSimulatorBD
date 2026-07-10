import React from 'react';

export default function StockSkeleton({ count = 10 }: { count?: number }) {
  return (
    <>
      {/* Desktop Skeleton */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/30 h-10">
              <th></th><th></th><th></th><th></th><th></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {Array.from({ length: count }).map((_, i) => (
              <tr key={i} className="animate-pulse">
                <td className="px-6 py-4"><div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16 mb-2"></div><div className="h-2 bg-gray-100 dark:bg-gray-800 rounded w-24"></div></td>
                <td className="px-6 py-4 text-right"><div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16 ml-auto"></div></td>
                <td className="px-6 py-4 text-right"><div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-12 ml-auto"></div></td>
                <td className="px-6 py-4 text-center"><div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-8 mx-auto"></div></td>
                <td className="px-6 py-4 text-right"><div className="flex justify-end gap-2"><div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-12"></div><div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-12"></div></div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Skeleton */}
      <div className="md:hidden divide-y divide-gray-100 dark:divide-gray-800">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="p-4 animate-pulse">
            <div className="flex justify-between mb-3">
              <div><div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-16 mb-2"></div><div className="h-3 bg-gray-100 dark:bg-gray-800 rounded w-32"></div></div>
              <div className="text-right"><div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-16 mb-2 ml-auto"></div><div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-10 ml-auto"></div></div>
            </div>
            <div className="flex gap-2">
              <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
              <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded flex-1"></div>
              <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded flex-1"></div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}