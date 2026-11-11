"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import ReactMarkdown from "react-markdown";
import type { Devotional } from "@/data/readings";

type Category = "daily" | "sunday-school";
type EditorValue = {
  date: string;
  category: Category;
  title: string;
  scripture: string;
  keyVerse: string;
  keyVerseReference: string;
  translation: string;
  publication: string;
  annualTheme: string;
  annualThemeReference: string;
  unit: string;
  lessonNumber: string;
  centralTruth: string;
  controllingThought: string;
  prayer: string;
  biblePlan: string;
  learningObjectives: string;
  body: string;
};

function lagosDate(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Lagos",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const get = (type: string) =>
    parts.find((part) => part.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

function blankEditor(date = lagosDate()): EditorValue {
  return {
    date,
    category: "daily",
    title: "",
    scripture: "",
    keyVerse: "",
    keyVerseReference: "",
    translation: "",
    publication: "",
    annualTheme: "",
    annualThemeReference: "",
    unit: "",
    lessonNumber: "",
    centralTruth: "",
    controllingThought: "",
    prayer: "",
    biblePlan: "",
    learningObjectives: "",
    body: "",
  };
}

function editorFromReading(reading: Devotional): EditorValue {
  return {
    date: reading.date,
    category: reading.kind,
    title: reading.topic ?? reading.title,
    scripture: reading.scripture ?? "",
    keyVerse: reading.keyVerse ?? "",
    keyVerseReference: reading.keyVerseReference ?? "",
    translation: reading.translation ?? "",
    publication: reading.publication ?? "",
    annualTheme: reading.annualTheme ?? "",
    annualThemeReference: reading.annualThemeReference ?? "",
    unit: reading.unit ?? "",
    lessonNumber: reading.lessonNumber ?? "",
    centralTruth: reading.centralTruth ?? "",
    controllingThought: reading.controllingThought ?? "",
    prayer: reading.prayer ?? "",
    biblePlan: reading.biblePlan ?? "",
    learningObjectives: reading.learningObjectives?.join("\n") ?? "",
    body: reading.body ?? "",
  };
}

function escapeHtml(value: string): string {
  const entities: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  };
  return value.replace(
    /[&<>"']/g,
    (character) => entities[character] ?? character,
  );
}

function inlineMarkdown(value: string): string {
  let output = escapeHtml(value);
  output = output.replace(
    /\[([^\]]+)\]\((https?:\/\/[^\s)]+|mailto:[^\s)]+)\)/g,
    '<a href="$2">$1</a>',
  );
  output = output.replace(/`([^`]+)`/g, "<code>$1</code>");
  output = output.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  output = output.replace(/__([^_]+)__/g, "<strong>$1</strong>");
  output = output.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  output = output.replace(/_([^_]+)_/g, "<em>$1</em>");
  return output;
}

function markdownToHtml(markdown: string): string {
  if (!markdown.trim()) return "";
  const lines = markdown.replace(/\r/g, "").split("\n");
  const blocks: string[] = [];
  let index = 0;
  while (index < lines.length) {
    const line = lines[index].trim();
    if (!line) {
      index += 1;
      continue;
    }
    const heading = line.match(/^(#{1,3})\s+(.+)$/);
    if (heading) {
      blocks.push(
        `<h${heading[1].length}>${inlineMarkdown(heading[2])}</h${heading[1].length}>`,
      );
      index += 1;
      continue;
    }
    if (/^>\s?/.test(line)) {
      const quote: string[] = [];
      while (index < lines.length && /^\s*>/.test(lines[index]))
        quote.push(inlineMarkdown(lines[index++].replace(/^\s*>\s?/, "")));
      blocks.push(`<blockquote><p>${quote.join("<br>")}</p></blockquote>`);
      continue;
    }
    if (/^[-*+]\s+/.test(line)) {
      const items: string[] = [];
      while (index < lines.length && /^\s*[-*+]\s+/.test(lines[index]))
        items.push(
          `<li>${inlineMarkdown(lines[index++].replace(/^\s*[-*+]\s+/, ""))}</li>`,
        );
      blocks.push(`<ul>${items.join("")}</ul>`);
      continue;
    }
    if (/^\d+[.)]\s+/.test(line)) {
      const items: string[] = [];
      while (index < lines.length && /^\s*\d+[.)]\s+/.test(lines[index]))
        items.push(
          `<li>${inlineMarkdown(lines[index++].replace(/^\s*\d+[.)]\s+/, ""))}</li>`,
        );
      blocks.push(`<ol>${items.join("")}</ol>`);
      continue;
    }
    const paragraph: string[] = [];
    while (
      index < lines.length &&
      lines[index].trim() &&
      !/^(#{1,3}\s|>\s?|[-*+]\s+|\d+[.)]\s+)/.test(lines[index].trim())
    )
      paragraph.push(inlineMarkdown(lines[index++].trim()));
    blocks.push(`<p>${paragraph.join("<br>")}</p>`);
  }
  return blocks.join("");
}

function nodeMarkdown(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? "";
  if (!(node instanceof HTMLElement)) return "";
  const tag = node.tagName.toLowerCase();
  if (tag === "script" || tag === "style") return "";
  const children = Array.from(node.childNodes).map(nodeMarkdown).join("");
  if (tag === "br") return "\n";
  if (tag === "strong" || tag === "b") return `**${children.trim()}**`;
  if (tag === "em" || tag === "i") return `*${children.trim()}*`;
  if (tag === "code") return `\`${children}\``;
  if (/^h[1-3]$/.test(tag))
    return `\n${"#".repeat(Number(tag[1]))} ${children.trim()}\n\n`;
  if (tag === "blockquote")
    return `\n${children
      .trim()
      .split("\n")
      .map((line) => `> ${line}`)
      .join("\n")}\n\n`;
  if (tag === "ul" || tag === "ol") {
    const items = Array.from(node.children).filter(
      (child) => child.tagName.toLowerCase() === "li",
    );
    return `\n${items.map((item, index) => `${tag === "ol" ? `${index + 1}.` : "-"} ${Array.from(item.childNodes).map(nodeMarkdown).join("").trim()}`).join("\n")}\n\n`;
  }
  if (tag === "li") return children;
  if (tag === "a") {
    const href = node.getAttribute("href") ?? "";
    return /^(https?:|mailto:)/i.test(href)
      ? `[${children}](${href})`
      : children;
  }
  if (tag === "img") return node.getAttribute("alt") ?? "";
  if (tag === "p" || tag === "div") return `${children.trim()}\n\n`;
  return children;
}

