import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/_protected/_dashboard/recycle-bin')({
  component: RouteComponent,
});

function RouteComponent() {
  return <div>Hello "/_protected/_dashboard/recycle-bin"!</div>;
}
