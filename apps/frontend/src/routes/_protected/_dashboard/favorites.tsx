import FileList from '@drivebase/frontend/components/files/file.list';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/_protected/_dashboard/favorites')({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className="space-y-10">
      <div className="space-y-1">
        <h1 className="text-xl font-bold">Favorites</h1>
        <p className="text-muted-foreground">
          Files you have starred will appear here.
        </p>
      </div>
      <FileList starred />
    </div>
  );
}
