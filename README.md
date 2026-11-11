# Evangel Daily Meal

A responsive devotional and Sunday School reading app for Assemblies of God members. Readings are stored in Postgres and loaded directly from the database. The private `/admin` CMS lets authorized editors create and update readings.

## Features

- Home page highlighting today's reading and listing the reading archive.
- Individual detail pages for every reading.
- Archive filters for week and category.
- Admin CMS with rich text editing, formatting, undo/redo, and preview.
- Multiple readings per day, including multiple readings in the same category.
- Optional browser push notifications for newly published readings.

## Run locally

Requirements: Node.js 20.9 or newer and npm.

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Database setup

Create a Postgres database through Vercel Marketplace (Neon is supported), then set `DATABASE_URL` in Vercel and `.env.local`. The app creates the `readings` and `push_subscriptions` tables automatically when needed.

If you already have Markdown readings under `content/readings/`, import them once by setting the same database connection in `.env.local` and running:

```bash
npm run content:import
```

The importer skips readings already present. After import, the public site reads directly from Postgres. Markdown files remain as backup copies and are not automatically synchronized.

## Admin CMS

Set `ADMIN_PASSWORD` and `ADMIN_SESSION_SECRET` in `.env.local` and Vercel. Generate a session secret with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

Open `/admin`, sign in, and enter the title, date, category, and body. Optional fields support devotional and Sunday School details. Publishing writes directly to the database; the homepage and reading pages can show the new content without a new deployment. Each reading has a unique ID, so several readings can share the same date.

Keep `.env.local`, `ADMIN_PASSWORD`, and `ADMIN_SESSION_SECRET` private. Do not commit them or expose them in browser-side variables. Admin sessions expire after eight hours.

## Push notifications

Readers can opt into alerts from the prompt on the home page. Each browser or device has its own subscription. When a new reading is published, the app sends a push alert if push credentials are configured. Updating an existing reading does not send a new alert.

1. Set `DATABASE_URL` so the app can store device subscriptions.
2. Generate VAPID keys with `npm run push:keys`.
3. Set `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, and `VAPID_SUBJECT` in Vercel. Keep the private key secret.
4. Set `APP_URL` to the deployed HTTPS site address.

On iPhone and iPad, users need to add the site to their Home Screen and open it from there before enabling push notifications.

## Environment variables

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` or `POSTGRES_URL` | Postgres connection for readings and push subscriptions |
| `ADMIN_PASSWORD` | Password for the `/admin` CMS |
| `ADMIN_SESSION_SECRET` | Signs admin session cookies |
| `APP_URL` | Deployed HTTPS site URL used in push notification links |
| `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` | Browser push notification configuration |

## Useful commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm run build` | Validate legacy Markdown and build for production |
| `npm run start` | Run a production build locally |
| `npm run lint` | Run ESLint |
| `npm run content:check` | Validate legacy Markdown readings |
| `npm run content:import` | Import legacy Markdown readings to Postgres |
| `npm run push:keys` | Generate VAPID keys |

## Project structure

```text
content/readings/       Legacy Markdown files for import and backup
scripts/                Content import and validation utilities
src/app/admin/          Admin CMS page
src/app/api/admin/      Protected admin routes
src/app/reading/        Reading detail page
src/components/         Shared UI and admin editor
src/data/               Database-backed reading data functions
src/lib/                Database, date, session, and push utilities
```

## Branding

The Assemblies of God logo is at `public/ag-logo.png`. The primary accent is `#FDCA40`, paired with navy and warm cream.
