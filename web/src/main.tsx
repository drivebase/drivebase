import ReactDOM from 'react-dom/client'
import { RouterProvider, createRouter } from '@tanstack/react-router'
import { Provider as UrqlProvider } from 'urql'
import { routeTree } from './routeTree.gen'
import { gqlClient } from './lib/gql-client'

const router = createRouter({
  routeTree,
  defaultPreload: 'intent',
  scrollRestoration: true,
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

const rootElement = document.getElementById('app')!

if (!rootElement.innerHTML) {
  const root = ReactDOM.createRoot(rootElement)
  root.render(
    <UrqlProvider value={gqlClient}>
      <RouterProvider router={router} />
    </UrqlProvider>,
  )
}
