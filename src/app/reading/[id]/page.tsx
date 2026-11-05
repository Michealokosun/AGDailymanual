import Link from "next/link";
import { notFound } from "next/navigation";
import { getReading } from "@/data/readings";
import { dateLabel, weekdayLabel } from "@/lib/dates";
import ReactMarkdown from "react-markdown";

export const dynamic = "force-dynamic";

export default async function ReadingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(id) || Number.isNaN(Date.parse(`${id}T12:00:00Z`))) notFound();
  const reading = await getReading(id);
  const isSunday = reading.kind === "sunday-school";

  return (
    <article className="detail-page">
      <Link href="/#this-week" className="back-link"><span aria-hidden="true">←</span> Back to this week</Link>
      <header className="detail-header">
        <p className="overline">{reading.publication ?? (isSunday ? "SUNDAY SCHOOL" : "EVANGEL DAILY MEAL")}</p>
        <p className="detail-header__date">{weekdayLabel(id)}, {dateLabel(id)}</p>
        {reading.available ? <>
          {isSunday ? <p className="detail-header__theme">{reading.unit}{reading.lessonNumber ? <span> · {reading.lessonNumber}</span> : null}</p> : <p className="detail-header__theme">{reading.annualTheme} <span>· {reading.annualThemeReference}</span></p>}
          <h1>{reading.topic}</h1>
          <div className="scripture-chip"><span aria-hidden="true">▤</span> {reading.scripture}</div>
        </> : <>
          <h1>{isSunday ? "Sunday School" : "Daily Reading"}</h1>
          <p className="detail-header__empty">{isSunday ? "The lesson for this Sunday will appear here once it has been added." : "This devotional hasn’t been added yet. Please check back soon."}</p>
        </>}
      </header>

      {reading.available ? <div className="detail-layout">
        <div className="detail-main">
          {reading.keyVerse && reading.keyVerseReference ? <section className="key-verse">
            <div className="key-verse__label"><span aria-hidden="true">✦</span> {isSunday ? "MEMORY VERSE" : "KEY VERSE"}</div>
            <blockquote>“{reading.keyVerse}”</blockquote>
            <p>{reading.keyVerseReference}{reading.translation ? <span> · {reading.translation}</span> : null}</p>
          </section> : null}
          {reading.centralTruth ? <section className="central-truth"><p className="overline">CENTRAL TRUTH</p><p>{reading.centralTruth}</p></section> : null}
          {reading.learningObjectives?.length ? <section className="objectives-card"><p className="overline">LEARNING OBJECTIVES</p><p className="objectives-card__intro">At the end of this lesson, students will be able to:</p><ol>{reading.learningObjectives.map((objective) => <li key={objective}>{objective}</li>)}</ol></section> : null}
          <section className="message-section">
            <h2><span className="section-icon" aria-hidden="true">✧</span> {isSunday ? "Sunday School lesson" : "Today’s message"}</h2>
            <div className="message-copy markdown-content"><ReactMarkdown>{reading.body ?? ""}</ReactMarkdown></div>
          </section>
          {reading.controllingThought ? <section className="reflection-card">
            <span className="reflection-card__icon" aria-hidden="true">✦</span>
            <div><p className="overline">CONTROLLING THOUGHT</p><p>{reading.controllingThought}</p></div>
          </section> : null}
          {reading.prayer ? <section className="prayer-card">
            <div className="prayer-card__heading"><span aria-hidden="true">⌁</span><h2>Prayer</h2></div>
            <p>{reading.prayer}</p>
          </section> : null}
        </div>
        <aside className="detail-aside">
          {reading.biblePlan ? <div className="aside-card aside-card--plan"><span className="aside-icon" aria-hidden="true">▤</span><p className="overline">ONE-YEAR BIBLE STUDY PLAN</p><h2>Read through the Bible</h2><p>{reading.biblePlan}</p></div> : null}
          {!isSunday ? <div className="aside-note"><span aria-hidden="true">✦</span><p>Take a moment to reflect on today’s reading and carry its truth with you.</p></div> : null}
        </aside>
      </div> : <div className="empty-reading"><span className="empty-reading__icon" aria-hidden="true">✦</span><h2>{isSunday ? "Lesson coming soon" : "Reading coming soon"}</h2><p>When the {isSunday ? "Sunday School lesson" : "devotional"} is available, you’ll find the complete content on this page.</p><Link className="button button--navy" href="/">Return to this week <span aria-hidden="true">→</span></Link></div>}
    </article>
  );
}
