/**
 * Lyric Machine — Preprocessing boundary for Toast Lab.
 * Turns messy real-world lyrics into honest structured evidence for Haunted Toaster.
 *
 * Rules:
 * 1. Must preserve text without inventing missing lyrics.
 * 2. Timing must be strictly monotonic.
 * 3. Timing must stay within known audio duration.
 * 4. Must distinguish sources: 'provided' | 'derived' | 'estimated' | 'unknown'.
 */

export type LyricTimingSource = "provided" | "derived" | "estimated" | "unknown";

export interface TimedLyricCue {
  id: string;
  lineIndex: number;
  stanzaIndex: number;
  text: string;
  startSeconds: number;
  endSeconds: number;
  source: LyricTimingSource;
  confidence: number; // 0.0 to 1.0
}

export interface LyricNormalizationResult {
  rawText: string;
  normalizedText: string;
  stanzas: string[][]; // stanzas -> lines
  cues: TimedLyricCue[];
  stats: {
    lineCount: number;
    stanzaCount: number;
    wordCount: number;
    timingSource: LyricTimingSource;
    isMonotonic: boolean;
    durationSeconds: number;
  };
}

/**
 * Clean raw lyrics by stripping section tags ([Verse], [Chorus], Verse 1:, etc),
 * removing quotes/stray characters, and optionally adding LRC timestamp tags.
 */
