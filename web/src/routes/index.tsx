import { createFileRoute } from '@tanstack/react-router'
import { Button } from '@heroui/react';

export const Route = createFileRoute('/')({ component: App })

function App() {
  return (
    <>
      <Button>HELLO</Button>
    </>
  )
}
