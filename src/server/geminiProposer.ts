/**
 * Toaster Lab - Server-Side Gemini proposal service.
 * Gemini authors one non-canonical proposal. Haunted Toaster remains the only
 * canonical execution authority.
 */

import { GoogleGenAI, Type } from "@google/genai";
import {
  AnalysisMode,
  GarmentConstraint,
  GenerationPlan,
  LockState,
  PlanProposal,
} from "../types/toaster";
import {
  DEFAULT_GARMENT_CONSTRAINT,
  inspectAuthoringGuidance,
  applyLocks,
  TOPOLOGIES,
  MATERIALS,
  MOTION_GRAMMARS,
  CAMERA_GRAMMARS,
  LYRIC_BEHAVIORS,
  TEMPORAL_DENSITIES,
} from "../lib/toasterEngine";
import { cleanAndTagLyricsLocally } from "../lib/lyricMachine";

let aiClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("GEMINI_API_KEY is missing. Falling back to seeded proposal material.");
    }
    aiClient = new GoogleGenAI({
      apiKey: apiKey || "dummy_key",
      httpOptions: { headers: { "User-Agent": "aistudio-build" } },
    });
  }
  return aiClient;
}

export interface CrazySlotsControls {
  possession: number;
  foreignMatter: number;
  rhythmicObedience: number;
  imageLoyalty: number;
  topologyRupture: number;
  materialRot: number;
}

export interface ProposeRequestPayload {
  mode: AnalysisMode;
  counterfactualRemovedModality?: "audio" | "lyrics" | "image";
  audioInfo?: { filename: string; durationSeconds: number; bpmEstimate?: number };
  lyrics?: string;
  imageInfo?: { filename: string; mimeType: string; base64?: string };
  seed: number;
  garmentConstraint?: GarmentConstraint;
  lockedPlan?: GenerationPlan | null;
  lockState?: LockState;
  noveltyTarget?: { topology?: string; material?: string; motionGrammar?: string; rationale?: string };
  crazySlotsControls?: CrazySlotsControls;
}

const DEFAULT_CONTROLS: CrazySlotsControls = {
  possession: 50,
  foreignMatter: 20,
  rhythmicObedience: 80,
  imageLoyalty: 75,
  topologyRupture: 30,
  materialRot: 25,
};

function proposalFromModel(
  payload: ProposeRequestPayload,
  guidance: GarmentConstraint,
  prop: any,
): PlanProposal {
  const proposalPlan = buildProposalPlan(payload, prop.requestedAxes || {});
  const lockedPlan = payload.lockState && payload.lockedPlan
    ? applyLocks(proposalPlan, payload.lockedPlan, payload.lockState)
    : proposalPlan;
  const guidanceWarnings = inspectAuthoringGuidance(lockedPlan, guidance);

  return {
    id: prop.id || `prop_slots_${payload.seed}`,
    proposalType: prop.proposalType || "faithful",
    title: prop.title || "Crazy Slots Proposal",
    tagline: prop.tagline || "Creative proposal material awaiting Haunted Toaster admission",
    plan: lockedPlan,
    rationale: Array.isArray(prop.rationale) ? prop.rationale : [],
    mutations: Array.isArray(prop.mutations) ? prop.mutations : [],
    confidence: typeof prop.confidence === "number" ? prop.confidence : 0.91,
    foreignElement: prop.foreignElement,
    ...(guidanceWarnings.length ? { guidanceWarnings } : {}),
  } as PlanProposal;
}

