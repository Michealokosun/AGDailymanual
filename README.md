# Evangel Daily Meal

A responsive Next.js app for weekly daily devotionals and Sunday School lessons.

## Start the app

Install Node.js 20.9 or newer and npm. From the project folder, install dependencies and run the development server:

```bash
npm install
npm run dev
```

Open `http://localhost:3000` in a browser. Use `npm run build` to make a production build and `npm run start` to run it.

## Add or update readings

Store readings in `content/readings/`, one Markdown file per date. The filename and front matter date must match, using `YYYY-MM-DD.md`. For example, `content/readings/2026-11-08.md` is that Sunday's Sunday School lesson.

1. Copy `content/readings/TEMPLATE.md`.
2. Rename the copy to the reading date, such as `2026-11-09.md`.
3. Fill in its YAML front matter. Set `type` to `daily` or `sunday-school` and enter the topic, Bible reference, and any available devotional fields. Sunday School lessons can also include `unit`, `lessonNumber`, `centralTruth`, and a `learningObjectives` list.
4. Write the message or lesson below the closing `---`. Use blank lines between paragraphs. Markdown headings and lists work for sections such as discussion questions.
5. Commit and push the file to GitHub. With the repository connected to Vercel, a push creates a deployment; merging into the production branch (usually `main`) publishes it to the live site after the deployment succeeds.

The Home page automatically reads all dated files and offers a weekly filter using the Africa/Lagos calendar. Sunday School readings are labeled. If there is no file for a date, the app shows “coming soon.” `npm run content:check` verifies filenames and required front matter. This check also runs automatically before a production build, so malformed readings fail the deployment instead of silently going live.

The supplied Thursday, November 5, 2026 devotional and Sunday, November 1, 2026 Sunday School lesson are in `content/readings/2026-11-05.md` and `content/readings/2026-11-01.md`.

## Add readings from Telegram

The Telegram webhook accepts daily readings in the Evangel Daily Meal format and Sunday School lessons in the Adult Teacher format. It converts them to the existing Markdown front matter, rejects invalid dates and duplicate files, then creates the file in GitHub. A GitHub commit triggers a Vercel deployment when the repository is connected. The webhook does not overwrite an existing reading.

### Telegram and GitHub setup

1. Create a bot with [@BotFather](https://t.me/BotFather), send `/setcommands`, select the bot, and enter `publish - Publish a devotional or Sunday School lesson`. Add it as an administrator in a private Telegram group used for reading submissions. The bot needs to receive messages; it does not need other group administration permissions. The endpoint still accepts submissions only from the configured group and user IDs.
2. Create a GitHub fine-grained personal access token for this repository with **Contents: Read and write** permission. The bot uses GitHub's repository contents API to create one dated Markdown file.
3. Copy `.env.example` to `.env.local` and fill in the bot token. Add the bot to the private group, send it a message there, and run `npm run telegram:ids`. This prints the numeric chat and sender IDs without printing message text. Put the group ID in `TELEGRAM_ALLOWED_CHAT_ID` and only approved sender IDs in `TELEGRAM_ALLOWED_USER_IDS` (comma-separated if there is more than one). The script reads `.env.local` directly.
4. Set `GITHUB_TOKEN`, `GITHUB_OWNER`, `GITHUB_REPO`, and `GITHUB_BRANCH` in `.env.local`. Use the branch connected to Vercel for production, normally `main`.
5. Deploy the app to Vercel. In **Project → Settings → Environment Variables**, add `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET`, `TELEGRAM_ALLOWED_CHAT_ID`, `TELEGRAM_ALLOWED_USER_IDS`, `GITHUB_TOKEN`, `GITHUB_OWNER`, `GITHUB_REPO`, and `GITHUB_BRANCH`. Use a random webhook secret made only from letters, numbers, `_`, and `-`. Redeploy after adding the variables.
6. Set `APP_URL` in `.env.local` to the deployed HTTPS URL, such as `https://your-app.vercel.app`, then run `npm run telegram:webhook` once to register the Telegram webhook. Do not share or commit `.env.local` or any tokens.

To submit a short reading, send `/publish` followed by the complete reading text in the group. For a long Sunday School lesson, attach a UTF-8 `.txt` file and put `/publish` in the caption. `/reading` remains a supported alias. Use the date line, topic, and section labels from the supplied examples. Telegram replies with whether the reading was saved; the commit then deploys through Vercel. Sending `/publish` is the publish action, so check the reading before sending. If a file for that date already exists, the bot reports the duplicate and leaves it unchanged.

The webhook endpoint is `POST /api/telegram/webhook`. It verifies Telegram's secret header and checks the configured group and sender IDs before processing a message. `npm run telegram:ids` must be run before registering the webhook because Telegram's `getUpdates` and webhook delivery cannot be used at the same time.

## Push notifications for new readings

On a reader's first Home page visit, an in-app consent prompt asks whether they want new-reading alerts. The browser's system permission request appears only after they tap **Allow notifications**. The app stores each push subscription in Postgres. GitHub Actions sends the topic and reading link when a new dated Markdown file is added to the production branch, including readings published through Telegram. Expired subscriptions are removed automatically. Push is opt-in per browser/device.

1. In Vercel, open **Storage → Marketplace** and add a Postgres provider such as Neon to this project. The integration provides a `DATABASE_URL` environment variable. The app creates its `push_subscriptions` table automatically the first time it stores a subscription.
2. Generate a VAPID key pair with `npm run push:keys`. Add `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, and `VAPID_SUBJECT` to Vercel. Use a real contact for the subject, such as `mailto:you@example.com`.
3. Set `APP_URL` to the deployed HTTPS site URL and create a strong random `PUSH_WEBHOOK_SECRET`. Add the database and push values to `.env.local` for local development. `.env.example` shows the variable names; never commit private keys or `.env.local`.
4. In GitHub, open **Settings → Secrets and variables → Actions** and add repository secrets `PUSH_NOTIFY_URL` (the deployed app URL) and `PUSH_WEBHOOK_SECRET` (the same secret as in Vercel). The included workflow watches `main` for newly added dated Markdown files in `content/readings/`, including files created by Telegram. If your production branch is not `main`, update the workflow branch filter.
5. Redeploy after adding the Vercel environment variables. On first visit to the Home page, readers can accept the in-app consent prompt and then the browser permission prompt. On iPhone/iPad, users need to add the site to their Home Screen before enabling push notifications.

The VAPID public key is exposed to the browser for subscription setup; keep `VAPID_PRIVATE_KEY` and `PUSH_WEBHOOK_SECRET` secret. The notification endpoint accepts requests only from GitHub Actions with that secret. If push delivery fails, check the GitHub Actions run and Vercel function logs.

## Brand asset

Replace `public/ag-logo.png` to update the logo used on the splash screen and navigation. `#FDCA40` is the primary accent, paired with navy, cream, and muted gold colors in `src/app/globals.css`.
