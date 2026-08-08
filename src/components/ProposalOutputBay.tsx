import React, { useState } from "react";
import { Download, CheckCircle, ShieldCheck, Sparkles, FileCode, ArrowRight, Eye, Code, Terminal } from "lucide-react";
import { AudioInputData, ImageInputData, LockState, PlanProposal } from "../types/toaster";
import { toasterProposalFilename, toToasterProposalTransferV1 } from "../lib/toasterProposalTransfer";

interface Props {
  proposal: PlanProposal | null;
  audio: AudioInputData | null;
  image: ImageInputData | null;
  lockState: LockState;
  seed: number;
}

export const ProposalOutputBay: React.FC<Props> = ({
  proposal,
  audio,
  image,
  lockState,
  seed,
}) => {
  const [testResult, setTestResult] = useState<any>(null);
  const [isTestingAdmission, setIsTestingAdmission] = useState<boolean>(false);
  const [showJsonInspector, setShowJsonInspector] = useState<boolean>(false);

  if (!proposal) {
    return (
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-8 text-center space-y-3 shadow-2xl font-mono text-slate-400">
        <Sparkles className="w-8 h-8 mx-auto text-slate-600" />
        <p className="text-sm">Pull Crazy Slots above to produce your proposal export.</p>
      </div>
    );
  }

  // Generate transfer JSON object
  const transfer = toToasterProposalTransferV1(proposal, {
    audio,
    image,
    lockState,
  });

  const filename = toasterProposalFilename(proposal);

  const handleDownload = () => {
    const blob = new Blob([JSON.stringify(transfer, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  };

  const handleTestAdmission = async () => {
    setIsTestingAdmission(true);
    try {
      const creativeProposalPayload = {
        id: proposal.id,
        proposalType: proposal.proposalType,
        title: proposal.title,
        evidence: [],
        requestedAxes: {
          topology: transfer.suggestedVisualScore.topology,
          motion: transfer.suggestedVisualScore.motion,
          palette: transfer.suggestedVisualScore.palette,
          material: transfer.suggestedVisualScore.material,
          lyric: transfer.suggestedVisualScore.lyric,
          camera: transfer.suggestedVisualScore.camera,
          temporalDensity: transfer.suggestedVisualScore.temporalDensity,
          influence: {
            energyBias: 0,
            transientDensity: 0.2,
            lyricDensity: 0.2,
            contrastBias: 0,
            motionVariance: 0.2,
            imperfection: 0.2,
          },
        },
        rationale: proposal.rationale,
        provenance: {
          source: "gemini",
          deterministicReplay: true,
          seed,
        },
      };

      const analysisFixture = {
        schema: "haunted-toaster/audio-analysis-fixture/v1",
        durationSeconds: audio?.durationSeconds || 180,
        sections: [
          { startSeconds: 0, endSeconds: 30, energy: 0.2, label: "Intro" },
          { startSeconds: 30, endSeconds: 180, energy: 0.8, label: "Main" },
        ],
        phrases: [],
        transients: [],
      };

      const garmentConstraintsFixture = {
        schema: "haunted-toaster/garment-constraints/v1",
        id: "crazy-slots-v1",
        topology: { allowed: ["linear", "circle", "mirrored-ring"] },
        motion: {
          grammar: { allowed: ["still", "drift", "pulse", "orbit", "fracture"] },
          amplitude: { min: 0.1, max: 0.9 },
          variance: { min: 0.01, max: 0.5 },
        },
        palette: {
          logic: { allowed: ["garment", "analogous", "duotone"] },
          bleed: { min: 0.1, max: 0.9 },
          contrastBias: { min: -0.5, max: 0.5 },
        },
        material: {
          texture: { allowed: ["clean", "grain", "photocopy", "gate-weave"] },
          imperfection: { min: 0.01, max: 0.5 },
        },
        lyric: {
          placement: { allowed: ["lower-third", "center", "ghost"] },
          densityBias: { min: -0.5, max: 0.5 },
        },
        camera: {
          grammar: { allowed: ["locked", "drift", "push", "orbit"] },
          variance: { min: 0.01, max: 0.5 },
        },
        temporalDensity: { allowed: ["frozen", "section", "phrase"] },
        influence: {
          energyBias: { min: -0.5, max: 0.6 },
          transientDensity: { min: 0, max: 0.8 },
          lyricDensity: { min: 0, max: 0.8 },
          contrastBias: { min: -0.5, max: 0.5 },
          motionVariance: { min: 0, max: 0.8 },
          imperfection: { min: 0, max: 0.8 },
        },
        patchPolicy: {
          maxPatches: 16,
          entropyBudget: 40,
          axes: {},
        },
      };

      const rendererProfileFixture = {
        schema: "haunted-toaster/renderer-profile/v1",
        id: "toaster-raster-1",
        canvas: { width: 1920, height: 1080, fps: 30 },
        timebase: 1000,
        colorSpace: "srgb",
        fontAssets: {
          title: "dummy_font_title_hash",
          lyrics: "dummy_font_lyrics_hash",
        },
        encoder: { codec: "h264", profile: "high-4.2", pixelFormat: "yuv420p", crf: 19 },
      };

      const response = await fetch("/api/toaster/admit-and-resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          proposal: creativeProposalPayload,
          analysis: analysisFixture,
          constraints: garmentConstraintsFixture,
          profile: rendererProfileFixture,
        }),
      });

      const data = await response.json();
      setTestResult(data);
    } catch (err: any) {
      setTestResult({ success: false, error: err.message });
    } finally {
      setIsTestingAdmission(false);
    }
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-6 shadow-2xl space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-mono font-bold text-amber-400 bg-amber-950/80 px-2.5 py-0.5 rounded border border-amber-800/60 uppercase">
              {proposal.proposalType}
            </span>
            <span className="text-xs font-mono text-emerald-400 flex items-center space-x-1 bg-emerald-950/60 px-2.5 py-0.5 rounded border border-emerald-800/50">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>TRANSFER BOUNDARY READY</span>
            </span>
          </div>
          <h2 className="text-lg font-mono font-bold text-slate-100">{proposal.title}</h2>
          <p className="text-xs text-slate-400">{proposal.tagline}</p>
        </div>

        <button
          onClick={handleDownload}
          className="flex items-center justify-center space-x-2 px-5 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-mono text-xs font-bold rounded-lg shadow-lg shadow-emerald-500/20 transition-all cursor-pointer shrink-0"
        >
          <Download className="w-4 h-4" />
          <span>DOWNLOAD .TOASTER-PROPOSAL.JSON</span>
        </button>
      </div>

      {/* Foreign Element Callout */}
      {proposal.foreignElement && (
        <div className="bg-purple-950/40 border border-purple-800/60 p-3.5 rounded-lg text-xs font-mono text-purple-200 flex items-center space-x-2">
          <Sparkles className="w-4 h-4 text-purple-400 shrink-0" />
          <div>
            <span className="font-bold text-purple-300">UNPROVOKED FOREIGN ELEMENT: </span>
            <span>{proposal.foreignElement}</span>
          </div>
        </div>
      )}

      {/* Suggested Canonical Vocabulary Grid */}
      <div className="space-y-2">
        <h3 className="font-mono text-xs uppercase tracking-wider text-slate-400 font-semibold flex items-center space-x-1.5">
          <FileCode className="w-4 h-4 text-cyan-400" />
          <span>SUGGESTED VISUAL SCORE (TRANSFER BOUNDARY)</span>
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5 font-mono text-xs">
          <div className="bg-slate-950 p-2.5 rounded border border-slate-800/80">
            <span className="text-[10px] text-slate-400 block">TOPOLOGY</span>
            <span className="text-cyan-400 font-bold">{transfer.suggestedVisualScore.topology}</span>
          </div>
          <div className="bg-slate-950 p-2.5 rounded border border-slate-800/80">
            <span className="text-[10px] text-slate-400 block">MOTION</span>
            <span className="text-cyan-400 font-bold">{transfer.suggestedVisualScore.motion.grammar}</span>
          </div>
          <div className="bg-slate-950 p-2.5 rounded border border-slate-800/80">
            <span className="text-[10px] text-slate-400 block">MATERIAL</span>
            <span className="text-cyan-400 font-bold">{transfer.suggestedVisualScore.material.texture}</span>
          </div>
          <div className="bg-slate-950 p-2.5 rounded border border-slate-800/80">
            <span className="text-[10px] text-slate-400 block">PALETTE</span>
            <span className="text-cyan-400 font-bold">{transfer.suggestedVisualScore.palette.logic}</span>
          </div>
          <div className="bg-slate-950 p-2.5 rounded border border-slate-800/80">
            <span className="text-[10px] text-slate-400 block">LYRIC PLACEMENT</span>
            <span className="text-cyan-400 font-bold">{transfer.suggestedVisualScore.lyric.placement}</span>
          </div>
          <div className="bg-slate-950 p-2.5 rounded border border-slate-800/80">
            <span className="text-[10px] text-slate-400 block">CAMERA</span>
            <span className="text-cyan-400 font-bold">{transfer.suggestedVisualScore.camera.grammar}</span>
          </div>
          <div className="bg-slate-950 p-2.5 rounded border border-slate-800/80">
            <span className="text-[10px] text-slate-400 block">TEMPORAL</span>
            <span className="text-cyan-400 font-bold">{transfer.suggestedVisualScore.temporalDensity}</span>
          </div>
        </div>
      </div>

      {/* Secondary Tools: View Transfer JSON & Test Haunted Toaster Admission */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800">
        <button
          onClick={() => setShowJsonInspector(!showJsonInspector)}
          className="flex items-center space-x-1.5 text-xs font-mono text-slate-300 hover:text-cyan-400 bg-slate-950 px-3 py-1.5 rounded border border-slate-800 hover:border-slate-700 transition-colors"
        >
          <Code className="w-3.5 h-3.5" />
          <span>{showJsonInspector ? "HIDE" : "VIEW"} EXPORT JSON</span>
        </button>

        <button
          onClick={handleTestAdmission}
          disabled={isTestingAdmission}
          className="flex items-center space-x-1.5 text-xs font-mono text-amber-300 hover:text-amber-200 bg-amber-950/40 hover:bg-amber-950/70 px-3.5 py-1.5 rounded border border-amber-800/60 transition-colors"
        >
          <Terminal className="w-3.5 h-3.5" />
          <span>{isTestingAdmission ? "VERIFYING ADMISSION..." : "TEST HAUNTED TOASTER ADMISSION PROOF"}</span>
        </button>
      </div>

      {/* JSON Inspector */}
      {showJsonInspector && (
        <div className="bg-slate-950 rounded-lg p-4 border border-slate-800 font-mono text-xs overflow-x-auto space-y-2">
          <div className="flex justify-between items-center text-slate-400 pb-2 border-b border-slate-900">
            <span>EXPORT BOUNDARY: {filename}</span>
            <span className="text-[10px] bg-slate-900 px-2 py-0.5 rounded">schema: toaster-lab/proposal-transfer/v1</span>
          </div>
          <pre className="text-cyan-300 text-[11px] leading-relaxed">
            {JSON.stringify(transfer, null, 2)}
          </pre>
        </div>
      )}

      {/* Test Admission Proof Modal/Box */}
      {testResult && (
        <div className="bg-slate-950 border border-emerald-800/80 rounded-lg p-4 font-mono text-xs space-y-2">
          <div className="flex items-center space-x-2 text-emerald-400 font-bold border-b border-slate-900 pb-2">
            <CheckCircle className="w-4 h-4" />
            <span>HAUNTED TOASTER ADMISSION PROOF: {testResult.success ? "ACCEPTED & RESOLVED" : "REJECTED"}</span>
          </div>

          {testResult.success && testResult.result && (
            <div className="space-y-1.5 text-slate-300 text-[11px]">
              <div>
                <span className="text-slate-400">CANONICAL SCORE ADDRESS: </span>
                <span className="text-cyan-400 font-bold">{testResult.result.canonicalScoreAddress}</span>
              </div>
              <div>
                <span className="text-slate-400">STATUS: </span>
                <span className="text-emerald-400 font-bold">{testResult.result.status}</span>
              </div>
            </div>
          )}

          {!testResult.success && (
            <p className="text-rose-400 text-[11px]">{testResult.error || "Admission test failed."}</p>
          )}
        </div>
      )}
    </div>
  );
};
