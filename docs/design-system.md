# Drivebase Design System

This document outlines the core design principles and UI conventions used across the Drivebase ecosystem (Web app, Landing page, and Documentation).

## Core Principles

1.  **Minimalist & Functional:** Prioritize utility and clarity over decorative elements.
2.  **Brutalist Aesthetic:** Use sharp edges, consistent borders, and a structured grid system.
3.  **Real-time Feedback:** Ensure all user actions provide immediate visual confirmation.
4.  **Consistency:** Maintain the same layout patterns across all platforms (Dashboard, Files, Settings).

## Visual Identity

### Typography
- **Primary Font:** Inter (Sans-serif)
- **Monospace Font:** JetBrains Mono (for code, IDs, and versions)

### Color Palette
We use CSS variables to support light and dark modes (defaulting to dark).
- `--background`: Primary background (`#050505`)
- `--foreground`: Primary text (`#FFFFFF`)
- `--muted-foreground`: Secondary/Helper text (`#A1A1AA`)
- `--primary`: Brand color/Action items
- `--border`: Standard border color (`#27272A`)
- `--destructive`: Error/Danger states

### Borders & Radius
- **Border Width:** `1px`
- **Border Radius:** `0px` (Squared edges strictly enforced)
- **Grid Layout:** Frequent use of `border-x`, `border-y`, and `divide-border` to create a structured, tabular feel.

## Layout Patterns

### 1. The Container
The standard maximum width for content is `max-w-7xl` (`1280px`). This is often combined with `mx-auto` and `border-x border-border`.

### 2. Grid Sections
Used for features, blog listings, and roadmap items.
```tsx
<div className="grid md:grid-cols-3 border-y border-border divide-x divide-border">
  {/* Items here */}
</div>
```

### 3. Labels & Status
Small uppercase labels with a status indicator (dot).
- **Label Text:** `text-sm font-medium`
- **Dot:** `w-2 h-2 bg-primary`

## Component Guidelines

### Buttons
- Squared edges.
- High contrast for primary actions.
- Subtle background changes for hover states (`hover:bg-secondary/50`).

### Tables (File Browser)
- Use `@tanstack/react-table`.
- Fixed-width columns for selection and actions.
- Right-aligned action menus.

### Cards
- No shadows.
- Thin borders (`border border-border`).
- Background transitions on hover.

## Icons
- **Library:** Lucide React
- **Stroke Width:** `2px`
- **Size:** Typically `size-4` (16px) for inline text or `size-8` (32px) for hero features.

## Accessibility
- Maintain a contrast ratio of at least 4.5:1 for text.
- Focus states must be visible.
- Semantic HTML (main, section, article, nav) is mandatory.