function htmlToMarkdown(html: string): string {
  const parsed = new DOMParser().parseFromString(html, "text/html");
  return Array.from(parsed.body.childNodes)
    .map(nodeMarkdown)
    .join("")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  disabled?: boolean;
}) {
  return (
    <label className="cms-field">
      <span>{label}</span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function RichEditor({
  initialValue,
  onChange,
}: {
  initialValue: string;
  onChange: (value: string) => void;
}) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<"write" | "preview">("write");
  const [markdown, setMarkdown] = useState(initialValue);
  useEffect(() => {
    if (editorRef.current)
      editorRef.current.innerHTML = markdownToHtml(initialValue);
  }, []);

  function captureEditor(value: string) {
    setMarkdown(value);
    onChange(value);
  }

  function format(command: string, value?: string) {
    editorRef.current?.focus();
    document.execCommand(command, false, value);
    if (editorRef.current)
      captureEditor(htmlToMarkdown(editorRef.current.innerHTML));
  }

  function toolbarButton(
    label: string,
    command: string,
    value?: string,
  ): ReactNode {
    return (
      <button
        type="button"
        key={label}
        title={label}
        aria-label={label}
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => format(command, value)}
      >
        {label}
      </button>
    );
  }

  return (
    <div className="cms-editor">
      <div className="cms-editor__top">
        <div className="cms-editor__tabs">
          <button
            type="button"
            className={mode === "write" ? "is-active" : ""}
            onClick={() => setMode("write")}
          >
            Write
          </button>
          <button
            type="button"
            className={mode === "preview" ? "is-active" : ""}
            onClick={() => {
              if (editorRef.current)
                captureEditor(htmlToMarkdown(editorRef.current.innerHTML));
              setMode("preview");
            }}
          >
            Preview
          </button>
        </div>
        <span>Formatting is saved in the published reading</span>
      </div>
      <div
        className="cms-toolbar"
        aria-label="Text formatting toolbar"
        hidden={mode !== "write"}
      >
        {toolbarButton("↶ Undo", "undo")}
        {toolbarButton("↷ Redo", "redo")}
        <span />
        {toolbarButton("B", "bold")}
        {toolbarButton("I", "italic")}
        {toolbarButton("H2", "formatBlock", "h2")}
        {toolbarButton("H3", "formatBlock", "h3")}
        <span />
        {toolbarButton("• List", "insertUnorderedList")}
        {toolbarButton("1. List", "insertOrderedList")}
        {toolbarButton("Quote", "formatBlock", "blockquote")}
        {toolbarButton("Link", "createLink", "https://")}
      </div>
      <div
        ref={editorRef}
        className="cms-editor__canvas"
        hidden={mode !== "write"}
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-label="Reading body editor"
        aria-multiline="true"
        data-placeholder="Write your reading here. Select text to format it…"
        onKeyDown={(event) => {
          if (!(event.ctrlKey || event.metaKey)) return;
          const key = event.key.toLowerCase();
          if (key === "z") {
            event.preventDefault();
            format(event.shiftKey ? "redo" : "undo");
          } else if (key === "y") {
            event.preventDefault();
            format("redo");
          }
        }}
        onInput={(event) =>
          captureEditor(htmlToMarkdown(event.currentTarget.innerHTML))
        }
      />
      <article
        hidden={mode !== "preview"}
        className="cms-preview markdown-content"
      >
        <ReactMarkdown>
          {markdown || "_Your preview will appear here._"}
        </ReactMarkdown>
      </article>
    </div>
  );
}

