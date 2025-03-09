'use client';

import { useRef } from 'react';
import { useAppStore } from '@drivebase/ui/lib/redux/hooks';
import { setWorkspace } from '@drivebase/ui/lib/redux/reducers/workspace.reducer';
import { Workspace } from '@prisma/client';

type WorkspaceProviderProps = {
  workspace: Workspace;
  children: React.ReactNode;
};

function WorkspaceProvider({ workspace, children }: WorkspaceProviderProps) {
  const store = useAppStore();
  const initialized = useRef(false);

  if (!initialized.current) {
    initialized.current = true;
    store.dispatch(setWorkspace(workspace));
  }

  return <>{children}</>;
}

export default WorkspaceProvider;
