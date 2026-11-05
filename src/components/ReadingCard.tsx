import Link from "next/link";
import type { Devotional } from "@/data/readings";
import { dateLabel } from "@/lib/dates";

type Day = { weekday: string; date: string; readingId: string; label: string };

export function ReadingCard({ day, today, reading }: { day: Day; today: string; reading: Devotional }) {
  const isToday = day.date === today;
  const sunday = day.label === "Sunday School";
  return (
    <Link className={`reading-card${isToday ? " is-today" : ""}${sunday ? " is-sunday" : ""}`} href={`/reading/${day.readingId}`}>
      <span className={`day-mark${sunday ? " day-mark--sunday" : ""}`} aria-hidden="true">{sunday ? "✦" : day.weekday.slice(0, 1)}</span>
      <span className="reading-card__date"><strong>{day.weekday}</strong><small>{dateLabel(day.date, { month: "short", day: "numeric" })}{isToday ? <em>Today</em> : null}</small></span>
      <span className="reading-card__details"><span className="reading-card__title">{reading.available ? reading.topic : (sunday ? "Sunday School lesson" : "Daily reading")}</span><span className="reading-card__meta">{reading.available ? reading.scripture : (sunday ? "Lesson details coming soon" : "Reading details coming soon")}</span></span>
      {sunday ? <span className="sunday-pill">SUNDAY SCHOOL</span> : null}
      <span className="reading-card__arrow" aria-hidden="true">↗</span>
    </Link>
  );
}