/** One product pull yields exactly one proposal object. */
export async function generateProposal(payload: ProposeRequestPayload): Promise<PlanProposal> {
  const apiKey = process.env.GEMINI_API_KEY;
  const guidance = payload.garmentConstraint || DEFAULT_GARMENT_CONSTRAINT;

  if (!apiKey) return generateFallbackProposal(payload, guidance);

  try {
    const controls = payload.crazySlotsControls || DEFAULT_CONTROLS;
    const audioText = payload.mode === "counterfactual" && payload.counterfactualRemovedModality === "audio"
      ? "AUDIO MODALITY EXCLUDED (COUNTERFACTUAL EXPERIMENT)"
      : payload.audioInfo
        ? `Audio track: ${payload.audioInfo.filename}, duration ${payload.audioInfo.durationSeconds}s, estimated BPM ${payload.audioInfo.bpmEstimate || 128}.`
        : "";
    const lyricsText = payload.mode === "counterfactual" && payload.counterfactualRemovedModality === "lyrics"
      ? "LYRICS MODALITY EXCLUDED (COUNTERFACTUAL EXPERIMENT)"
      : payload.lyrics ? `Song lyrics:\n${payload.lyrics}` : "";
    const imageText = payload.mode === "counterfactual" && payload.counterfactualRemovedModality === "image"
      ? "IMAGE MODALITY EXCLUDED (COUNTERFACTUAL EXPERIMENT)"
      : payload.imageInfo ? `Cover image filename: ${payload.imageInfo.filename}` : "";

    const controlsText = `CRAZY SLOTS AUTHORING CONTROLS:\n- Possession: ${controls.possession}%\n- Foreign Matter: ${controls.foreignMatter}%\n- Rhythmic Obedience: ${controls.rhythmicObedience}%\n- Image Loyalty: ${controls.imageLoyalty}%\n- Topology Rupture: ${controls.topologyRupture}%\n- Material Rot: ${controls.materialRot}%`;
    const noveltyText = payload.noveltyTarget
      ? `CREATIVE COVERAGE TARGET: topology=${payload.noveltyTarget.topology}, material=${payload.noveltyTarget.material}, motion=${payload.noveltyTarget.motionGrammar}. ${payload.noveltyTarget.rationale || ""}`
      : "";
    const lockedText = payload.lockState && payload.lockedPlan
      ? `AUTHORING LOCKS: Preserve these user-requested fields: ${JSON.stringify(payload.lockState)}.`
      : "";

    const systemPrompt = `You are Toaster Lab's Crazy Slots creative proposer for Haunted Toaster.\nProduce EXACTLY ONE CREATIVE PROPOSAL for this pull.\n\nYou are NOT the execution authority. Do not claim validity, canonical status, an address, a resolved timeline, or executability. Your output is authoring intent that Haunted Toaster may later admit.\n\nCurrent Lab vocabulary, for proposal guidance only:\n- topology: ${TOPOLOGIES.join(", ")}\n- material: ${MATERIALS.join(", ")}\n- motionGrammar: ${MOTION_GRAMMARS.join(", ")}\n- cameraGrammar: ${CAMERA_GRAMMARS.join(", ")}\n- lyricBehavior: ${LYRIC_BEHAVIORS.join(", ")}\n- temporalDensity: ${TEMPORAL_DENSITIES.join(", ")}\n\nInclude structured rationale for requested axes. Do not emit rendering code.`;

    const userPrompt = `Analysis Mode: ${payload.mode}\nDeclared authoring seed: ${payload.seed}\nAuthoring guidance profile: ${guidance.name}\n${controlsText}\n${audioText}\n${lyricsText}\n${imageText}\n${noveltyText}\n${lockedText}\n\nReturn one proposal object with requestedAxes, rationale, mutations, confidence, and optional foreignElement.`;

    const requestedAxesSchema = {
      type: Type.OBJECT,
      properties: {
        topology: { type: Type.STRING },
        material: { type: Type.STRING },
        motionGrammar: { type: Type.STRING },
        cameraGrammar: { type: Type.STRING },
        lyricBehavior: { type: Type.STRING },
        temporalDensity: { type: Type.STRING },
        paletteLogic: { type: Type.OBJECT },
        garmentParams: { type: Type.OBJECT },
      },
    };

    const proposalSchema = {
      type: Type.OBJECT,
      properties: {
        id: { type: Type.STRING },
        proposalType: { type: Type.STRING },
        title: { type: Type.STRING },
        tagline: { type: Type.STRING },
        confidence: { type: Type.NUMBER },
        foreignElement: { type: Type.STRING },
        requestedAxes: requestedAxesSchema,
        rationale: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              field: { type: Type.STRING },
              evidence: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    source: { type: Type.STRING },
                    interval: { type: Type.ARRAY, items: { type: Type.NUMBER } },
                    excerpt: { type: Type.STRING },
                    observation: { type: Type.STRING },
                  },
                },
              },
            },
          },
        },
        mutations: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              field: { type: Type.STRING },
              previous: { type: Type.STRING },
              proposed: { type: Type.STRING },
              reason: { type: Type.STRING },
            },
          },
        },
      },
    };

    const contentsParts: any[] = [];
    if (payload.imageInfo?.base64 && (payload.mode === "full" || payload.mode === "image_only")) {
      contentsParts.push({
        inlineData: {
          mimeType: payload.imageInfo.mimeType || "image/png",
          data: payload.imageInfo.base64.replace(/^data:image\/\w+;base64,/, ""),
        },
      });
    }
    contentsParts.push({ text: userPrompt });

    const response = await getGeminiClient().models.generateContent({
      model: "gemini-3.6-flash",
      contents: { parts: contentsParts },
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        responseSchema: proposalSchema,
        seed: payload.seed,
        temperature: 0.7,
      },
    });

    const rawText = response.text || "";
    let cleaned = rawText.trim();
    if (cleaned.startsWith("```")) {
      cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
    }

    let parsed: any;
    try {
      parsed = JSON.parse(cleaned);
    } catch (error) {
      const firstBrace = cleaned.indexOf("{");
      const lastBrace = cleaned.lastIndexOf("}");
      if (firstBrace === -1 || lastBrace <= firstBrace) throw error;
      parsed = JSON.parse(cleaned.substring(firstBrace, lastBrace + 1));
    }

    if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") {
      throw new TypeError("Gemini did not return one proposal object.");
    }

    return proposalFromModel(payload, guidance, parsed);
  } catch (err: any) {
    const isQuota = err?.status === "RESOURCE_EXHAUSTED" || err?.code === 429 ||
      (typeof err?.message === "string" && /quota|429|RESOURCE_EXHAUSTED/i.test(err.message));
    console.warn(
      isQuota
        ? "[Crazy Slots Engine] Gemini quota reached; using deterministic one-proposal fallback."
        : `[Crazy Slots Engine] Gemini unavailable; using deterministic one-proposal fallback: ${err?.message || err}`,
    );
    return generateFallbackProposal(payload, guidance);
  }
}

