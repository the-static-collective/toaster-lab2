import React, { useState, useEffect } from "react";
import { RefreshCw } from "lucide-react";
import { SlotBay } from "./components/SlotBay";
import { CrazySlotsControlsPanel } from "./components/CrazySlotsControls";
import { CrazySlotsTrigger } from "./components/CrazySlotsTrigger";
import { ProposalOutputBay } from "./components/ProposalOutputBay";

import {
  AudioInputData,
  ImageInputData,
  PlanProposal,
} from "./types/toaster";

import { CrazySlotsControls as ControlsType } from "./server/geminiProposer";
import { SAMPLE_AUDIO, SAMPLE_COVER_IMAGE, SAMPLE_LYRICS } from "./lib/sampleData";

export default function App() {
  const [seed, setSeed] = useState<number>(1042);
  const [audio, setAudio] = useState<AudioInputData | null>(SAMPLE_AUDIO);
  const [lyrics, setLyrics] = useState<string>(SAMPLE_LYRICS);
  const [image, setImage] = useState<ImageInputData | null>(SAMPLE_COVER_IMAGE);

  const [controls, setControls] = useState<ControlsType>({
    possession: 50,
    foreignMatter: 20,
    rhythmicObedience: 80,
    imageLoyalty: 75,
    topologyRupture: 30,
    materialRot: 25,
  });

  const [proposal, setProposal] = useState<PlanProposal | null>(null);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Initial synthesis on boot
  useEffect(() => {
    handlePullCrazySlots();
  }, []);

  // CRAZY SLOTS Pull Handler: one pull -> one proposal object.
  const handlePullCrazySlots = async () => {
    setIsGenerating(true);
    setErrorMsg(null);
    try {
      const response = await fetch("/api/toaster/analyze-and-propose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "full",
          audioInfo: audio ? { filename: audio.filename, durationSeconds: audio.durationSeconds, bpmEstimate: audio.bpmEstimate } : undefined,
          lyrics: lyrics || undefined,
          imageInfo: image ? { filename: image.filename, mimeType: image.mimeType, base64: image.base64 } : undefined,
          seed,
          crazySlotsControls: controls,
        }),
      });

      const data = await response.json();
      if (data.success && data.proposal) {
        setProposal(data.proposal);
      } else {
        setErrorMsg("Proposal generation produced an invalid payload. Try pulling again.");
      }
    } catch (err: any) {
      console.error("Crazy Slots pull error:", err);
      setErrorMsg(`Pull failed: ${err.message || "Unknown error"}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleResetToSamples = () => {
    setAudio(SAMPLE_AUDIO);
    setLyrics(SAMPLE_LYRICS);
    setImage(SAMPLE_COVER_IMAGE);
    setSeed(1042);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-amber-500 selection:text-slate-950">
      {/* Top Hardware Banner */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center font-mono font-black text-slate-950 text-sm shadow-md shadow-amber-500/20">
              TL
            </div>
            <div>
              <h1 className="font-mono text-sm font-bold tracking-widest text-slate-100 uppercase">
                TOAST LAB • CRAZY SLOTS
              </h1>
              <p className="text-[10px] font-mono text-slate-400">
                PROPOSAL TRANSFER ENGINE V1 • HAUNTED TOASTER BRIDGE
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3 font-mono text-xs">
            {/* Seed Control */}
            <div className="flex items-center space-x-2 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
              <span className="text-slate-400 text-[10px]">SEED:</span>
              <input
                type="number"
                value={seed}
                onChange={(e) => setSeed(Number(e.target.value) || 1)}
                className="w-16 bg-transparent text-amber-400 font-bold focus:outline-none"
              />
              <button
                onClick={() => setSeed(Math.floor(Math.random() * 90000) + 1000)}
                title="Random Seed"
                className="text-slate-400 hover:text-amber-400 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Appliance Surface */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* Error Notification */}
        {errorMsg && (
          <div className="bg-rose-950/80 border border-rose-800 text-rose-200 text-xs font-mono p-3.5 rounded-lg">
            {errorMsg}
          </div>
        )}

        {/* 1. Equipment Slots (SONG, ART, LYRICS) */}
        <SlotBay
          audio={audio}
          lyrics={lyrics}
          image={image}
          onAudioUpload={setAudio}
          onLyricsChange={setLyrics}
          onImageUpload={setImage}
          onResetToSamples={handleResetToSamples}
        />

        {/* 2. Mysterious Creative Dials & Switches */}
        <CrazySlotsControlsPanel
          controls={controls}
          onChange={setControls}
          disabled={isGenerating}
        />

        {/* 3. Crazy Slots Pull Trigger */}
        <CrazySlotsTrigger
          onPull={handlePullCrazySlots}
          isGenerating={isGenerating}
        />

        {/* 4. Validated Proposal Export Bay */}
        <ProposalOutputBay
          proposal={proposal}
          audio={audio}
          image={image}
          lockState={{}}
          seed={seed}
        />
      </main>

      {/* Hardware Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-4 text-center text-xs font-mono text-slate-500">
        Toast Lab Appliance • Deterministic Bridge to Haunted Toaster v1 • Single Proposal Surface
      </footer>
    </div>
  );
}
