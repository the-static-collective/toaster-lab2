import assert from "node:assert/strict";
import { parseAndCleanLyricsWithGemini } from "../src/server/geminiProposer";
import { processLyrics } from "../src/lib/lyricMachine";

const previousKey = process.env.GEMINI_API_KEY;
delete process.env.GEMINI_API_KEY;

try {
  const provided = await parseAndCleanLyricsWithGemini(
    "[00:03.20] First line\n[00:07.80] Second line",
    30,
  );
  assert.equal(provided.processor, "local");
  assert.equal(provided.timingSource, "provided");
  assert.match(provided.cleanedLyrics, /^\[00:03\.20\]/);

  const estimated = await parseAndCleanLyricsWithGemini(
    "[Verse 1]\nFirst line\nSecond line",
    30,
  );
  assert.equal(estimated.processor, "local");
  assert.equal(estimated.timingSource, "estimated");
  assert.match(estimated.cleanedLyrics, /^\[\d{2}:\d{2}\.\d{2}\]/);

  const rawUntimed = processLyrics("First line\nSecond line", 30);
  assert.equal(rawUntimed.stats.timingSource, "estimated");
  assert.equal(rawUntimed.cues.every((cue) => cue.source === "estimated"), true);

  console.log(JSON.stringify({
    proof: "provided timing stays provided; text+duration timing stays estimated",
    provided: provided.timingSource,
    generated: estimated.timingSource,
    untimedInference: rawUntimed.stats.timingSource,
  }, null, 2));
} finally {
  if (previousKey === undefined) delete process.env.GEMINI_API_KEY;
  else process.env.GEMINI_API_KEY = previousKey;
}
