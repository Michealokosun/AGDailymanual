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

The Home page automatically reads the current Monday–Sunday week using the Africa/Lagos calendar and shows each matching file. Sunday is labeled Sunday School. If there is no file for a date, the app shows “coming soon.” `npm run content:check` verifies filenames and required front matter. This check also runs automatically before a production build, so malformed readings fail the deployment instead of silently going live.

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

## Brand asset

Replace `public/ag-logo.png` to update the logo used on the splash screen and navigation. `#FDCA40` is the primary accent, paired with navy, cream, and muted gold colors in `src/app/globals.css`.
