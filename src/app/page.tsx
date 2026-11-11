import Link from "next/link";
import { ReadingArchive } from "@/components/ReadingArchive";
import { getAllReadings, getReading } from "@/data/readings";
import { currentWeek, dateLabel, lagosToday } from "@/lib/dates";
import { siteDescription, siteName, siteUrl } from "@/lib/site";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Daily Bible Readings and Sunday School Lessons",
  description: siteDescription,
  alternates: { canonical: "/" },
};

function jsonLd(value: Record<string, unknown>): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

export default async function HomePage() {
  const today = lagosToday();
  const days = currentWeek(today);
  const allReadings = await getAllReadings();
  const todayReadings = allReadings.filter((reading) => reading.date === today);
  const isSunday = new Date(`${today}T12:00:00Z`).getUTCDay() === 0;
  const todayReading = isSunday
    ? todayReadings.find((reading) => reading.kind === "sunday-school") ?? {
      id: today, date: today, kind: "sunday-school" as const, title: "Sunday School", available: false,
    }
    : todayReadings.find((reading) => reading.kind === "daily") ?? await getReading(today);
  const todayDay = days.find((day) => day.date === today)!;

  return (
    <div className="home-page">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLd({
            "@context": "https://schema.org",
            "@type": "WebSite",
            name: siteName,
            url: siteUrl,
            description: siteDescription,
            inLanguage: "en",
            publisher: { "@type": "Organization", name: "Assemblies of God", logo: `${siteUrl}/ag-logo.png` },
          }),
        }}
      />
      <section className="welcome-row">
        <div>
          <p className="overline">YOUR WEEK IN THE WORD</p>
          <h1>
            Daily Bible Readings. <span>Grow in the Word.</span>
          </h1>
          <p className="welcome-copy">
            Read daily devotionals, Sunday School lessons, and past readings from Evangel Daily Meal.
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
              {todayReading.kind === "sunday-school" ? (
                <p className="today-banner__theme">{todayReading.unit}{todayReading.lessonNumber ? <span> · Lesson {todayReading.lessonNumber}</span> : null}</p>
              ) : (
                <p className="today-banner__theme">{todayReading.annualTheme}{todayReading.annualThemeReference ? <span> · {todayReading.annualThemeReference}</span> : null}</p>
              )}
              <h2 id="today-heading">{todayReading.topic}</h2>
              <p className="today-banner__scripture">
                {todayReading.scripture}
              </p>
              <Link className="button button--gold" href={`/reading/${todayReading.id}`}>
                {todayReading.kind === "sunday-school" ? "Read Sunday School lesson" : "Read today’s devotional"} <span aria-hidden="true">→</span>
              </Link>
            </>
          ) : (
            <>
              <p className="today-banner__theme">
                Make room for a moment in the Word
              </p>
              <h2 id="today-heading">{isSunday ? "Sunday School lesson is coming soon" : "Today’s devotional is coming soon"}</h2>
              <p className="today-banner__scripture">
                {isSunday ? "The Sunday School lesson will appear here as soon as it’s available." : "We’ll add the reading here as soon as it’s available."}
              </p>
              <Link className="button button--gold" href="#this-week">
                {isSunday ? "Browse Sunday School readings" : "View this week’s readings"} <span aria-hidden="true">→</span>
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
