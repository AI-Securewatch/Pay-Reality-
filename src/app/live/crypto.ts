import * as ed from "@noble/ed25519";
import { sha512 } from "@noble/hashes/sha2.js";

// @noble/ed25519 v2 needs a sha512 implementation wired in explicitly.
ed.hashes.sha512 = sha512;

export interface KeyPair {
  publicKeyB64: string;
  privateKeyB64: string;
}

function bytesToB64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function b64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export function generateKeyPair(): KeyPair {
  const privateKey = ed.utils.randomSecretKey();
  const publicKey = ed.getPublicKey(privateKey);
  return {
    publicKeyB64: bytesToB64(publicKey),
    privateKeyB64: bytesToB64(privateKey),
  };
}

export function signBody(bodyBytes: Uint8Array, privateKeyB64: string): string {
  const signature = ed.sign(bodyBytes, b64ToBytes(privateKeyB64));
  return bytesToB64(signature);
}
