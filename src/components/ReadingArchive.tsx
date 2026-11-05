"use client";

import { useMemo, useState } from "react";
import { ReadingCard } from "@/components/ReadingCard";
import type { Devotional } from "@/data/readings";
import { dateLabel, weekdayLabel } from "@/lib/dates";

type WeekOption = { id: string; start: string; end: string };

function mondayOf(date: string): string {
  const monday = new Date(`${date}T12:00:00Z`);
  monday.setUTCDate(monday.getUTCDate() - ((monday.getUTCDay() + 6) % 7));
  return monday.toISOString().slice(0, 10);
}

function weekOptions(readings: Devotional[], today: string): WeekOption[] {
  const starts = new Set(readings.map((reading) => mondayOf(reading.date)));
  starts.add(mondayOf(today));

  return [...starts]
    .sort((a, b) => b.localeCompare(a))
    .map((start) => {
      const endDate = new Date(`${start}T12:00:00Z`);
      endDate.setUTCDate(endDate.getUTCDate() + 6);
      return { id: start, start, end: endDate.toISOString().slice(0, 10) };
    });
}

function weekLabel(week: WeekOption): string {
  const sameYear = week.start.slice(0, 4) === week.end.slice(0, 4);
  const start = dateLabel(week.start, {
    month: "short",
    day: "numeric",
    ...(sameYear ? {} : { year: "numeric" }),
  });
  return `${start} – ${dateLabel(week.end, { month: "short", day: "numeric", year: "numeric" })}`;
}

export function ReadingArchive({
  readings,
  today,
}: {
  readings: Devotional[];
  today: string;
}) {
  const [selectedWeek, setSelectedWeek] = useState("all");
  const weeks = useMemo(() => weekOptions(readings, today), [readings, today]);
  const visibleReadings = useMemo(
    () =>
      [...readings]
        .filter(
          (reading) =>
            selectedWeek === "all" || mondayOf(reading.date) === selectedWeek,
        )
        .sort((a, b) => b.date.localeCompare(a.date)),
    [readings, selectedWeek],
  );
  const selectedWeekLabel = weeks.find((week) => week.id === selectedWeek);

  return (
    <>
      <div className="section-heading">
        <div>
          <p className="overline">READING ARCHIVE</p>
          <h2 id="week-heading">
            {selectedWeekLabel ? weekLabel(selectedWeekLabel) : "All readings"}
          </h2>
        </div>
        <div className="archive-controls">
          <span className="reading-count">
            {visibleReadings.length}{" "}
            {visibleReadings.length === 1 ? "reading" : "readings"}
          </span>
          <label className="week-filter">
            <span aria-hidden="true">☷</span>
            <span className="week-filter__label">Filter</span>
            <select
              aria-label="Filter readings by week"
              value={selectedWeek}
              onChange={(event) => setSelectedWeek(event.target.value)}
            >
              <option value="all">All weeks</option>
              {weeks.map((week) => (
                <option key={week.id} value={week.id}>
                  {weekLabel(week)}
                </option>
              ))}
            </select>
            <span className="week-filter__chevron" aria-hidden="true">
              ▾
            </span>
          </label>
        </div>
      </div>

      {visibleReadings.length > 0 ? (
        <div className="reading-list">
          {visibleReadings.map((reading) => {
            const sundaySchool = reading.kind === "sunday-school";
            const day = {
              weekday: weekdayLabel(reading.date),
              date: reading.date,
              readingId: reading.date,
              label: sundaySchool ? "Sunday School" : "Daily Reading",
            };
            return (
              <ReadingCard
                key={reading.date}
                day={day}
                today={today}
                reading={reading}
              />
            );
          })}
        </div>
      ) : (
        <div className="archive-empty" role="status">
          <span className="archive-empty__icon" aria-hidden="true">
            ◷
          </span>
          <h3>
            {readings.length === 0
              ? "No readings available yet"
              : "No readings for this week"}
          </h3>
          <p>
            {readings.length === 0
              ? "Published readings will appear here."
              : "There are no reading files for this week. Choose another week or view the full archive."}
          </p>
          {selectedWeek !== "all" && (
            <button
              className="archive-empty__reset"
              type="button"
              onClick={() => setSelectedWeek("all")}
            >
              Show all readings
            </button>
          )}
        </div>
      )}
    </>
  );
}
