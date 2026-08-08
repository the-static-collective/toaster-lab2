import React, { useState, useMemo } from "react";
import { Music, Image as ImageIcon, FileText, Upload, RefreshCw, CheckCircle2, AlertCircle, Sparkles, Loader2, Wand2 } from "lucide-react";
import { AudioInputData, ImageInputData } from "../types/toaster";
import { processLyrics, cleanAndTagLyricsLocally } from "../lib/lyricMachine";
import { SAMPLE_AUDIO, SAMPLE_COVER_IMAGE, SAMPLE_LYRICS } from "../lib/sampleData";

interface Props {
  audio: AudioInputData | null;
  lyrics: string;
  image: ImageInputData | null;
  onAudioUpload: (audio: AudioInputData | null) => void;
  onLyricsChange: (lyrics: string) => void;
  onImageUpload: (image: ImageInputData | null) => void;
  onResetToSamples: () => void;
}

export const SlotBay: React.FC<Props> = ({
  audio,
  lyrics,
  image,
  onAudioUpload,
  onLyricsChange,
  onImageUpload,
  onResetToSamples,
}) => {
  const [isParsingLyrics, setIsParsingLyrics] = useState<boolean>(false);
  const [parseNotice, setParseNotice] = useState<string | null>(null);

  // Real-time lyric machine analysis
  const lyricAnalysis = useMemo(() => {
    return processLyrics(lyrics, audio?.durationSeconds || 180);
  }, [lyrics, audio?.durationSeconds]);

  const handleParseAndCleanLyrics = async () => {
    if (!lyrics || !lyrics.trim()) return;
    setIsParsingLyrics(true);
    setParseNotice(null);

    try {
      const response = await fetch("/api/toaster/parse-lyrics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lyrics,
          durationSeconds: audio?.durationSeconds || 180,
        }),
      });

      const data = await response.json();
      if (data.success && data.cleanedLyrics) {
        onLyricsChange(data.cleanedLyrics);
        setParseNotice(`Parsed & cleaned via ${data.source === "gemini" ? "Gemini AI" : "Local Engine"}`);
      } else {
        const { cleanedText } = cleanAndTagLyricsLocally(lyrics, audio?.durationSeconds || 180);
        onLyricsChange(cleanedText);
        setParseNotice("Cleaned locally (stripped [Verse/Chorus] tags & quotes, added LRC timing)");
      }
    } catch (err) {
      const { cleanedText } = cleanAndTagLyricsLocally(lyrics, audio?.durationSeconds || 180);
      onLyricsChange(cleanedText);
      setParseNotice("Cleaned locally (stripped [Verse/Chorus] tags & quotes, added LRC timing)");
    } finally {
      setIsParsingLyrics(false);
    }
  };

  // File Upload Handlers
  const handleAudioFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Estimate duration using HTMLAudioElement if supported
    const url = URL.createObjectURL(file);
    const audioEl = new Audio(url);
    audioEl.onloadedmetadata = () => {
      onAudioUpload({
        filename: file.name,
        durationSeconds: Math.round(audioEl.duration) || 180,
        bpmEstimate: 128,
      });
      URL.revokeObjectURL(url);
    };
    audioEl.onerror = () => {
      onAudioUpload({
        filename: file.name,
        durationSeconds: 180,
        bpmEstimate: 128,
      });
    };
  };

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      onImageUpload({
        filename: file.name,
        mimeType: file.type || "image/png",
        base64,
        previewUrl: base64,
      });
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-2xl space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center space-x-2">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <h2 className="font-mono text-sm uppercase tracking-widest text-slate-200 font-semibold">
            PRIMARY EQUIPMENT SLOTS
          </h2>
        </div>
        <button
          onClick={onResetToSamples}
          className="flex items-center space-x-1.5 text-xs font-mono text-slate-400 hover:text-cyan-400 bg-slate-950 px-3 py-1 rounded-md border border-slate-800 hover:border-slate-700 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>LOAD DEMO SAMPLES</span>
        </button>
      </div>

      {/* Grid of 3 Equipment Slots */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* SLOT 1: SONG */}
        <div className="bg-slate-950 border border-slate-800/90 rounded-lg p-4 space-y-3 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
              <div className="flex items-center space-x-2 text-cyan-400">
                <Music className="w-4 h-4" />
                <span className="font-mono text-xs font-bold tracking-wider uppercase text-slate-200">
                  SLOT 01 • SONG
                </span>
              </div>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/50">
                {audio ? "LOADED" : "EMPTY"}
              </span>
            </div>

            {audio ? (
              <div className="space-y-2 font-mono text-xs">
                <p className="text-slate-200 font-semibold truncate" title={audio.filename}>
                  {audio.filename}
                </p>
                <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-400 bg-slate-900/60 p-2.5 rounded border border-slate-800">
                  <div>
                    <span className="text-slate-400 block text-[10px]">DURATION</span>
                    <span className="text-slate-200 font-bold">
                      {Math.floor(audio.durationSeconds / 60)}m {audio.durationSeconds % 60}s
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">ESTIMATED BPM</span>
                    <span className="text-cyan-400 font-bold">{audio.bpmEstimate || 128} BPM</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-6 text-center text-xs text-slate-400 font-mono">
                No audio track loaded
              </div>
            )}
          </div>

          <label className="cursor-pointer flex items-center justify-center space-x-2 w-full py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-cyan-400 font-mono text-xs rounded border border-slate-800 hover:border-slate-700 transition-colors">
            <Upload className="w-3.5 h-3.5" />
            <span>SELECT AUDIO FILE</span>
            <input type="file" accept="audio/*" className="hidden" onChange={handleAudioFileChange} />
          </label>
        </div>

        {/* SLOT 2: ART */}
        <div className="bg-slate-950 border border-slate-800/90 rounded-lg p-4 space-y-3 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
              <div className="flex items-center space-x-2 text-fuchsia-400">
                <ImageIcon className="w-4 h-4" />
                <span className="font-mono text-xs font-bold tracking-wider uppercase text-slate-200">
                  SLOT 02 • ART
                </span>
              </div>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/50">
                {image ? "LOADED" : "EMPTY"}
              </span>
            </div>

            {image ? (
              <div className="flex items-center space-x-3 bg-slate-900/60 p-2.5 rounded border border-slate-800">
                <div className="w-14 h-14 rounded overflow-hidden bg-slate-950 border border-slate-800 shrink-0 flex items-center justify-center">
                  {image.previewUrl ? (
                    <img src={image.previewUrl} alt="Cover Preview" className="w-full h-full object-cover" />
                  ) : (
                    <ImageIcon className="w-6 h-6 text-slate-400" />
                  )}
                </div>
                <div className="font-mono text-xs truncate space-y-1">
                  <p className="text-slate-200 font-semibold truncate" title={image.filename}>
                    {image.filename}
                  </p>
                  <p className="text-[10px] text-slate-400">{image.mimeType}</p>
                </div>
              </div>
            ) : (
              <div className="py-6 text-center text-xs text-slate-400 font-mono">
                No cover art loaded
              </div>
            )}
          </div>

          <label className="cursor-pointer flex items-center justify-center space-x-2 w-full py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-fuchsia-400 font-mono text-xs rounded border border-slate-800 hover:border-slate-700 transition-colors">
            <Upload className="w-3.5 h-3.5" />
            <span>SELECT ART IMAGE</span>
            <input type="file" accept="image/*" className="hidden" onChange={handleImageFileChange} />
          </label>
        </div>

        {/* SLOT 3: LYRICS */}
        <div className="bg-slate-950 border border-slate-800/90 rounded-lg p-4 space-y-3 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
              <div className="flex items-center space-x-2 text-amber-400">
                <FileText className="w-4 h-4" />
                <span className="font-mono text-xs font-bold tracking-wider uppercase text-slate-200">
                  SLOT 03 • LYRICS
                </span>
              </div>
              <div className="flex items-center space-x-1 text-[10px] font-mono text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/50">
                {lyricAnalysis.stats.isMonotonic ? (
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                ) : (
                  <AlertCircle className="w-3 h-3 text-amber-400" />
                )}
                <span>{lyricAnalysis.stats.lineCount} CUES</span>
              </div>
            </div>

            <textarea
              value={lyrics}
              onChange={(e) => onLyricsChange(e.target.value)}
              placeholder="Paste or type song lyrics here..."
              rows={4}
              className="w-full bg-slate-900 border border-slate-800 rounded p-2.5 font-mono text-xs text-slate-200 focus:outline-none focus:border-amber-500/70 resize-none"
            />

            <button
              onClick={handleParseAndCleanLyrics}
              disabled={isParsingLyrics || !lyrics.trim()}
              className="flex items-center justify-center space-x-2 w-full py-2 bg-amber-950/60 hover:bg-amber-900/60 text-amber-300 disabled:opacity-50 font-mono text-xs font-semibold rounded border border-amber-800/60 hover:border-amber-700 transition-colors cursor-pointer"
            >
              {isParsingLyrics ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
                  <span>PARSING TIMING & TAGS...</span>
                </>
              ) : (
                <>
                  <Wand2 className="w-3.5 h-3.5 text-amber-400" />
                  <span>PARSE TIMING & STRIP TAGS</span>
                </>
              )}
            </button>

            {parseNotice && (
              <p className="text-[10px] font-mono text-emerald-400 bg-emerald-950/40 p-1.5 rounded border border-emerald-900/60">
                {parseNotice}
              </p>
            )}
          </div>

          {/* Real-time Lyrics Machine Status Badge */}
          <div className="bg-slate-900/60 p-2 rounded border border-slate-800/80 font-mono text-[10px] space-y-1">
            <div className="flex justify-between text-slate-400">
              <span>PREPROCESSING STATUS</span>
              <span className="text-amber-400 uppercase font-bold">
                {lyricAnalysis.stats.timingSource} timing
              </span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>MONOTONICITY PROOF</span>
              <span className={lyricAnalysis.stats.isMonotonic ? "text-emerald-400 font-bold" : "text-amber-400 font-bold"}>
                {lyricAnalysis.stats.isMonotonic ? "VERIFIED MONOTONIC" : "NON-MONOTONIC"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
