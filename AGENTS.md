# Datafrica - Agent Rules

## Project Overview
- **Stack**: Next.js 16 (App Router) + Firebase (Auth, Firestore, Storage, App Hosting) + KKiaPay/PayDunya
- **Languages**: TypeScript, Tailwind CSS
- **i18n**: 5 locales (en, fr, pt, es, ar) in `src/locales/`
- **Admin**: Protected under `src/app/admin/` with AdminGuard

## Build & Lint Commands
- **Build**: `npm run build`
- **Lint**: `npm run lint`
- **Dev server**: `npm run dev`
- **Deploy hosting**: `firebase deploy --only hosting`

## Session Efficiency (Memory Optimization)
To avoid excessive memory consumption during sessions:

1. **Keep sessions focused** - Handle one feature or bug fix per session when possible. Avoid combining unrelated large tasks in a single session.
2. **Minimize sub-agent usage** - Only use Task/sub-agents when truly needed (complex multi-file searches, code reviews). Prefer direct tool calls (Read, Grep, Glob) for simple lookups.
3. **Avoid reading entire large files unnecessarily** - Use `offset` and `limit` parameters when only a specific section is needed. Use Grep to find relevant lines first.
4. **Don't re-read files already in context** - If a file was recently read in the same session, work from memory instead of reading it again.
5. **Batch related edits** - When making multiple edits to the same file, plan all changes first, then execute them together rather than reading the file between each edit.
6. **Clean up background processes** - After running builds, dev servers, or deploys, ensure background processes are terminated when no longer needed.

## Code Conventions
- Use `"use client"` directive only when the component needs client-side features (hooks, event handlers, browser APIs).
- All API routes under `src/app/api/` use Firebase Admin SDK (initialized in `src/lib/firebase-admin.ts`).
- Client-side Firebase is in `src/lib/firebase.ts`.
- Auth logic is in `src/hooks/use-auth.tsx`.
- All user-facing strings must be translated in all 5 locale files.
- Use shadcn/ui components from `src/components/ui/`.
- Theme support: dark/light mode via `next-themes`.

## Firebase Architecture
- **App Hosting** (primary): Auto-deploys from GitHub, serves at `datafrica--mydatafrica.europe-west4.hosted.app`
- **Firebase Hosting** (`mydatafrica.web.app`): Configured as transparent proxy (Cloud Run rewrite) to App Hosting service `datafrica` in `europe-west4`
- **Firestore**: Collections: `users`, `datasets`, `purchases`
- **Storage**: Dataset files in `datasets/` bucket path
- **Auth**: Google Sign-In + Email/Password

## Testing
- Always run `npm run build` after changes to verify no type errors or build failures.
- Check the browser console and network tab for runtime errors after deploying.
