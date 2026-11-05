import Link from "next/link";
import { ReadingArchive } from "@/components/ReadingArchive";
import { PushNotificationPrompt } from "@/components/PushNotificationPrompt";
import { getAllReadings, getReading } from "@/data/readings";
import { currentWeek, dateLabel, lagosToday } from "@/lib/dates";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const today = lagosToday();
  const days = currentWeek(today);
  const allReadings = await getAllReadings();
  const todayReading = await getReading(today);
  const todayDay = days.find((day) => day.date === today)!;

  return (
    <div className="home-page">
      <PushNotificationPrompt />
      <section className="welcome-row">
        <div>
          <p className="overline">YOUR WEEK IN THE WORD</p>
          <h1>
            Good day. <span>Grow in the Word.</span>
          </h1>
          <p className="welcome-copy">
            A moment with Scripture can shape the whole day.
          </p>
        </div>
        <div className="week-date">
          <span className="week-date__icon">◷</span>
          <span>
            This week
            <br />
            <strong>
              {dateLabel(days[0].date, { month: "short", day: "numeric" })} –{" "}
              {dateLabel(days[6].date, { month: "short", day: "numeric" })}
            </strong>
          </span>
        </div>
      </section>

      <section className="today-banner" aria-labelledby="today-heading">
        <div className="today-banner__ornament" aria-hidden="true">
          ✦
        </div>
        <div className="today-banner__content">
          <div className="today-banner__label">
            <span className="today-banner__spark">✦</span>{" "}
            {todayReading.kind === "sunday-school"
              ? "TODAY’S SUNDAY SCHOOL"
              : "TODAY’S READING"}{" "}
            <span className="today-banner__divider" />{" "}
            {todayDay.weekday.toUpperCase()},{" "}
            {dateLabel(today, { month: "long", day: "numeric" }).toUpperCase()}
          </div>
          {todayReading.available ? (
            <>
              <p className="today-banner__theme">
                {todayReading.annualTheme}{" "}
                <span>· {todayReading.annualThemeReference}</span>
              </p>
              <h2 id="today-heading">{todayReading.topic}</h2>
              <p className="today-banner__scripture">
                {todayReading.scripture}
              </p>
              <Link className="button button--gold" href={`/reading/${today}`}>
                Read today’s devotional <span aria-hidden="true">→</span>
              </Link>
            </>
          ) : (
            <>
              <p className="today-banner__theme">
                Make room for a moment in the Word
              </p>
              <h2 id="today-heading">Today’s devotional is coming soon</h2>
              <p className="today-banner__scripture">
                We’ll add the reading here as soon as it’s available.
              </p>
              <Link className="button button--gold" href={`/reading/${today}`}>
                View today’s page <span aria-hidden="true">→</span>
              </Link>
            </>
          )}
        </div>
        <div className="banner-cross" aria-hidden="true">
          <span />
          <i />
        </div>
        <div className="banner-caption">A DAILY MOMENT WITH GOD</div>
      </section>

      <section
        className="week-section"
        id="this-week"
        aria-labelledby="week-heading"
      >
        <ReadingArchive readings={allReadings} today={today} />
      </section>

      <footer className="page-footer">
        <span>“Your word is a lamp for my feet.”</span>
        <span>Psalm 119:105</span>
      </footer>
    </div>
  );
}