export function AdminStudio({
  initialReadings,
  initialDate,
}: {
  initialReadings: Devotional[];
  initialDate: string;
}) {
  const [readings, setReadings] = useState(initialReadings);
  const [form, setForm] = useState<EditorValue>(() => blankEditor(initialDate));
  const [mode, setMode] = useState<"create" | "update">("create");
  const [editorKey, setEditorKey] = useState("new");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState("");

  const filtered = useMemo(
    () =>
      [...readings]
        .filter((reading) =>
          `${reading.topic ?? ""} ${reading.date} ${reading.kind}`
            .toLowerCase()
            .includes(query.toLowerCase()),
        )
        .sort((a, b) => b.date.localeCompare(a.date)),
    [readings, query],
  );

  function update<K extends keyof EditorValue>(key: K, value: EditorValue[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function newReading() {
    setMode("create");
    setForm(blankEditor());
    setEditorKey(`new-${Date.now()}`);
    setNotice("");
    setError("");
  }

  function editReading(reading: Devotional) {
    setMode("update");
    setForm(editorFromReading(reading));
    setEditorKey(reading.id);
    setNotice("");
    setError("");
  }

  async function publish(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/admin/readings", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...form,
          id: mode === "update" ? editorKey : undefined,
          mode,
          body: form.body.trim(),
        }),
      });
      const result = (await response.json()) as {
        error?: string;
        id?: string;
        date?: string;
        title?: string;
        scripture?: string;
        notified?: number;
      };
      if (response.status === 401) {
        window.location.reload();
        return;
      }
      if (!response.ok)
        throw new Error(result.error ?? "Could not publish this reading.");
      const saved: Devotional = {
        id: result.id ?? editorKey,
        date: form.date,
        kind: form.category,
        title: form.title.trim(),
        topic: form.title.trim(),
        scripture:
          result.scripture ??
          (form.category === "sunday-school"
            ? form.keyVerseReference.trim()
            : form.scripture.trim()),
        keyVerse: form.keyVerse.trim(),
        keyVerseReference:
          form.category === "sunday-school"
            ? result.scripture || form.keyVerseReference.trim()
            : form.keyVerseReference.trim(),
        translation: form.translation.trim(),
        publication: form.publication.trim(),
        annualTheme: form.annualTheme.trim(),
        annualThemeReference: form.annualThemeReference.trim(),
        unit: form.unit.trim(),
        lessonNumber: form.lessonNumber.trim(),
        centralTruth: form.centralTruth.trim(),
        controllingThought: form.controllingThought.trim(),
        prayer: form.prayer.trim(),
        biblePlan: form.biblePlan.trim(),
        learningObjectives: form.learningObjectives
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean),
        body: form.body.trim(),
        available: true,
      };
      setReadings((current) =>
        [saved, ...current.filter((reading) => reading.id !== saved.id)].sort(
          (a, b) => b.date.localeCompare(a.date),
        ),
      );
      setMode("update");
      setEditorKey(saved.id);
      setNotice(
        `“${result.title ?? saved.title}” Saved Successfully and is available on the homepage now.${result.notified ? ` Push notification sent to ${result.notified} device${result.notified === 1 ? "" : "s"}.` : ""}`,
      );
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Could not publish this reading.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    await fetch("/api/admin/logout", { method: "POST" });
    window.location.reload();
  }

  return (
    <div className="cms-page">
      <div className="cms-heading">
        <div>
          <p className="overline">CONTENT STUDIO</p>
          <h1>Reading CMS</h1>
          <p>Create and manage the readings published on your site.</p>
        </div>
        <button className="cms-secondary" type="button" onClick={signOut}>
          Sign out
        </button>
      </div>
      <div className="cms-layout">
        <aside className="cms-library">
          <div className="cms-library__head">
            <div>
              <h2>Your readings</h2>
              <span>{readings.length} published</span>
            </div>
            <button
              type="button"
              className="cms-add"
              onClick={newReading}
              aria-label="Create a reading"
            >
              +
            </button>
          </div>
          <label className="cms-search">
            <span aria-hidden="true">⌕</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search readings"
            />
          </label>
          <div className="cms-library__list">
            {filtered.length ? (
              filtered.map((reading) => (
                <button
                  type="button"
                  key={reading.id}
                  className={`cms-reading-item${mode === "update" && editorKey === reading.id ? " is-selected" : ""}`}
                  onClick={() => editReading(reading)}
                >
                  <span className="cms-reading-item__icon">
                    {reading.kind === "sunday-school" ? "✦" : "▤"}
                  </span>
                  <span>
                    <strong>{reading.topic ?? reading.title}</strong>
                    <small>
                      {reading.date} ·{" "}
                      {reading.kind === "sunday-school"
                        ? "Sunday School"
                        : "Daily Reading"}
                    </small>
                  </span>
                </button>
              ))
            ) : (
              <p className="cms-library__empty">
                No readings match that search.
              </p>
            )}
          </div>
        </aside>

        <form className="cms-form" onSubmit={publish}>
          <div className="cms-form__heading">
            <div>
              <span className="cms-status-dot" />
              {mode === "create" ? "NEW READING" : "EDITING READING"}
            </div>
            <button className="cms-clear" type="button" onClick={newReading}>
              Clear form
            </button>
          </div>
          <div className="cms-fields-grid">
            <Field
              label="Title"
              value={form.title}
              onChange={(value) => update("title", value)}
              placeholder="Give this reading a title"
            />
            <label className="cms-field">
              <span>Category</span>
              <select
                value={form.category}
                onChange={(event) =>
                  update("category", event.target.value as Category)
                }
              >
                <option value="daily">Daily Reading</option>
                <option value="sunday-school">Sunday School</option>
              </select>
            </label>
            <Field
              label="Reading date"
              type="date"
              value={form.date}
              disabled={mode === "update"}
              onChange={(value) => update("date", value)}
            />
            {form.category === "daily" ? (
              <Field
                label="Scripture reference"
                value={form.scripture}
                onChange={(value) => update("scripture", value)}
                placeholder="e.g. John 5:1–9"
              />
            ) : (
              <Field
                label="Memory verse reference"
                value={form.keyVerseReference}
                onChange={(value) => update("keyVerseReference", value)}
                placeholder="e.g. John 3:14"
              />
            )}
          </div>
          <details className="cms-extra-fields">
            <summary>
              More reading details <span>Optional</span>
            </summary>
            <div className="cms-fields-grid">
              <Field
                label="Publication name"
                value={form.publication}
                onChange={(value) => update("publication", value)}
              />
              {form.category === "daily" && (
                <>
                  <Field
                    label="Key verse"
                    value={form.keyVerse}
                    onChange={(value) => update("keyVerse", value)}
                  />
                  <Field
                    label="Key verse reference"
                    value={form.keyVerseReference}
                    onChange={(value) => update("keyVerseReference", value)}
                  />
                  <Field
                    label="Translation"
                    value={form.translation}
                    onChange={(value) => update("translation", value)}
                    placeholder="NIV"
                  />
                  <Field
                    label="Annual theme"
                    value={form.annualTheme}
                    onChange={(value) => update("annualTheme", value)}
                  />
                  <Field
                    label="Annual theme reference"
                    value={form.annualThemeReference}
                    onChange={(value) => update("annualThemeReference", value)}
                  />
                </>
              )}
              {form.category === "sunday-school" && (
                <>
                  <Field
                    label="Memory verse"
                    value={form.keyVerse}
                    onChange={(value) => update("keyVerse", value)}
                  />
                  <Field
                    label="Translation"
                    value={form.translation}
                    onChange={(value) => update("translation", value)}
                    placeholder="KJV"
                  />
                  <Field
                    label="Unit"
                    value={form.unit}
                    onChange={(value) => update("unit", value)}
                  />
                  <Field
                    label="Lesson number"
                    value={form.lessonNumber}
                    onChange={(value) => update("lessonNumber", value)}
                  />
                  <Field
                    label="Central truth"
                    value={form.centralTruth}
                    onChange={(value) => update("centralTruth", value)}
                  />
                </>
              )}
              {form.category === "sunday-school" && (
                <label className="cms-field cms-field--wide">
                  <span>Learning objectives (one per line)</span>
                  <textarea
                    value={form.learningObjectives}
                    onChange={(event) =>
                      update("learningObjectives", event.target.value)
                    }
                    rows={3}
                  />
                </label>
              )}
              {form.category === "daily" && (
                <>
                  <Field
                    label="Controlling thought"
                    value={form.controllingThought}
                    onChange={(value) => update("controllingThought", value)}
                  />
                  <Field
                    label="Prayer"
                    value={form.prayer}
                    onChange={(value) => update("prayer", value)}
                  />
                  <Field
                    label="Bible plan"
                    value={form.biblePlan}
                    onChange={(value) => update("biblePlan", value)}
                  />
                </>
              )}
            </div>
          </details>
          <label className="cms-field cms-body-label">
            <span>Body</span>
          </label>
          <RichEditor
            key={editorKey}
            initialValue={form.body}
            onChange={(value) => update("body", value)}
          />
          {error && (
            <p className="cms-error" role="alert">
              {error}
            </p>
          )}
          {notice && (
            <p className="cms-notice" role="status">
              {notice}
            </p>
          )}
          <div className="cms-form__footer">
            <p>
              Publishing saves this reading in the database and makes it
              available on the site.
            </p>
            <button className="cms-primary" type="submit" disabled={busy}>
              {busy
                ? "Saving…"
                : mode === "create"
                  ? "Publish reading"
                  : "Save changes"}
              <span>→</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
