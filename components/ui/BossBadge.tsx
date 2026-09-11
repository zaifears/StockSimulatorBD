'use client';

import React from 'react';
import Link from 'next/link';
import { Crown } from 'lucide-react';

interface BossBadgeProps {
  size?: 'xs' | 'sm' | 'md' | 'lg';
  corner?: boolean;
  interactive?: boolean;
  className?: string;
  showIcon?: boolean;
  text?: string;
}

export default function BossBadge({
  size = 'sm',
  corner = false,
  interactive = true,
  className = '',
  showIcon = true,
  text = 'BOSS',
}: BossBadgeProps) {
  const sizeClasses = {
    xs: 'text-[9px] px-2 py-0.5 tracking-wider gap-1',
    sm: 'text-[10px] px-2.5 py-0.5 tracking-wider gap-1',
    md: 'text-xs px-3 py-0.5 tracking-wide gap-1.5',
    lg: 'text-sm px-3.5 py-1 tracking-wide gap-1.5 font-extrabold',
  }[size];

  const iconSizes = {
    xs: 'w-2.5 h-2.5',
    sm: 'w-3 h-3',
    md: 'w-3.5 h-3.5',
    lg: 'w-4 h-4',
  }[size];

  const cornerClasses = corner
    ? 'absolute top-3 right-3 z-10 shadow-md'
    : 'inline-flex items-center';

  const badgeContent = (
    <span
      className={`
        ${!interactive && corner ? cornerClasses : 'inline-flex items-center'}
        ${sizeClasses}
        font-extrabold rounded-full uppercase
        bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600
        text-gray-950 dark:text-gray-950
        border border-amber-300 dark:border-amber-400
        shadow-[0_0_12px_rgba(245,158,11,0.3)]
        select-none whitespace-nowrap
        ${className}
      `}
      title="Boss Pro Feature"
    >
      {showIcon && <Crown className={`${iconSizes} fill-current shrink-0`} />}
      <span>{text}</span>
    </span>
  );

  if (interactive) {
    return (
      <Link
        href="/boss"
        className={`${corner ? cornerClasses : 'inline-flex'} transition-transform hover:scale-105 active:scale-95 focus:outline-none`}
        title="View Boss Membership"
      >
        {badgeContent}
      </Link>
    );
  }

  return badgeContent;
}
