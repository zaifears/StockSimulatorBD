'use client';

// app/admin/tier/page.tsx
// Dedicated admin page for Boss tier subscription review, verification, and overrides.

import React from 'react';
import TierList from '@/components/admin/TierList';

export default function AdminTierPage() {
  return (
    <div className="min-h-screen bg-gray-50/50 dark:bg-[#090E17] pt-20 pb-12">
      <TierList />
    </div>
  );
}