function buildProposalPlan(payload: ProposeRequestPayload, requestedAxes: Record<string, unknown>): GenerationPlan {
  const base = baseProposalPlan(payload);
  return {
    ...base,
    ...requestedAxes,
    meta: base.meta,
    paletteLogic: { ...base.paletteLogic, ...((requestedAxes.paletteLogic as Record<string, unknown>) || {}) } as GenerationPlan["paletteLogic"],
    garmentParams: { ...base.garmentParams, ...((requestedAxes.garmentParams as Record<string, unknown>) || {}) } as GenerationPlan["garmentParams"],
  } as GenerationPlan;
}

function baseProposalPlan(payload: ProposeRequestPayload): GenerationPlan {
  return {
    meta: {
      title: payload.audioInfo?.filename ? `Proposal: ${payload.audioInfo.filename}` : "Creative Proposal",
      artist: "Toaster Lab",
      seed: payload.seed,
      schemaVersion: "lab-proposal-compat",
      durationSeconds: payload.audioInfo?.durationSeconds || 180,
      bpm: payload.audioInfo?.bpmEstimate || 128,
    },
    topology: "platonic_solids",
    material: "anodized_titanium",
    paletteLogic: {
      primary: "#0F172A",
      secondary: "#38BDF8",
      accent: "#F43F5E",
      background: "#020617",
      mood: "cyber_twilight",
      shiftTrigger: "transient",
    },
    motionGrammar: "staccato_pulses",
    cameraGrammar: "orbital_macro",
    lyricBehavior: "kinetic_type",
    temporalDensity: "high",
    garmentParams: {
      maxStiffness: 0.7,
      fitMode: "draped",
      fabricMemory: 0.65,
      seamStressLimit: 100,
    },
    sceneBlocks: [],
  };
}

