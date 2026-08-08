# Toast Lab — Crazy Slots Proposal Appliance

> **Toast Lab** is a compact proposal appliance for [Haunted Toaster](https://github.com/the-static-collective/the-haunted-toaster). It receives song audio, cover art, and lyrics, pre-processes them into structured evidence, requests **one** creative proposal from Gemini, translates that proposal into the `toaster-lab/proposal-transfer/v1` export boundary, and exports a downloadable `.toaster-proposal.json` file.

---

## 🎛️ Product Law & Architecture

Toast Lab is **not** a chat application and does **not** manage execution state or video rendering. It serves a single purpose: **Authoring Intent Creation**.

### Non-Negotiable Pipeline

```text
song + art + lyrics
        │
        ▼
local factual preprocessing (Lyric Machine)
        │
        ▼
NormalizedInputBundle
        │
        ▼
Gemini creative proposal (Crazy Slots Engine)
        │
        ▼
STRICT deterministic translator / validator
        │
        ▼
toaster-lab/proposal-transfer/v1
        │
        ▼
Haunted Toaster admission & execution
```

### Sovereign Responsibilities

* **Gemini** is sovereign over taste, metaphor, visual association, and aesthetic atmosphere.
* **Haunted Toaster** is sovereign over protocol validation, canonical score addressing, resolved timelines, six-up proposal galleries, mutation, and final rendering.
* **Gemini is NOT sovereign** over protocol validity, canonical score addresses, or resolved execution state.

---

## ✨ Key Features

### 1. Primary Equipment Slots
* **Slot 01 (Song)**: Audio track duration and BPM metadata tracking.
* **Slot 02 (Art)**: High-resolution cover artwork analysis.
* **Slot 03 (Lyrics)**: Interactive lyric editor with real-time monotonicity checks and timing status.

### 2. Lyric Machine Preprocessor
* **Tag & Junk Stripping**: Removes section markers (`[Verse 1]`, `[Chorus]`, `Verse:`, `(Outro)`) and stray quotes without altering character text or inventing missing lyrics.
* **Monotonic LRC Cue Derivation**: Automatically maps lines to monotonic timestamps `[mm:ss.xx]` bounded strictly within track duration.
* **Timing Provenance**: Categorizes timing sources as `provided`, `derived`, `estimated`, or `unknown`.
* **Gemini & Local Hybrid**: Uses server-side Gemini AI for intelligent timing parsing, seamlessly falling back to a deterministic local parser when offline or rate-limited.

### 3. Mysterious Creative Dials & Switches
Adjust proposal generation parameters before pulling the trigger:
* **Possession**: Overall spectral intensity and creative override bias.
* **Foreign Matter**: Strength and frequency of unprovoked alien/foreign visual bodies.
* **Rhythmic Obedience**: Transient synchronization rigidity vs. unanchored motion drift.
* **Image Loyalty**: Palette and texture adherence to uploaded artwork.
* **Topology Rupture**: Bias towards folded manifolds, hyper-torus, and fractured geometry.
* **Material Rot**: Bias towards oxidized copper, quantum plasma, or decayed textures.

### 4. Deterministic Transfer Export
Generates a valid `.toaster-proposal.json` file compliant with schema `toaster-lab/proposal-transfer/v1` containing:
* `suggestedVisualScore` (`authority: "non-canonical-suggestion"`)
* Raw intent metadata (topology, motion, material, camera, palette)
* Multi-modal rationale and confidence metrics

---

## 🚀 Getting Started

### Prerequisites
* **Node.js**: v22.x or higher
* **npm**: v10.x or higher

### 1. Clone & Install
```bash
git clone https://github.com/your-org/toast-lab.git
cd toast-lab
npm install
```

### 2. Configure Environment
Copy `.env.example` to `.env` and set your Gemini API key (optional; deterministic local engine acts as automatic fallback if omitted or rate-limited):
```bash
cp .env.example .env
```

```env
GEMINI_API_KEY=your_gemini_api_key_here
```

### 3. Start Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🧪 Verification & Proof Suites

Toast Lab includes three automated proof scripts to verify the product contract and the bridge to Haunted Toaster:

```bash
# Run all verification suites
npm test
```

### Individual Verification Commands

| Command | Description |
| :--- | :--- |
| `npm run lint` | Runs TypeScript type checking (`tsc --noEmit`). |
| `npm run test:product-contract` | Verifies machine-readable product law in `product-contract.json`. |
| `npm run test:bridge` | Proves `CreativeProposal -> HT validation -> Canonical Address -> ResolvedTimeline`. |
| `npm run test:transfer` | Proves `GenerationPlan -> Deterministic Non-Canonical Transfer -> Downloadable JSON`. |
| `npm run build` | Compiles Vite frontend and bundles server via `esbuild`. |

---

## 🛠️ Repository Structure

```text
.
├── .github/workflows/        # CI workflow (bridge-proof.yml)
├── scripts/                  # Machine-readable proof scripts
│   ├── prove-haunted-toaster-bridge.ts
│   ├── prove-product-contract.ts
│   └── prove-proposal-transfer.ts
├── src/
│   ├── components/           # Hardware appliance UI components
│   │   ├── SlotBay.tsx
│   │   ├── CrazySlotsControls.tsx
│   │   ├── CrazySlotsTrigger.tsx
│   │   └── ProposalOutputBay.tsx
│   ├── lib/                  # Core logic & deterministic translators
│   │   ├── lyricMachine.ts
│   │   ├── toasterProposalTransfer.ts
│   │   └── toasterEngine.ts
│   ├── server/               # Server-side Gemini & Haunted Toaster bridge
│   │   ├── geminiProposer.ts
│   │   └── hauntedToasterAuthority.ts
│   └── types/                # Shared TypeScript definitions
├── product-contract.json     # Machine-readable Toast Lab product rules
├── server.ts                 # Express entry point with Vite middleware
├── package.json
└── README.md
```

---

## 📜 License

MIT License — see project details.
