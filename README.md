# Evangel Daily Meal

A responsive devotional and Sunday School reading app for Assemblies of God members. It brings daily readings and Sunday School lessons together in one place, so members can read today's message or find past readings without searching through a busy WhatsApp chat.

## What the app does

- Highlights today's available reading on the home page and lists published readings from `content/readings/`.
- Organizes the archive by week and provides an empty state when there are no readings for the selected week.
- Gives every reading its own page, with the full devotional or Sunday School lesson.
- Accepts reading submissions from an approved Telegram group and saves each as a dated Markdown file in GitHub.
- Offers optional browser push notifications when a new reading is published.
- Adapts to mobile and desktop screens.

## Run locally

Requirements: Node.js 20.9 or newer and npm.

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). To create and run a production build:

```bash
npm run build
npm run start
```

## Manage readings with Markdown

Each reading lives in its own file in `content/readings/`. Use the date as the filename, in `YYYY-MM-DD.md` format, and make the `date` in the front matter match it. The app automatically includes valid dated Markdown readings in the archive.

1. Copy `content/readings/TEMPLATE.md`.
2. Save the copy as the reading date, for example `content/readings/2026-11-08.md`.
3. Set `type` to `daily` or `sunday-school`, then fill in the topic, scripture reference, and other relevant fields.
4. Add the message or lesson after the closing `---`. Markdown headings, paragraphs, and lists are supported.
5. Check the file and publish it to the production branch in GitHub. Vercel deploys the change when the deployment succeeds.

Example front matter:

```yaml
---
date: "2026-11-08"
type: sunday-school
topic: "The lesson topic"
scripture: "John 5:1–9"
keyVerse: "I praise you because I am fearfully and wonderfully made."
keyVerseReference: "Psalm 139:14"
translation: NIV
unit: "Unit 3 — Unit title"
lessonNumber: "Lesson 18"
centralTruth: "The central truth of the lesson."
learningObjectives:
  - "First objective"
  - "Second objective"
---

Write the complete lesson here.
```

Only the `date`, `type`, `topic`, and body are required by the content check. Use the remaining fields as appropriate. Sunday School lessons can include `unit`, `lessonNumber`, `centralTruth`, and `learningObjectives`. Run the validator before committing:

```bash
npm run content:check
```

The production build also runs this check automatically. It catches invalid dates, filename/front matter mismatches, missing topics, unsupported types, and empty reading bodies.

## Publish from Telegram

An approved sender can post `/publish` followed by the complete reading in the configured Telegram group. For long Sunday School lessons, attach a UTF-8 `.txt` file and put `/publish` in the caption. The bot validates and converts the message to a dated Markdown file, commits it to the configured GitHub repository, and replies with the result. Existing readings are not overwritten. `/reading` is also accepted as an alias.

### Set up the bot

1. Create a bot with [@BotFather](https://t.me/BotFather). Use `/setcommands` to add `publish - Publish a devotional or Sunday School lesson`.
2. Add the bot to a private submission group. Configure the group ID and approved sender IDs so only authorized members can publish.
3. Create a GitHub fine-grained personal access token scoped to the repository with **Contents: Read and write** permission.
4. Copy `.env.example` to `.env.local` and fill in the Telegram and GitHub values listed below.
5. Send a message in the group, then run `npm run telegram:ids` to identify the numeric chat ID and sender ID. Set those values in `.env.local`.
6. Deploy to Vercel and add the same required environment variables under **Project → Settings → Environment Variables**. Set `APP_URL` to the deployed HTTPS URL and redeploy.
7. Register the webhook once from your local project:

   ```bash
   npm run telegram:webhook
   ```

The webhook endpoint is `POST /api/telegram/webhook`. Telegram delivers new messages to the deployed app; the app checks the webhook secret, allowed group, and approved sender IDs before it saves anything. Run `telegram:ids` before registering the webhook, since Telegram does not allow `getUpdates` polling and webhook delivery at the same time.

## Push notifications

Readers can opt in to new-reading alerts from the prompt on the home page. Each browser/device has its own subscription. When a dated Markdown file is added to the production branch, the included GitHub Actions workflow asks the app to notify subscribers. Telegram-published readings follow the same GitHub commit and deployment path.

1. Add a Postgres database through Vercel Marketplace (Neon is supported). Set `DATABASE_URL`; the app creates its subscriptions table when needed.
2. Generate VAPID keys locally:

   ```bash
   npm run push:keys
   ```

   Add `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, and `VAPID_SUBJECT` to Vercel. Keep the private key secret. The public key is served to the browser by `/api/push/config`, so it does not need a `NEXT_PUBLIC_` prefix.
3. Set `APP_URL` to the deployed HTTPS URL and set a strong `PUSH_WEBHOOK_SECRET` in Vercel.
4. In GitHub, open **Settings → Secrets and variables → Actions** and add `PUSH_NOTIFY_URL` (the deployed app URL) and `PUSH_WEBHOOK_SECRET` (the matching value).
5. The workflow watches the `main` branch by default. If the production branch has another name, update `.github/workflows/notify-new-readings.yml`.

On iPhone and iPad, users must add the site to their Home Screen and open it from there before enabling push notifications. Check the GitHub Actions run and Vercel function logs if delivery fails.

## Environment variables

See `.env.example` for the complete list. Set only the integrations you use; never commit `.env.local` or paste secrets into source files.

| Variable | Used for |
| --- | --- |
| `APP_URL` | Public HTTPS URL for webhook registration and reading links |
| `TELEGRAM_BOT_TOKEN` | Telegram bot authentication |
| `TELEGRAM_WEBHOOK_SECRET` | Verifies requests sent by Telegram |
| `TELEGRAM_ALLOWED_CHAT_ID` | The only group permitted to submit readings |
| `TELEGRAM_ALLOWED_USER_IDS` | Comma-separated list of approved Telegram sender IDs |
| `GITHUB_TOKEN` | Lets the bot commit reading files |
| `GITHUB_OWNER`, `GITHUB_REPO`, `GITHUB_BRANCH` | Destination repository and branch for readings |
| `DATABASE_URL` | Postgres connection for push subscriptions |
| `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` | Browser push notification configuration |
| `PUSH_WEBHOOK_SECRET` | Protects the endpoint called by GitHub Actions |

## Project structure

```text
content/readings/       Dated Markdown readings and the template
public/                 Logo, icons, and service worker
scripts/                Content checks and Telegram/push setup tools
src/app/                Next.js pages, styles, and API routes
src/components/         Shared interface components
src/data/               Reading file loading and parsing
src/lib/                 Date, Telegram, and push utilities
.github/workflows/      New-reading notification workflow
```

## Useful commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the local development server |
| `npm run build` | Validate content and build for production |
| `npm run start` | Run the production build locally |
| `npm run lint` | Run ESLint |
| `npm run content:check` | Validate reading filenames and required content |
| `npm run telegram:ids` | Inspect pending Telegram updates for IDs |
| `npm run telegram:webhook` | Register the deployed Telegram webhook |
| `npm run push:keys` | Generate a VAPID key pair |

## Branding

The app uses the Assemblies of God logo at `public/ag-logo.png`. Replace that asset to update the logo on the splash screen and navigation. The primary accent color is `#FDCA40`, paired with navy and warm cream.
