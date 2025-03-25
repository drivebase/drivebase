import { useAppStore } from '@drivebase/web/lib/redux/hooks';
import { setWorkspace } from '@drivebase/web/lib/redux/reducers/workspace.reducer';
import type { Workspace } from '@prisma/client';
import { useRef } from 'react';

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

  return children;
}

export default WorkspaceProvider;
