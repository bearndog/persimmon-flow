# Persimmon Factory demo v0.2 handoff

This is a browser-only demonstration build. It deliberately keeps the **Demo: view as…** selector and local browser storage. It does not add Supabase or real authentication.

## What changed

- Added a versioned `epf.db.v2` local database and migration from `epf.db.v1`.
- Preserved custom character images when the app reloads.
- Added private per-user activity notifications and a Bulu Inbox.
- Added staged assignment requests. Selecting a recipient no longer moves the task immediately.
- Added assignment responses with real effects for clarification, rejection, in-progress and done.
- Unified requested and ordinary tasks on the Factory Floor so filters apply once.
- Added saved holding notes and a separate organised-package form.
- Added editable projects and categories; used items are archived instead of deleted.
- Separated checklist steps from splitting a task into linked child packages.
- Added actionable support requests with a helper, details, time and acceptance flow.
- Added visible mood/check-in information and the requested Mike/Mum/Dad/Partner access matrix.
- Added reminder permissions, disabled reminders when off, and inbox replies to pings.
- Added a Character Workshop for custom drawings saved in this browser.
- Added an English / Traditional Chinese (Hong Kong) interface switch.
- Added confirmation before resetting demo data and before shipping with unfinished steps.

## Files added

- `src/lib/pf/i18n.ts`
- `src/components/pf/BuluInbox.tsx`
- `src/components/pf/CharacterWorkshop.tsx`

## Main files replaced or updated

- `src/lib/pf/types.ts`
- `src/lib/pf/seed.ts`
- `src/lib/pf/store.tsx`
- `src/components/pf/AppShell.tsx`
- `src/components/pf/TaskCard.tsx`
- `src/routes/index.tsx`
- `src/routes/sorting.tsx`
- `src/routes/floor.tsx`
- `src/routes/harvest.tsx`

## Verification completed

- Production build: passed.
- TypeScript `--noEmit`: passed.
- ESLint for every changed file: no errors (the store retains the repository's existing Fast Refresh warnings because it exports shared helpers and the provider from one file).
- Local development server: returned HTTP 200 and rendered the application title.

## Put this version on GitHub safely

1. In GitHub, create a branch named `codex/demo-v0.2` from `main`.
2. Clone the repository with GitHub Desktop, or open it in GitHub Codespaces.
3. Copy the files from the supplied source zip over the matching repository files.
4. Do not upload `node_modules`, `.output`, or `.wrangler` folders. They are not included in the supplied zip.
5. Commit with the message `Build browser-only demo v0.2`.
6. Push the `codex/demo-v0.2` branch.
7. Use the repository's existing Lovable preview for branch testing. If you want Vercel, configure and verify the TanStack/Nitro deployment target as a separate hosting step; this repository currently builds with Lovable's default Cloudflare target.
8. Test the demonstration journey below before merging into `main`.

Do not force-push, rebase or rewrite published history because the repository is connected to Lovable.

## Demonstration journey

1. View as Mike and save a holding note.
2. Split it into several packages.
3. Sort one into a new project and category.
4. Request Dad to handle it, including why, load, deadline and reminder permission.
5. Switch to Dad and open Bulu Inbox.
6. Ask for clarification; switch to Mike and reply in the Inbox.
7. Switch to Dad, accept by choosing In Progress, then check in as Teddi.
8. Ask Mike for body doubling; switch to Mike and accept in the Inbox.
9. Split the package into smaller linked tasks and complete one.
10. Switch to Mike to see the completion notification.
11. Send appreciation and a permitted Bulu reminder from Harvest.
12. Switch to Traditional Chinese.
13. Open Character Workshop and replace one drawing.
14. Switch through all four users to confirm the privacy/access boundaries.

## Still intentionally deferred

- Real accounts, passwords and account deletion.
- Cross-device synchronization.
- Server-side image storage.
- Push/email notifications.
- Supabase database and Row Level Security.
- App Store packaging.
- Automated browser interaction tests (the build, type-check, lint and HTTP smoke test pass; the demonstration journey still needs a human click-through).

Those belong to the next backend phase after this demo has been tested with people.
