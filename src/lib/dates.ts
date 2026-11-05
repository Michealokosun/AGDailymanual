export function lagosToday(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Lagos",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function dateLabel(date: string, options: Intl.DateTimeFormatOptions = { month: "long", day: "numeric", year: "numeric" }): string {
  return new Intl.DateTimeFormat("en", { ...options, timeZone: "UTC" }).format(new Date(`${date}T12:00:00Z`));
}

export function weekdayLabel(date: string): string {
  return new Intl.DateTimeFormat("en", { weekday: "long", timeZone: "UTC" }).format(new Date(`${date}T12:00:00Z`));
}

export function currentWeek(today: string) {
  const date = new Date(`${today}T12:00:00Z`);
  const mondayOffset = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - mondayOffset);
  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(date);
    day.setUTCDate(date.getUTCDate() + index);
    const id = day.toISOString().slice(0, 10);
    return {
      weekday: weekdayLabel(id),
      date: id,
      readingId: id,
      label: index === 6 ? "Sunday School" : "Daily Reading",
    };
  });
}
