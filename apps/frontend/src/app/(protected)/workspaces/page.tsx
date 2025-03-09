import { makeReq } from '@drivebase/frontend/helpers/make.req';
import { format } from 'date-fns';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@drivebase/ui/components/card';
import { ArrowRight, LibraryIcon } from 'lucide-react';
import { Workspace } from '@prisma/client';
import { setWorkspace } from './action';

async function Page() {
  const workspacesResponse = await makeReq('/workspaces', {
    method: 'GET',
  });

  if (!workspacesResponse.ok) {
    return <div>An error occurred. Please try again.</div>;
  }

  const workspaces = await workspacesResponse.json();

  return (
    <div className="h-screen flex justify-center items-center">
      <Card className="w-full max-w-sm shadow-xl rounded-2xl relative">
        <CardHeader className="border-b text-center py-12">
          <div className="mx-auto p-4 bg-accent rounded-2xl mb-4">
            <LibraryIcon size={40} />
          </div>
          <CardTitle className={'text-xl font-medium'}>Workspaces</CardTitle>
          <CardDescription>Select a workspace to continue</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 bg-accent/50 border-t py-10">
          {workspaces.data.map((workspace: Workspace) => (
            <form key={workspace.id} action={setWorkspace}>
              <input type="hidden" name="workspaceId" value={workspace.id} />
              <button
                type="submit"
                className="flex items-center group justify-between text-left relative cursor-pointer w-full"
                role="group"
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
            </form>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

export default Page;
