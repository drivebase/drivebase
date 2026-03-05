---
name: frontend-ui
description: Design and implement Drivebase web UI features with consistent patterns from docs/design-system.md and existing app conventions.
---

## Overview

Use this skill when building or updating UI in `apps/web`.

Primary goal:
- Keep UI consistent with Drivebase design language and frontend architecture.

## Source of truth (read first)

1. `apps/web/src/styles.css` (theme tokens, typography, dark/light behavior)
2. Existing primitives in `apps/web/src/components/ui/*`
3. Feature patterns in `apps/web/src/features/*` and thin routes in `apps/web/src/routes/*`

If docs and live code diverge, match current implementation in `apps/web/src` and keep styling changes incremental.

## Non-negotiable rules

- Keep routes thin; domain logic lives in `features/*` hooks/services.
- Use shadcn/ui primitives from `components/ui/`; do not create new base UI components.
- Use Tailwind classes only (no inline custom CSS blocks).
- Use `cn()` for conditional class merging.
- Use CVA for variant-heavy reusable components.
- All user-facing strings must use Lingui (`Trans`, `msg`, etc.).
- For confirmations use `confirmDialog(...)` from `@/shared/lib/confirmDialog`.
- For prompts use `promptDialog(...)` from `@/shared/lib/promptDialog` when needed.
- Do not import raw confirm/prompt dialog primitives directly in feature components.

## Design patterns to preserve

- Minimal, functional layout with clear hierarchy.
- Structured border/grid usage (`border`, `divide-*`) and stable spacing.
- Reuse existing typography scale and color tokens from CSS variables.
- Keep interaction feedback explicit (loading, disabled, success/error states).
- Maintain table conventions (selection column, visibility toggle, right-aligned actions, stable toolbar while loading).
- Keep desktop/mobile behavior intentional; avoid layout shift and flicker.

## Implementation workflow

1. Identify affected domain and keep file placement aligned:
   - UI elements: `apps/web/src/features/<domain>/components/*`
   - Domain logic: `apps/web/src/features/<domain>/hooks/*`
   - Shared only if reusable: `apps/web/src/shared/*` or `apps/web/src/components/*`
2. Reuse existing primitives/variants before introducing new ones.
3. Add/adjust Lingui-wrapped strings.
4. Keep styles token-driven (prefer semantic classes over hardcoded color literals).
5. Verify responsive states, loading states, and empty/error states.

## Validation commands

```bash
bunx tsc --noEmit -p apps/web/tsconfig.json
```

If GraphQL documents changed:
```bash
cd apps/web && bun run codegen
```

If user-facing copy changed:
```bash
cd apps/web && bun run i18n:extract && bun run i18n:compile
```

## Output format for planning responses

- UI change summary
- Reused patterns/components
- Files to modify (exact paths)
- Accessibility + responsiveness notes
- Validation steps
- Approval checklist
