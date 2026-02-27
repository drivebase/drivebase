# docs

Docs-only Next.js app for Drivebase.

Run locally:

```bash
bun run dev
```

Key paths:

- `app/[[...slug]]/page.tsx`: docs pages at root.
- `app/api/search/route.ts`: search index endpoint.
- `lib/source.ts`: Fumadocs source loader.
