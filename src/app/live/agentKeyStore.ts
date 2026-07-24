// Phase 1 simplification: this UI plays the role of "the agent" for demo
// purposes, so it generates and holds the private key itself in
// localStorage. A real Agent integration generates and holds its own key
// pair in its own runtime and never hands the private key to a browser --
// PayReality only ever receives the public key (spec 19.4) and a per-
// request signature (spec 21.2), never the private key itself.

const STORAGE_KEY = "payreality_live_agent_keys";

interface StoredKeys {
  [agentId: string]: { privateKeyB64: string; publicKeyB64: string };
}

function readStore(): StoredKeys {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");
  } catch {
    return {};
  }
}

export function saveAgentKeyPair(agentId: string, privateKeyB64: string, publicKeyB64: string) {
  const store = readStore();
  store[agentId] = { privateKeyB64, publicKeyB64 };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

export function getAgentPrivateKey(agentId: string): string | null {
  return readStore()[agentId]?.privateKeyB64 ?? null;
}

export function listAgentsWithKeys(): string[] {
  return Object.keys(readStore());
}
