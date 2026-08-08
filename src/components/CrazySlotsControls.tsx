import React from "react";
import { Sliders, Sparkles, Flame, Eye, Cpu, Compass, Disc } from "lucide-react";
import { CrazySlotsControls as ControlsType } from "../server/geminiProposer";

interface Props {
  controls: ControlsType;
  onChange: (controls: ControlsType) => void;
  disabled?: boolean;
}

const CONTROL_CONFIG: Array<{
  key: keyof ControlsType;
  label: string;
  icon: React.ElementType;
  lowLabel: string;
  highLabel: string;
  description: string;
  accentColor: string;
}> = [
  {
    key: "possession",
    label: "POSSESSION",
    icon: Flame,
    lowLabel: "Subtle",
    highLabel: "Overridden",
    description: "Overall spectral intensity & creative override bias",
    accentColor: "from-amber-500 to-orange-600",
  },
  {
    key: "foreignMatter",
    label: "FOREIGN MATTER",
    icon: Sparkles,
    lowLabel: "Pure",
    highLabel: "Anomaly",
    description: "Strength & likelihood of unprovoked foreign visual bodies",
    accentColor: "from-fuchsia-500 to-purple-600",
  },
  {
    key: "rhythmicObedience",
    label: "RHYTHMIC OBEDIENCE",
    icon: Disc,
    lowLabel: "Fluid Drift",
    highLabel: "Strict Lock",
    description: "Transient synchronization rigidity vs unanchored motion",
    accentColor: "from-cyan-500 to-blue-600",
  },
  {
    key: "imageLoyalty",
    label: "IMAGE LOYALTY",
    icon: Eye,
    lowLabel: "Radical Shift",
    highLabel: "Strict Mirror",
    description: "Palette & texture adherence to uploaded artwork",
    accentColor: "from-emerald-500 to-teal-600",
  },
  {
    key: "topologyRupture",
    label: "TOPOLOGY RUPTURE",
    icon: Compass,
    lowLabel: "Platonic",
    highLabel: "Fractured",
    description: "Geometrical deformation and manifold warping bias",
    accentColor: "from-rose-500 to-red-600",
  },
  {
    key: "materialRot",
    label: "MATERIAL ROT",
    icon: Cpu,
    lowLabel: "Pristine",
    highLabel: "Decayed",
    description: "Oxidized, degraded copper, or quantum plasma texture bias",
    accentColor: "from-violet-500 to-indigo-600",
  },
];

export const CrazySlotsControlsPanel: React.FC<Props> = ({ controls, onChange, disabled }) => {
  const handleChange = (key: keyof ControlsType, value: number) => {
    onChange({ ...controls, [key]: value });
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-2xl space-y-4">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center space-x-2">
          <Sliders className="w-5 h-5 text-cyan-400" />
          <h2 className="font-mono text-sm uppercase tracking-widest text-slate-200 font-semibold">
            CREATIVE DIALS & SWITCHES
          </h2>
        </div>
        <span className="text-xs font-mono text-slate-400 bg-slate-950 px-2.5 py-1 rounded-md border border-slate-800">
          PROPOSAL STEERING
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {CONTROL_CONFIG.map((cfg) => {
          const Icon = cfg.icon;
          const val = controls[cfg.key];

          return (
            <div
              key={cfg.key}
              className="bg-slate-950 border border-slate-800/80 rounded-lg p-3.5 space-y-2 hover:border-slate-700 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Icon className="w-4 h-4 text-cyan-400" />
                  <span className="text-xs font-mono font-bold tracking-wider text-slate-300">
                    {cfg.label}
                  </span>
                </div>
                <span className="font-mono text-xs font-bold text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/50">
                  {val}%
                </span>
              </div>

              <input
                type="range"
                min={0}
                max={100}
                value={val}
                disabled={disabled}
                onChange={(e) => handleChange(cfg.key, Number(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400 disabled:opacity-50"
              />

              <div className="flex justify-between text-[10px] font-mono text-slate-400">
                <span>{cfg.lowLabel}</span>
                <span>{cfg.highLabel}</span>
              </div>

              <p className="text-[11px] text-slate-400 leading-tight pt-1">
                {cfg.description}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
};
