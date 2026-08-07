import type { Condition, Effect, RuntimePolicyRequest } from "./types";

// Plain-English labels for values that were, until now, shown to users
// as the literal backend enum token (PAYREALITY_UX_REVIEW.md, "Enum
// values are shown as literal code tokens"). Used everywhere an Effect
// or a Condition operator is displayed, not just here.
// "Allow," not "Approve": "Approve" is reserved for the human act of
// approving a rule itself on the Approvals screen. Using the same word
// for a rule's own enforcement outcome collided with that different
// concept (Platform Audit, Governance/Policy Studio section).
export const EFFECT_LABEL: Record<Effect, string> = {
  allow: "Allow automatically",
  deny: "Block",
  require_human_review: "Send to a human",
};

export const OPERATOR_LABEL: Record<string, string> = {
  "==": "is",
  "!=": "is not",
  ">": "is more than",
  ">=": "is at least",
  "<": "is less than",
  "<=": "is at most",
  in: "is one of",
  contains: "contains",
  exists: "is present",
};

function describeCondition(c: Condition): string {
  const op = OPERATOR_LABEL[c.operator] ?? c.operator;
  if (c.operator === "exists") return `${c.field || "(field)"} ${op}`;
  const value = Array.isArray(c.value) ? c.value.join(", ") : String(c.value);
  return `${c.field || "(field)"} ${op} ${value}`;
}

// A live, plain-English translation of a policy's Scope + Conditions +
// Effect (PAYREALITY_UX_REVIEW.md section 13: "the single highest-leverage
// addition"). Deliberately a summary sentence generated FROM the real
// rule, not a second input mechanism replacing the raw editor: an
// arbitrary condition is still an arbitrary condition, and pretending
// otherwise would hide real complexity behind fake simplicity rather
// than actually reducing it.
export function describePolicy(policy: RuntimePolicyRequest): string {
  const { scope, conditions, effect } = policy;
  const who = scope.principal || "(no principal set)";
  const what = scope.action || "(no action set)";
  const resource = scope.resource ? ` involving ${scope.resource}` : "";
  const agent = scope.agent ? ` (only agent ${scope.agent})` : "";
  const effectLabel = EFFECT_LABEL[effect] ?? effect;

  let sentence = `When ${who} tries to ${what}${resource}${agent}`;
  if (conditions.length > 0) {
    sentence += `, and ${conditions.map(describeCondition).join(", and ")},`;
  }
  sentence += ` → ${effectLabel}.`;
  return sentence;
}
