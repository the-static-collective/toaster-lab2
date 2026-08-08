import assert from "node:assert/strict";
import { generateFallbackProposal } from "../src/server/geminiProposer";

const proposal = generateFallbackProposal({
  mode: "seed_only",
  seed: 1042,
  crazySlotsControls: {
    possession: 50,
    foreignMatter: 20,
    rhythmicObedience: 80,
    imageLoyalty: 75,
    topologyRupture: 30,
    materialRot: 25,
  },
});

assert.equal(Array.isArray(proposal), false, "one pull must produce one proposal object, not an array");
assert.equal(typeof proposal, "object");
assert.equal(proposal.id, "prop_slots_1042");
assert.ok(proposal.plan);

console.log(JSON.stringify({
  proof: "one pull -> one proposal object",
  proposalId: proposal.id,
  isArray: Array.isArray(proposal),
}, null, 2));
