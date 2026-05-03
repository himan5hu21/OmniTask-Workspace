'use strict';

import { ReactNode, useMemo } from 'react';
import { AbilityContext, defineAbilityFor } from '@/lib/casl';

interface AbilityProviderProps {
  children: ReactNode;
  orgRole?: string | null;
  channelRole?: string | null;
}

/**
 * AbilityProvider manages the CASL ability state for the application.
 * It re-calculates the user's permissions whenever their orgRole or channelRole changes.
 */
export function AbilityProvider({ children, orgRole, channelRole }: AbilityProviderProps) {
  // Rebuild rules whenever roles change
  const ability = useMemo(() => defineAbilityFor(orgRole, channelRole), [orgRole, channelRole]);

  return (
    <AbilityContext.Provider value={ability}>
      {children}
    </AbilityContext.Provider>
  );
}
