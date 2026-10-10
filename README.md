# date

A swipe-style dating app with exactly one profile.

## Prerequisites
- Node 26 (see `.nvmrc`)

## Quick Start
1. `npm install`
2. `npm run dev`

## Deploy
Pushes to `main` build with Vite and deploy to GitHub Pages via [.github/workflows/deploy.yml](.github/workflows/deploy.yml). Custom domain: `shy.date` ([public/CNAME](public/CNAME)).

## Match Form (Cloudflare Worker)
Liking a card opens an "It's a Match!" form. Submissions POST to `shy.date/api/match`, handled by [worker/](worker/), which emails them (photo attached) via Cloudflare Email Routing.

One-time setup:
1. Cloudflare → shy.date → Email → Email Routing: enable it, add your destination address, click the verification link
2. `cd worker && npm install && npx wrangler login`
3. `npx wrangler secret put MATCH_TO` (your verified address)
4. `npx wrangler deploy`

Local dev: run `npm run dev` in `worker/` (port 8787) alongside `npm run dev` at the root; Vite proxies `/api`. Emails are written to `worker/.wrangler/tmp/email/` instead of sent. Put `MATCH_TO=...` in `worker/.dev.vars`.

## Key Files
- [src/main.js](src/main.js) - Swipe/button handling (Pointer Events)
- [src/match.js](src/match.js) - Match overlay and form submission
- [worker/src/index.js](worker/src/index.js) - Form endpoint that sends the email
- [src/data.json](src/data.json) - Profile cards
- [public/images](public/images) - Card photos
