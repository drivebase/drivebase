'use client';

import { useRef } from 'react';
import { useAppStore } from '@drivebase/ui/lib/redux/hooks';
import { UserPublicData } from '@drivebase/internal/database/users/users.validator';
import { setUser } from '@drivebase/ui/lib/redux/reducers/profile.reducer';

type AuthProviderProps = {
  profile: UserPublicData;
  children: React.ReactNode;
};

function ProfileProvider({ profile, children }: AuthProviderProps) {
  const store = useAppStore();
  const initialized = useRef(false);

  if (!initialized.current) {
    initialized.current = true;
    store.dispatch(setUser(profile));
  }

  return <>{children}</>;
}

export default ProfileProvider;
