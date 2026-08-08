/**
 * Toaster Lab - Server-Side Gemini API Proposer Service
 * Uses @google/genai SDK to analyze inputs and emit creative proposal material.
 *
 * IMPORTANT: Gemini output is never canonical execution state. Haunted Toaster
 * alone validates, addresses, resolves, and confers executable meaning.
 */

import { GoogleGenAI, Type } from "@google/genai";
import {
  AnalysisMode,
  Evidence,
  GarmentConstraint,
  GenerationPlan,
  LockState,
  PlanProposal,
  RationaleItem,
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
  possession: number; // 0..100
  foreignMatter: number; // 0..100
  rhythmicObedience: number; // 0..100
  imageLoyalty: number; // 0..100
  topologyRupture: number; // 0..100
  materialRot: number; // 0..100
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

/**
 * Compatibility surface for the Crazy Slots appliance. The returned `plan` is proposal
 * material only and must not be represented as accepted or executable until a
 * Haunted Toaster canonical-admission result exists.
 */
export async function generateProposals(payload: ProposeRequestPayload): Promise<PlanProposal[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  const guidance = payload.garmentConstraint || DEFAULT_GARMENT_CONSTRAINT;

  if (!apiKey) return generateFallbackProposals(payload, guidance);

  try {
    const ai = getGeminiClient();
    let audioText = "";
    if (payload.mode !== "seed_only" && payload.mode !== "lyrics_only" && payload.mode !== "image_only") {
      audioText = payload.mode === "counterfactual" && payload.counterfactualRemovedModality === "audio"
        ? "AUDIO MODALITY EXCLUDED (COUNTERFACTUAL EXPERIMENT)"
        : payload.audioInfo
          ? `Audio track: ${payload.audioInfo.filename}, Duration: ${payload.audioInfo.durationSeconds}s, Estimated BPM: ${payload.audioInfo.bpmEstimate || 128}.`
          : "";
    }

    let lyricsText = "";
    if (payload.mode !== "seed_only" && payload.mode !== "audio_only" && payload.mode !== "image_only") {
      lyricsText = payload.mode === "counterfactual" && payload.counterfactualRemovedModality === "lyrics"
        ? "LYRICS MODALITY EXCLUDED (COUNTERFACTUAL EXPERIMENT)"
        : payload.lyrics ? `Song Lyrics:\n${payload.lyrics}` : "";
    }

    let imageText = "";
    if (payload.mode !== "seed_only" && payload.mode !== "audio_only" && payload.mode !== "lyrics_only") {
      imageText = payload.mode === "counterfactual" && payload.counterfactualRemovedModality === "image"
        ? "IMAGE MODALITY EXCLUDED (COUNTERFACTUAL EXPERIMENT)"
        : payload.imageInfo ? `Cover Image filename: ${payload.imageInfo.filename}` : "";
    }

    const controls = payload.crazySlotsControls || {
      possession: 50,
      foreignMatter: 20,
      rhythmicObedience: 80,
      imageLoyalty: 75,
      topologyRupture: 30,
      materialRot: 25,
    };

    const controlsText = `CRAZY SLOTS HARDWARE CONTROLS:
- Possession (${controls.possession}%): Overall intensity and spectral override.
- Foreign Matter (${controls.foreignMatter}%): Unprovoked alien anomaly / foreign body strength.
- Rhythmic Obedience (${controls.rhythmicObedience}%): Transient synchronization rigidity vs fluid drift.
- Image Loyalty (${controls.imageLoyalty}%): Palette & texture adherence to cover art.
- Topology Rupture (${controls.topologyRupture}%): Preference for folded, fractured, or hyper-torus geometries.
- Material Rot (${controls.materialRot}%): Preference for decayed copper, quantum plasma, or oxidized textures.`;

    const noveltyText = payload.noveltyTarget
      ? `CREATIVE COVERAGE TARGET: topology=${payload.noveltyTarget.topology}, material=${payload.noveltyTarget.material}, motion=${payload.noveltyTarget.motionGrammar}. ${payload.noveltyTarget.rationale || ""}`
      : "";

    const lockedText = payload.lockState && payload.lockedPlan
      ? `AUTHORING LOCKS: Preserve these user-requested fields when forming proposal material: ${JSON.stringify(payload.lockState)}.`
      : "";

    const systemPrompt = `You are Toaster Lab's Crazy Slots creative proposer for Haunted Toaster.
Produce EXACTLY ONE CREATIVE PROPOSAL for this pull.

You are NOT the execution authority. Do not claim validity, canonical status, an address, a resolved timeline, or executability. Your output is authoring intent that will later be adapted and submitted to Haunted Toaster for canonical admission.

Current Lab vocabulary, for proposal guidance only:
- topology: ${TOPOLOGIES.join(", ")}
- material: ${MATERIALS.join(", ")}
- motionGrammar: ${MOTION_GRAMMARS.join(", ")}
- cameraGrammar: ${CAMERA_GRAMMARS.join(", ")}
- lyricBehavior: ${LYRIC_BEHAVIORS.join(", ")}
- temporalDensity: ${TEMPORAL_DENSITIES.join(", ")}

Include structured rationale for requested axes. Do not emit rendering code. Do not describe your proposal as schema-valid merely because it fits this Lab vocabulary.`;

    const userPrompt = `Analysis Mode: ${payload.mode}
Declared authoring seed: ${payload.seed}
Authoring guidance profile: ${guidance.name}
${controlsText}
${audioText}
${lyricsText}
${imageText}
${noveltyText}
${lockedText}

Return exactly one proposal object with requestedAxes, rationale, mutations, confidence, and optional foreignElement.`;

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
        proposals: {
          type: Type.ARRAY,
          items: {
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
          },
        },
      },
    };

    const response = await ai.models.generateContent({
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
    let parsed: any = null;
    try {
      let cleaned = rawText.trim();
      if (cleaned.startsWith("```")) cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
      try {
        parsed = JSON.parse(cleaned);
      } catch (e) {
        const firstBrace = cleaned.indexOf("{");
        const lastBrace = cleaned.lastIndexOf("}");
        if (firstBrace === -1 || lastBrace <= firstBrace) throw e;
        parsed = JSON.parse(cleaned.substring(firstBrace, lastBrace + 1));
      }
    } catch (parseErr) {
      console.warn("Failed to parse Gemini proposal JSON, returning fallbacks:", parseErr);
      return generateFallbackProposals(payload, guidance);
    }

    if (parsed?.proposals && Array.isArray(parsed.proposals) && parsed.proposals.length > 0) {
      return parsed.proposals.map((prop: any, idx: number) => {
        const proposalPlan = buildProposalPlan(payload, prop.requestedAxes || {});
        const lockedPlan = payload.lockState && payload.lockedPlan
          ? applyLocks(proposalPlan, payload.lockedPlan, payload.lockState)
          : proposalPlan;
        const guidanceWarnings = inspectAuthoringGuidance(lockedPlan, guidance);

        return {
          id: prop.id || `prop_slots_${payload.seed}_${idx}`,
          proposalType: prop.proposalType || "faithful",
          title: prop.title || "Crazy Slots Proposal",
          tagline: prop.tagline || "Creative proposal material awaiting Haunted Toaster admission",
          plan: lockedPlan,
          rationale: prop.rationale || [],
          mutations: prop.mutations || [],
          confidence: typeof prop.confidence === "number" ? prop.confidence : 0.91,
          foreignElement: prop.foreignElement,
          ...(guidanceWarnings.length ? { guidanceWarnings } : {}),
        } as PlanProposal;
      });
    }

    return generateFallbackProposals(payload, guidance);
  } catch (err: any) {
    const isQuota =
      err?.status === "RESOURCE_EXHAUSTED" ||
      err?.code === 429 ||
      (typeof err?.message === "string" &&
        (err.message.includes("quota") || err.message.includes("429") || err.message.includes("RESOURCE_EXHAUSTED")));

    if (isQuota) {
      console.warn("[Crazy Slots Engine] Gemini API rate limit or free tier quota reached. Seamlessly utilizing deterministic Crazy Slots proposal engine.");
    } else {
      console.warn("[Crazy Slots Engine] Gemini API unavailable; utilizing deterministic Crazy Slots proposal engine:", err?.message || err);
    }
    return generateFallbackProposals(payload, guidance);
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

/** Seeded local fallback for proposal material only; not canonical execution. */
export function generateFallbackProposals(
  payload: ProposeRequestPayload,
  guidance: GarmentConstraint
): PlanProposal[] {
  const seed = payload.seed;
  const controls = payload.crazySlotsControls || {
    possession: 50,
    foreignMatter: 20,
    rhythmicObedience: 80,
    imageLoyalty: 75,
    topologyRupture: 30,
    materialRot: 25,
  };

  const faithfulPlan = baseProposalPlan(payload);

  // Apply Crazy Slots controls to the fallback plan
  if (controls.topologyRupture > 60) {
    faithfulPlan.topology = "hyper_torus";
  } else if (controls.topologyRupture > 30) {
    faithfulPlan.topology = "folded_manifold";
  }

  if (controls.materialRot > 60) {
    faithfulPlan.material = "decayed_copper";
  } else if (controls.materialRot > 30) {
    faithfulPlan.material = "quantum_plasma";
  }

  if (controls.rhythmicObedience < 40) {
    faithfulPlan.motionGrammar = "chaotic_snap";
  }

  const foreignElement = controls.foreignMatter > 30
    ? `A hovering void-glass monolith (intensity: ${controls.foreignMatter}%)`
    : undefined;

  const preserveLocks = (plan: GenerationPlan) =>
    payload.lockState && payload.lockedPlan ? applyLocks(plan, payload.lockedPlan, payload.lockState) : plan;

  const preserved = preserveLocks(faithfulPlan);
  inspectAuthoringGuidance(preserved, guidance);

  return [
    {
      id: `prop_slots_${seed}`,
      proposalType: controls.foreignMatter > 50 ? "foreign_body" : "faithful",
      title: "Crazy Slots Proposal",
      tagline: `Seed ${seed} • Possession ${controls.possession}% • Foreign Matter ${controls.foreignMatter}% • Awaits Haunted Toaster admission`,
      plan: preserved,
      rationale: [
        {
          field: "topology",
          evidence: [
            {
              source: payload.mode === "lyrics_only" ? "lyrics" : "audio",
              interval: [0, 30],
              observation: `Derived from input evidence with Topology Rupture dial at ${controls.topologyRupture}%.`,
            },
          ],
        },
      ],
      mutations: [],
      confidence: 0.92,
      foreignElement,
    },
  ];
}

/**
 * Parse and clean raw lyrics: strip section headers e.g. [Verse 1], [Chorus], Verse:, (Chorus),
 * remove double quotes or stray characters, and return clean timestamped lyrics [mm:ss.xx].
 * Uses Gemini API when available, falling back gracefully to local deterministic parser.
 */
export async function parseAndCleanLyricsWithGemini(
  lyrics: string,
  durationSeconds: number = 180
): Promise<{ cleanedLyrics: string; source: "gemini" | "local" }> {
  if (!lyrics || !lyrics.trim()) {
    return { cleanedLyrics: "", source: "local" };
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "dummy_key") {
    const { cleanedText } = cleanAndTagLyricsLocally(lyrics, durationSeconds);
    return { cleanedLyrics: cleanedText, source: "local" };
  }

  try {
    const ai = getGeminiClient();
    const prompt = `You are a professional music lyric preprocessor and LRC timestamping engine.
Clean the following song lyrics by doing the following strictly:
1. Strip out section header tags such as [Verse 1], [Chorus], Verse 1:, [Bridge], [Outro], (Chorus), [Intro], [Hook], etc.
2. Remove stray quotes (e.g. " line of lyric "), quotes around lines, and empty blank quotes ("").
3. Format each line of lyrics with an LRC timestamp tag at the start in [mm:ss.xx] format (e.g. [00:12.50] Clean lyric line).
4. Evenly distribute the timing across the track duration of ${durationSeconds} seconds monotonically.
5. Return ONLY the cleaned lyric lines with timestamps. Do NOT wrap in markdown code blocks or add conversational preamble.

RAW LYRICS:
${lyrics}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: prompt,
    });

    const resultText = response.text ? response.text.trim() : "";
    if (resultText && resultText.length > 5) {
      // Strip any accidental markdown ``` code fence
      const cleanResult = resultText.replace(/^```[a-z]*\n?/i, "").replace(/\n?```$/i, "").trim();
      return { cleanedLyrics: cleanResult, source: "gemini" };
    }
  } catch (err: any) {
    const isQuota =
      err?.status === "RESOURCE_EXHAUSTED" ||
      err?.code === 429 ||
      (typeof err?.message === "string" &&
        (err.message.includes("quota") || err.message.includes("429") || err.message.includes("RESOURCE_EXHAUSTED")));

    if (isQuota) {
      console.info("[Lyric Processor] Gemini API quota reached. Using local deterministic lyric preprocessor.");
    } else {
      console.info("[Lyric Processor] Gemini API unavailable. Using local deterministic lyric preprocessor.");
    }
  }

  const { cleanedText } = cleanAndTagLyricsLocally(lyrics, durationSeconds);
  return { cleanedLyrics: cleanedText, source: "local" };
}

