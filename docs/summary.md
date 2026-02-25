# Drivebase App Summary

## What it is
Drivebase is a cloud-agnostic file management app that lets users organize and access files from multiple storage providers in one unified folder structure. It also includes Vault (encrypted uploads) and Smart Uploads (rule-based routing) to reduce provider lock-in.

## Who it's for
- Primary persona: **Not found in repo**.
- Closest repo-supported audience: users who manage files across multiple cloud providers and want centralized control.

## What it does
- Connects multiple storage providers (S3, Local, Google Drive, Dropbox, FTP, WebDAV, Telegram, Nextcloud, Darkibox).
- Provides a unified file/folder workspace across providers.
- Supports encrypted Vault uploads and isolated vault file access paths.
- Supports rule-based Smart Upload behavior.
- Supports chunked uploads with session restore, queue processing, cancel, and retry flows.
- Provides background jobs for upload/sync/transfer/analysis via BullMQ workers.
- Includes optional AI processing/search pipeline with inference service integration.

## How it works (repo-based architecture)
- **Web client (`apps/web`)**: React + TanStack Router + URQL client; sends GraphQL operations and uses feature modules (files, providers, vault, rules, settings).
- **API (`apps/api`)**: Bun runtime with Hono routing + GraphQL Yoga at `/graphql`; mounts core and provider plugin routes.
- **Business layer**: service modules handle auth, files/folders, providers, workspaces, vault, rules, exports, and AI settings/jobs.
- **Async workers**: upload/sync/transfer/analysis workers process queued jobs.
- **Data layer**: Postgres stores app/domain and AI artifacts; Redis backs queue/session/cache/rate-limit behaviors.
- **Provider integrations**: provider packages are mounted as plugins and can expose routes.
- **Optional AI service**: separate `ai-inference` service exposes embed/OCR/object detection/model endpoints; API orchestrates jobs and persistence.

## How to run (minimal getting started)
1. Recommended quickstart:
   - `curl -fsSL https://drivebase.io/install | bash`
   - Open `http://localhost:3000`
   - Default login: `admin@drivebase.local` / `admin123`
2. Manual local dev:
   - `cp .env.example .env.local`
   - `bun install`
   - Ensure Postgres and Redis are running
   - `bun run dev`
   - App: `http://localhost:3000`, GraphQL: `http://localhost:4000/graphql`
