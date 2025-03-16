import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/auth/forget-password')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/auth/forget-password"!</div>
}
