'use client';

import type { MyProfile, SessionUser } from '@cc/contracts';
import { createContext, useContext } from 'react';

export interface Viewer {
  user: SessionUser;
  profile: MyProfile;
  refreshProfile: () => Promise<unknown>;
}

export const ViewerContext = createContext<Viewer | null>(null);

export function useViewer(): Viewer {
  const viewer = useContext(ViewerContext);
  if (!viewer) {
    throw new Error('useViewer must be used inside the app layout');
  }
  return viewer;
}