export function cleanAndTagLyricsLocally(
  rawText: string,
  audioDurationSeconds: number = 180
): { cleanedText: string; cuesCount: number } {
  if (!rawText) return { cleanedText: "", cuesCount: 0 };

  const lines = rawText
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n");

  const cleanedLines: string[] = [];

  lines.forEach((line) => {
    let trimmed = line.trim();
    if (!trimmed) return;

    // Check if line is purely a section tag e.g. [Verse 1], [Chorus], Verse 1:, Chorus:, (Intro), etc.
    const isSectionTag =
      /^\[\s*(verse|chorus|bridge|intro|outro|hook|pre-chorus|post-chorus|refrain|interlude|solo|spoken|tag|outro)\s*\d*\]$/i.test(trimmed) ||
      /^\(\s*(verse|chorus|bridge|intro|outro|hook|pre-chorus|post-chorus|refrain|interlude|solo|spoken|tag|outro)\s*\d*\)$/i.test(trimmed) ||
      /^(verse|chorus|bridge|intro|outro|hook|pre-chorus|post-chorus|refrain|interlude|solo|spoken)\s*\d*:?$/i.test(trimmed);

    if (isSectionTag) return;

    // Strip inline section headers e.g. [Chorus] at start of line
    trimmed = trimmed.replace(/^\[(verse|chorus|bridge|intro|outro|hook|pre-chorus|post-chorus|refrain|interlude|solo).*?\]\s*/i, "");
    trimmed = trimmed.replace(/^\((verse|chorus|bridge|intro|outro|hook|pre-chorus|post-chorus|refrain|interlude|solo).*?\)\s*/i, "");

    // Strip quotes around line if present, e.g. "Line of lyrics" -> Line of lyrics
    trimmed = trimmed.replace(/^["'“”«»]\s*/, "").replace(/\s*["'“”«»]$/, "").trim();

    if (trimmed.length > 0) {
      cleanedLines.push(trimmed);
    }
  });

  if (cleanedLines.length === 0) {
    return { cleanedText: "", cuesCount: 0 };
  }

  // Check if timestamps already exist in lines
  const hasTimestamps = cleanedLines.some((l) => /^\[\d{1,2}:\d{2}(?:\.\d{1,3})?\]/.test(l));

  if (hasTimestamps) {
    return { cleanedText: cleanedLines.join("\n"), cuesCount: cleanedLines.length };
  }

  // Generate LRC timestamps distributed across audioDurationSeconds
  const duration = Math.max(10, audioDurationSeconds);
  const startTime = Math.min(2.0, duration * 0.05);
  const availableDuration = Math.max(5.0, duration - startTime - 2.0);

  const totalChars = cleanedLines.reduce((acc, l) => acc + l.length, 0) || 1;
  let currTime = startTime;

  const timestampedLines = cleanedLines.map((line) => {
    // If line already has a timestamp, keep it
    if (/^\[\d{1,2}:\d{2}(?:\.\d{1,3})?\]/.test(line)) return line;

    const mins = Math.floor(currTime / 60);
    const secs = Math.floor(currTime % 60);
    const hundredths = Math.floor((currTime % 1) * 100);

    const pad = (n: number) => n.toString().padStart(2, "0");
    const tag = `[${pad(mins)}:${pad(secs)}.${pad(hundredths)}]`;

    const charWeight = line.length / totalChars;
    const lineDuration = Math.max(1.5, availableDuration * charWeight);
    currTime += lineDuration;

    return `${tag} ${line}`;
  });

  return {
    cleanedText: timestampedLines.join("\n"),
    cuesCount: timestampedLines.length,
  };
}

/**
 * Clean and normalize raw lyrics without altering character content or inventing lyrics.
 */
export function normalizeLyricText(rawText: string): string {
  if (!rawText) return "";

  return rawText
    // Standardize newline characters
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    // Clean trailing whitespace per line
    .split("\n")
    .map((line) => line.trim())
    // Collapse 3+ consecutive newlines into 2 (stanza breaks)
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Parse line-level timestamp tags if present in standard LRC format e.g. [01:23.45]
 */
function parseTimestampTag(line: string): { seconds: number | null; cleanLine: string } {
  const match = line.match(/^\[(\d{1,2}):(\d{2})(?:\.(\d{1,3}))?\]\s*(.*)$/);
  if (!match) return { seconds: null, cleanLine: line };

  const mins = parseInt(match[1], 10);
  const secs = parseInt(match[2], 10);
  const msPart = match[3] ? parseFloat(`0.${match[3]}`) : 0;
  const seconds = mins * 60 + secs + msPart;
  const cleanLine = match[4];

  return { seconds, cleanLine };
}

/**
 * Process lyrics and derive monotonic cues mapped across the audio duration.
 */
export function processLyrics(
  rawText: string,
  audioDurationSeconds: number = 180
): LyricNormalizationResult {
  const normalizedText = normalizeLyricText(rawText);

  if (!normalizedText) {
    return {
      rawText: "",
      normalizedText: "",
      stanzas: [],
      cues: [],
      stats: {
        lineCount: 0,
        stanzaCount: 0,
        wordCount: 0,
        timingSource: "unknown",
        isMonotonic: true,
        durationSeconds: audioDurationSeconds,
      },
    };
  }

  const rawStanzaBlocks = normalizedText.split(/\n\n+/);
  const stanzas: string[][] = [];
  const parsedLines: { text: string; stanzaIdx: number; parsedTime: number | null }[] = [];

  let hasProvidedTimestamps = false;

  rawStanzaBlocks.forEach((block, stanzaIdx) => {
    const lines = block.split("\n").filter((l) => l.trim().length > 0);
    const cleanStanzaLines: string[] = [];

    lines.forEach((line) => {
      const { seconds, cleanLine } = parseTimestampTag(line);
      if (seconds !== null) hasProvidedTimestamps = true;

      // Filter out meta tags like [Chorus] or [Verse 1] if empty after bracket removal,
      // but preserve line if user provided content
      const sanitized = cleanLine.replace(/^\[(verse|chorus|bridge|intro|outro|hook|verse \d+).*?\]/i, "").trim();
      const finalText = sanitized || cleanLine;

      if (finalText.length > 0) {
        cleanStanzaLines.push(finalText);
        parsedLines.push({ text: finalText, stanzaIdx, parsedTime: seconds });
      }
    });

    if (cleanStanzaLines.length > 0) {
      stanzas.push(cleanStanzaLines);
    }
  });

  const totalLines = parsedLines.length;
  const duration = Math.max(1, audioDurationSeconds);
  const cues: TimedLyricCue[] = [];

  const mainTimingSource: LyricTimingSource = hasProvidedTimestamps ? "provided" : "estimated";

  if (totalLines > 0) {
    if (hasProvidedTimestamps) {
      // Build cues with provided timestamps, filling missing gaps linearly
      let lastTime = 0;
      parsedLines.forEach((item, lineIdx) => {
        let start = item.parsedTime ?? (lastTime + (duration - lastTime) / (totalLines - lineIdx));
        if (start < lastTime) start = lastTime; // Enforce monotonicity
        if (start > duration) start = duration;

        const nextItem = parsedLines[lineIdx + 1];
        let end = nextItem?.parsedTime ?? Math.min(duration, start + 3.5);
        if (end <= start) end = Math.min(duration, start + 2.0);

        cues.push({
          id: `cue_${lineIdx}`,
          lineIndex: lineIdx,
          stanzaIndex: item.stanzaIdx,
          text: item.text,
          startSeconds: Number(start.toFixed(2)),
          endSeconds: Number(end.toFixed(2)),
          source: item.parsedTime !== null ? "provided" : "derived",
          confidence: item.parsedTime !== null ? 0.98 : 0.75,
        });

        lastTime = start;
      });
    } else {
      // Estimate cues proportionally across total duration
      const totalChars = parsedLines.reduce((acc, curr) => acc + curr.text.length, 0) || 1;
      let currentTime = Math.min(2.0, duration * 0.05); // Start slightly into track

      const availableTime = Math.max(1.0, duration - currentTime - 2.0);

      parsedLines.forEach((item, lineIdx) => {
        const charWeight = item.text.length / totalChars;
        const lineDuration = Math.max(1.5, availableTime * charWeight);

        const start = Math.min(duration - 0.5, currentTime);
        const end = Math.min(duration, start + lineDuration);

        cues.push({
          id: `cue_${lineIdx}`,
          lineIndex: lineIdx,
          stanzaIndex: item.stanzaIdx,
          text: item.text,
          startSeconds: Number(start.toFixed(2)),
          endSeconds: Number(end.toFixed(2)),
          source: "estimated",
          confidence: 0.82,
        });

        currentTime = end;
      });
    }
  }

  // Validate strict monotonicity
  let isMonotonic = true;
  for (let i = 1; i < cues.length; i++) {
    if (cues[i].startSeconds < cues[i - 1].startSeconds) {
      isMonotonic = false;
      break;
    }
  }

  const wordCount = normalizedText.split(/\s+/).filter(Boolean).length;

  return {
    rawText,
    normalizedText,
    stanzas,
    cues,
    stats: {
      lineCount: totalLines,
      stanzaCount: stanzas.length,
      wordCount,
      timingSource: mainTimingSource,
      isMonotonic,
      durationSeconds: duration,
    },
  };
}
