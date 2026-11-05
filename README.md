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

## Brand asset

Replace `public/ag-logo.png` to update the logo used on the splash screen and navigation. `#FDCA40` is the primary accent, paired with navy, cream, and muted gold colors in `src/app/globals.css`.
