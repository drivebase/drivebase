import { createFileRoute, useRouter } from '@tanstack/react-router';

import { format } from 'date-fns';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@drivebase/react/components/card';
import { ArrowRight, LibraryIcon, Loader } from 'lucide-react';
import type { Workspace } from '@prisma/client';
import { useGetWorkspacesQuery } from '@drivebase/react/lib/redux/endpoints/workspaces';

function Page() {
  const router = useRouter();
  const { data: workspaces, isLoading } = useGetWorkspacesQuery();

  if (isLoading) {
    return (
      <div className="h-screen flex justify-center items-center">
        <Loader className="w-10 h-10 animate-spin" />
      </div>
    );
  }

  if (!workspaces?.data) {
    return <div>An error occurred. Please try again.</div>;
  }

  if (workspaces.data.length === 0) {
    window.location.href = '/onboarding';
    return;
  }

  return (
    <div className="h-screen flex justify-center items-center">
      <Card className="w-full max-w-sm shadow-xl rounded-2xl relative z-10">
        <CardHeader className="border-b text-center py-12">
          <div className="mx-auto p-4 bg-accent rounded-2xl mb-4">
            <LibraryIcon size={40} />
          </div>
          <CardTitle className={'text-xl font-medium'}>Workspaces</CardTitle>
          <CardDescription>Select a workspace to continue</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 bg-accent/50 border-t py-10">
          {workspaces.data.map((workspace: Workspace) => (
            <button
              key={workspace.id}
              className="flex items-center group justify-between text-left relative cursor-pointer w-full"
              role="group"
              onClick={() => {
                const cookieValue = `workspaceId=${workspace.id}`;
                const isLocalhost =
                  window.location.hostname === 'localhost' ||
                  window.location.hostname === '127.0.0.1';
                document.cookie = `${cookieValue}; path=/; SameSite=Strict${
                  isLocalhost ? '' : '; secure'
                }`;
                router.navigate({
                  to: '/',
                });
              }}
            >
              <div className="absolute -inset-x-4 -inset-y-2 rounded-lg group-hover:bg-accent transition-colors duration-200"></div>
              <div className="space-y-1 z-10">
                <div className="text-sm font-medium">{workspace.name}</div>
                <div className="text-muted-foreground text-xs">
                  Created on {format(workspace.createdAt, 'MMM d, yyyy')}
                </div>
              </div>
              <ArrowRight
                className="group-hover:-translate-x-2 transition-transform duration-300"
                size={16}
              />
            </button>
          ))}
        </CardContent>
      </Card>

      <div className="absolute inset-0 h-full w-full bg-background bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />
    </div>
  );
}

export const Route = createFileRoute('/_protected/workspaces')({
  component: Page,
});
