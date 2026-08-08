import assert from "node:assert/strict";
import path from "node:path";
import { createRequire } from "node:module";
import { HISTORICAL_PLANS, SAMPLE_AUDIO, SAMPLE_COVER_IMAGE } from "../src/lib/sampleData";
import { toToasterProposalTransferV1 } from "../src/lib/toasterProposalTransfer";
import type { PlanProposal } from "../src/types/toaster";

const checkout = process.env.HAUNTED_TOASTER_CHECKOUT;
assert.ok(checkout, "HAUNTED_TOASTER_CHECKOUT must point at a current Haunted Toaster checkout");

const require = createRequire(import.meta.url);
const importer = require(path.join(checkout, "src/full-measure/src/lab-proposal.cjs"));
const wireOrchard = require(path.join(checkout, "src/full-measure/constraints/wire-orchard.v1.json"));

const proposal: PlanProposal = {
  id: "consumer-proof-001",
  proposalType: "mutation",
  title: "Current Consumer Proof",
  tagline: "Lab suggestion only",
  plan: HISTORICAL_PLANS[0],
  rationale: [],
  mutations: [],
  confidence: 0.9,
};

const transfer = toToasterProposalTransferV1(proposal, {
  audio: SAMPLE_AUDIO,
  image: SAMPLE_COVER_IMAGE,
  lockState: {},
});

assert.equal(transfer.schema, importer.LAB_PROPOSAL_SCHEMA);
assert.equal(transfer.suggestedVisualScore.authority, "non-canonical-suggestion");
assert.equal(transfer.suggestedVisualScore.palette.logic, "analogous");

const admitted = importer.admitLabProposal(transfer, wireOrchard);
assert.equal(admitted.scoreArtifact.schema, "haunted-toaster/score-artifact/v1");
assert.equal(wireOrchard.topology.allowed.includes(admitted.scoreArtifact.score.topology), true);
assert.equal(wireOrchard.palette.logic.allowed.includes(admitted.scoreArtifact.score.palette.logic), true);
assert.equal(admitted.scoreArtifact.score.palette.logic, "split-complement");

console.log(JSON.stringify({
  proof: "toaster-lab2 transfer -> current Haunted Toaster importer -> lawful canonical score",
  consumerSchema: importer.LAB_PROPOSAL_SCHEMA,
  proposedPalette: transfer.suggestedVisualScore.palette.logic,
  admittedPalette: admitted.scoreArtifact.score.palette.logic,
  scoreAddress: admitted.scoreArtifact.address,
}, null, 2));
