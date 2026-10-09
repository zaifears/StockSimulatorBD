'use client';

// components/simulator/trade/TradeQuestionnaireModal.tsx
// Backward-compatible wrapper maintaining 100% compatibility for the trade questionnaire poll,
// powered by the generic UserNoticeModal architecture.

import React from 'react';
import UserNoticeModal from '@/components/shared/UserNoticeModal';

interface Props {
  onSuccess?: () => void;
  isOpen?: boolean;
}

export default function TradeQuestionnaireModal({ onSuccess, isOpen }: Props) {
  return (
    <UserNoticeModal
      campaignId="domain_survey"
      variant="questionnaire"
      title={{
        en: 'Quick Community Poll',
        bn: 'কমিউনিটি মতামত',
      }}
      badge={{
        en: 'POLL',
        bn: 'মতামত',
      }}
      dismissible={false}
      onSuccess={onSuccess}
      isOpen={isOpen}
    />
  );
}
