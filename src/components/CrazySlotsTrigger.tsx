import React from "react";
import { Zap, Loader2, Sparkles } from "lucide-react";

interface Props {
  onPull: () => void;
  isGenerating: boolean;
  disabled?: boolean;
}

export const CrazySlotsTrigger: React.FC<Props> = ({ onPull, isGenerating, disabled }) => {
  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-6 shadow-2xl flex flex-col items-center justify-center space-y-4 text-center">
      <div className="flex items-center space-x-2">
        <Sparkles className="w-5 h-5 text-amber-400 animate-pulse" />
        <h2 className="font-mono text-xs uppercase tracking-widest text-slate-400">
          HARDWARE TRIGGER APPLIANCE
        </h2>
      </div>

      <button
        onClick={onPull}
        disabled={isGenerating || disabled}
        className={`group relative overflow-hidden w-full max-w-xl py-5 px-8 rounded-2xl font-mono text-base sm:text-lg font-black uppercase tracking-widest text-slate-950 transition-all duration-300 shadow-xl border ${
          isGenerating
            ? "bg-slate-800 text-slate-500 border-slate-700 cursor-not-allowed"
            : "bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 border-amber-300 shadow-amber-500/20 hover:shadow-amber-500/40 active:scale-[0.99]"
        }`}
      >
        <div className="flex items-center justify-center space-x-3">
          {isGenerating ? (
            <>
              <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
              <span>SYNTHESIZING PROPOSAL...</span>
            </>
          ) : (
            <>
              <Zap className="w-6 h-6 text-slate-950 fill-slate-950 group-hover:scale-110 transition-transform" />
              <span>PULL CRAZY SLOTS</span>
            </>
          )}
        </div>
      </button>

      <p className="text-xs font-mono text-slate-400 max-w-md">
        One pull asks Gemini for exactly <span className="text-amber-400 font-bold">one creative proposal</span>, then deterministically translates it into a downloadable <code className="text-cyan-400">.toaster-proposal.json</code> file.
      </p>
    </div>
  );
};
