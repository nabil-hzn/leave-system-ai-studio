# Leave Calendar

Google-Calendar-style leave request system with Month/Week/Day views, morning/afternoon/night shifts, and a pending → approved/rejected workflow. At most one **approved** leave per shift per day is allowed; unlimited pending requests can coexist.

## Current mode: dummy data (no backend needed)

`client/src/api.ts` currently reads/writes an in-memory store (`client/src/mockData.ts`) instead of calling a server — the approval-conflict rule runs client-side there, with the same logic as `server/src/routes/leaves.ts`. Data resets on page reload.

```
npm install
npm run dev
```

Opens the Vite dev server at http://localhost:5173. No server process needed in this mode.

Use the **Requester/Approver** toggle in the header to switch roles, and the adjacent dropdown to pick which demo user you're "acting as". As Requester you can create/withdraw your own pending requests; as Approver you can approve/reject any pending request (approving a second request for an already-approved shift/date is blocked with an explanation).

## Switching to the real backend later

The Express + SQLite API already exists in `server/` (see `server/src/routes/leaves.ts` for the same business rule, enforced server-side against a real database). To wire the client back up to it:

1. In `client/src/api.ts`, replace each hook's `queryFn`/`mutationFn` body with a `fetch("/api/...")` call (this is exactly what was there before dummy-data mode — see git history if you want the previous version verbatim).
2. Run `npm run dev:full` instead of `npm run dev` to start both the API (port 4000) and the client (port 5173, proxying `/api` to the server).

## Production build

```
npm run build
npm start
```

Serves the built client from the Express server on port 4000 (only meaningful once the client is wired back up to the real API).
