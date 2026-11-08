# Evangel Daily Meal

A responsive devotional and Sunday School reading app for Assemblies of God members. Readings are stored as dated Markdown files in GitHub and displayed on the public site. The private admin CMS provides a visual editor for creating and updating that content.

## Features

- Home page with today's available reading, weekly archive, and week filter.
- A detail page for each daily reading or Sunday School lesson.
- Private `/admin` content studio with title, date, category, a rich text body editor, preview, and optional reading details.
- One-click publishing to the repository's `content/readings/` folder.
- Optional browser push alerts for newly added readings.
- Responsive layout for phones, tablets, and desktop screens.

## Run locally

Requirements: Node.js 20.9 or newer and npm.

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). To run a production build locally:

```bash
npm run build
npm run start
```

## Admin CMS setup

The CMS is at `/admin`. It uses an admin password and a signed, HTTP-only session cookie. GitHub credentials are used only by the server when a reading is published.

1. Copy `.env.example` to `.env.local` for local use.
2. Set `ADMIN_PASSWORD` to a strong, private password.
3. Generate a separate random session secret and set it as `ADMIN_SESSION_SECRET`:

   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
   ```

4. Create a GitHub fine-grained personal access token restricted to this repository, with **Contents: Read and write** permission. Set `GITHUB_TOKEN`, `GITHUB_OWNER`, `GITHUB_REPO`, and `GITHUB_BRANCH`.
5. Add those values to Vercel under **Project → Settings → Environment Variables**, then redeploy.
6. Open `https://your-site.example/admin` and sign in with `ADMIN_PASSWORD`.

Keep `.env.local`, `ADMIN_PASSWORD`, `ADMIN_SESSION_SECRET`, and `GITHUB_TOKEN` private. Do not add them to client-side variables or commit them to GitHub. The admin session expires after eight hours. Set the same admin and GitHub values in Vercel as in local development, using a strong production password.

## Create or edit a reading

1. Sign in at `/admin`.
2. Choose **+** to create a reading or select one from the list to edit it.
3. Enter the title, date, and category. Write the body in the visual editor. Use the toolbar for headings, bold, italic, lists, quotes, and links. Switch to **Preview** to see the rendered Markdown.
4. Add optional details if needed. For Sunday School, enter the memory verse and its reference; the listing scripture is taken from that memory verse reference.
5. Choose **Publish reading** or **Save changes**.

The CMS converts rich text formatting to Markdown and saves each reading as its own file, such as `content/readings/2026-11-08--prayer-and-trust-a1b2c3d4.md`. You can publish multiple readings on the same date, including multiple readings in one category. Choose a reading from the list to edit that specific entry. Publishing commits the Markdown file to the configured GitHub branch. Vercel deploys the commit and the reading appears on the site after deployment succeeds.

The form checks only the basics needed to create a reading file: a valid date, a category, a title, and body content. It does not require the devotional or lesson to follow a rigid section template. The production build separately confirms the dated filename and front matter are valid.

## Reading files

Each reading is a Markdown file in `content/readings/`. Name files `YYYY-MM-DD.md` for a single legacy reading or `YYYY-MM-DD--unique-name.md` when a date has multiple readings. The date in front matter must match the date prefix in the filename. The CMS writes front matter for the date, category, title, and optional fields, then stores the formatted body below it. `content/readings/TEMPLATE.md` is available as a reference. You can still add or edit Markdown files directly in GitHub; the site reads all valid reading files from this folder. The archive can be filtered by week and category.

Example:

```markdown
---
date: "2026-11-08"
type: "sunday-school"
topic: "JESUS LIFTED UP"
keyVerse: "As Moses lifted up the serpent in the wilderness."
keyVerseReference: "John 3:14"
scripture: "John 3:14"
---

## Lesson Outline

Write the lesson here with **bold**, *italic*, lists, quotes, and headings.
```

Sunday School archive cards always display `keyVerseReference` as their scripture. Daily reading cards display the `scripture` field.

## Push notifications

Readers can opt in to new-reading alerts from the prompt on the home page. Each browser or device has its own subscription. A new dated Markdown file committed to the production branch triggers the GitHub Actions workflow. Updates to existing files do not send another alert.

1. Add a Postgres database through Vercel Marketplace (Neon is supported) and set `DATABASE_URL`. The app creates its subscriptions table automatically.
2. Generate a VAPID key pair:

   ```bash
   npm run push:keys
   ```

3. Add `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, and `VAPID_SUBJECT` to Vercel. Keep the private key secret. The app serves the public key to browsers through `/api/push/config`, so it does not need a `NEXT_PUBLIC_` prefix.
4. Set `APP_URL` to the deployed HTTPS URL and configure a strong `PUSH_WEBHOOK_SECRET` in Vercel.
5. In GitHub, open **Settings → Secrets and variables → Actions** and add `PUSH_NOTIFY_URL` (the deployed site URL) and `PUSH_WEBHOOK_SECRET` (the same secret configured in Vercel).
6. The workflow watches `master` by default. If your production branch has another name, update `.github/workflows/notify-new-readings.yml`.

On iPhone and iPad, users need to add the site to their Home Screen and open it from there before enabling push notifications. For delivery problems, check the GitHub Actions run and Vercel function logs.

## Environment variables

| Variable | Purpose |
| --- | --- |
| `ADMIN_PASSWORD` | Password for the `/admin` CMS |
| `ADMIN_SESSION_SECRET` | Signs admin session cookies |
| `GITHUB_TOKEN` | Allows the server to create and update reading files |
| `GITHUB_OWNER`, `GITHUB_REPO`, `GITHUB_BRANCH` | Repository destination for reading files |
| `APP_URL` | Deployed HTTPS site URL used in push notification links |
| `DATABASE_URL` | Postgres connection for push subscriptions |
| `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` | Browser push notification configuration |
| `PUSH_WEBHOOK_SECRET` | Protects the endpoint called by GitHub Actions |

## Useful commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the local development server |
| `npm run build` | Validate reading files and build for production |
| `npm run start` | Run the production build locally |
| `npm run lint` | Run ESLint |
| `npm run content:check` | Validate dated Markdown reading files |
| `npm run push:keys` | Generate a VAPID key pair |

## Project structure

```text
content/readings/       Dated Markdown reading files
public/                 Logo, icons, and service worker
scripts/                Content and push setup utilities
src/app/admin/           Admin CMS page
src/app/api/admin/       Protected admin sign-in and publishing routes
src/app/reading/         Reading detail page
src/components/          Shared UI and admin editor components
src/data/                Reading file loading and parsing
src/lib/                 Date, admin-session, and push utilities
.github/workflows/       New-reading notification workflow
```

## Branding

The app uses the Assemblies of God logo at `public/ag-logo.png`. Replace it to update the splash screen and navigation. The primary accent is `#FDCA40`, paired with navy and warm cream.