/** Seeded local fallback for proposal material only; never canonical execution. */
export function generateFallbackProposal(
  payload: ProposeRequestPayload,
  guidance: GarmentConstraint = payload.garmentConstraint || DEFAULT_GARMENT_CONSTRAINT,
): PlanProposal {
  const controls = payload.crazySlotsControls || DEFAULT_CONTROLS;
  const plan = baseProposalPlan(payload);

  if (controls.topologyRupture > 60) plan.topology = "hyper_torus";
  else if (controls.topologyRupture > 30) plan.topology = "folded_manifold";

  if (controls.materialRot > 60) plan.material = "decayed_copper";
  else if (controls.materialRot > 30) plan.material = "quantum_plasma";

  if (controls.rhythmicObedience < 40) plan.motionGrammar = "chaotic_snap";

  const preserved = payload.lockState && payload.lockedPlan
    ? applyLocks(plan, payload.lockedPlan, payload.lockState)
    : plan;
  const guidanceWarnings = inspectAuthoringGuidance(preserved, guidance);

  return {
    id: `prop_slots_${payload.seed}`,
    proposalType: controls.foreignMatter > 50 ? "foreign_body" : "faithful",
    title: "Crazy Slots Proposal",
    tagline: `Seed ${payload.seed} • Possession ${controls.possession}% • Foreign Matter ${controls.foreignMatter}% • Awaits Haunted Toaster admission`,
    plan: preserved,
    rationale: [{
      field: "topology",
      evidence: [{
        source: payload.mode === "lyrics_only" ? "lyrics" : "audio",
        interval: [0, 30],
        observation: `Derived from input evidence with Topology Rupture dial at ${controls.topologyRupture}%.`,
      }],
    }],
    mutations: [],
    confidence: 0.92,
    foreignElement: controls.foreignMatter > 30
      ? `A hovering void-glass monolith (intensity: ${controls.foreignMatter}%)`
      : undefined,
    ...(guidanceWarnings.length ? { guidanceWarnings } : {}),
  } as PlanProposal;
}

function containsLrcTimestamp(lyrics: string): boolean {
  return lyrics.split(/\r?\n/).some((line) => /^\s*\[\d{1,2}:\d{2}(?:\.\d{1,3})?\]/.test(line));
}

export type LyricProcessor = "gemini" | "local";
export type GeneratedLyricTimingSource = "provided" | "estimated";

/**
 * Clean lyrics while keeping processor provenance separate from timing provenance.
 * Existing LRC timestamps are preserved as provided evidence. Any timestamps created
 * from text + duration alone are estimates, regardless of whether Gemini or local code
 * created them.
 */
export async function parseAndCleanLyricsWithGemini(
  lyrics: string,
  durationSeconds: number = 180,
): Promise<{
  cleanedLyrics: string;
  processor: LyricProcessor;
  timingSource: GeneratedLyricTimingSource;
}> {
  if (!lyrics || !lyrics.trim()) {
    return { cleanedLyrics: "", processor: "local", timingSource: "estimated" };
  }

  if (containsLrcTimestamp(lyrics)) {
    const { cleanedText } = cleanAndTagLyricsLocally(lyrics, durationSeconds);
    return { cleanedLyrics: cleanedText, processor: "local", timingSource: "provided" };
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "dummy_key") {
    const { cleanedText } = cleanAndTagLyricsLocally(lyrics, durationSeconds);
    return { cleanedLyrics: cleanedText, processor: "local", timingSource: "estimated" };
  }

  try {
    const prompt = `You are a lyric text preprocessor.\n1. Strip section headers such as [Verse], [Chorus], Verse:, (Bridge), [Outro].\n2. Remove stray quote wrappers without inventing or rewriting lyric text.\n3. Add monotonic LRC timestamps in [mm:ss.xx] format distributed across ${durationSeconds} seconds.\n4. These timestamps are ESTIMATES based only on text length and track duration; do not claim audio alignment or sung-line detection.\n5. Return only cleaned timestamped lyric lines.`;

    const response = await getGeminiClient().models.generateContent({
      model: "gemini-3.6-flash",
      contents: `${prompt}\n\nRAW LYRICS:\n${lyrics}`,
    });

    const resultText = response.text?.trim() || "";
    if (resultText.length > 5) {
      const cleanedLyrics = resultText.replace(/^```[a-z]*\n?/i, "").replace(/\n?```$/i, "").trim();
      return { cleanedLyrics, processor: "gemini", timingSource: "estimated" };
    }
  } catch (err: any) {
    console.info(`[Lyric Processor] Gemini unavailable; using local deterministic estimates: ${err?.message || err}`);
  }

  const { cleanedText } = cleanAndTagLyricsLocally(lyrics, durationSeconds);
  return { cleanedLyrics: cleanedText, processor: "local", timingSource: "estimated" };
}
