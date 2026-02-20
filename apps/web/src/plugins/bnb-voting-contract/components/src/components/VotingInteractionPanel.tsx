'use client';

/**
 * VotingInteractionPanel
 * Thin wrapper that re-exports the shared BNB Voting panel component.
 * This lets generated projects import from a local path without installing
 * the original monorepo packages.
 */

import React from 'react';
import { VotingInteractionPanel as SharedVotingInteractionPanel } from '@cradle/bnb-voting';

export interface VotingInteractionPanelProps {
  contractAddress?: string;
}

export function VotingInteractionPanel(props: VotingInteractionPanelProps) {
  return (
    <SharedVotingInteractionPanel
      contractAddress={props.contractAddress ?? '0x8a64dFb64A71AfD00F926064E1f2a0B9a7cBe7dD'}
    />
  );
}
