/**
 * Cleans raw Google Meet filenames into human-readable meeting titles.
 *
 * Input:  "Gnosis Biz - demand signals sync – 2026/03/04 10:57 GMT+08:00 – Notes by Gemini"
 * Output: "Gnosis Biz - Demand Signals Sync"
 */
export function cleanMeetingTitle(raw: string | null | undefined): string {
  if (!raw) return "Untitled Meeting";

  let title = raw;

  // Strip "Notes by Gemini" / "Transcript by Gemini" suffix (with em-dash or hyphen)
  title = title.replace(/\s*[–—-]\s*(?:Notes|Transcript)\s+by\s+Gemini\s*$/i, "");

  // Strip trailing date/time pattern: "– 2026/03/04 10:57 GMT+08:00" or similar
  // Matches: separator + YYYY/MM/DD or YYYY-MM-DD + optional time + optional timezone
  title = title.replace(
    /\s*[–—-]\s*\d{4}[/\-]\d{2}[/\-]\d{2}(?:\s+\d{1,2}:\d{2}(?::\d{2})?)?(?:\s*(?:GMT|UTC)?[+\-]?\d{0,2}:?\d{0,2})?\s*$/,
    ""
  );

  // Also handle "on YYYY-MM-DD" suffix
  title = title.replace(/\s+on\s+\d{4}[/\-]\d{2}[/\-]\d{2}\s*$/, "");

  // Trim whitespace and trailing separators
  title = title.replace(/\s*[–—-]\s*$/, "").trim();

  return title || "Untitled Meeting";
}

/**
 * Extracts date/time from a raw Google Meet filename if present.
 * Returns null if no date pattern is found.
 */
export function extractMeetingDate(raw: string | null | undefined): Date | null {
  if (!raw) return null;

  const match = raw.match(
    /(\d{4})[/\-](\d{2})[/\-](\d{2})(?:\s+(\d{1,2}):(\d{2}))?/
  );
  if (!match) return null;

  const [, year, month, day, hour, minute] = match;
  return new Date(
    parseInt(year),
    parseInt(month) - 1,
    parseInt(day),
    hour ? parseInt(hour) : 0,
    minute ? parseInt(minute) : 0
  );
}
