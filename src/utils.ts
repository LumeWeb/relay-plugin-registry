import { SignedRegistryEntry } from "./types.js";
import * as ed from "@noble/ed25519";
import b4a from "b4a";

export function verifyEntry(entry: SignedRegistryEntry) {
  return ed.sync.verify(entry.signature, createSignatureData(entry), entry.pk);
}

export function signEntry(
  entry: SignedRegistryEntry,
  privateKey: Uint8Array
): Uint8Array {
  return ed.sync.sign(createSignatureData(entry), privateKey);
}

export function createSignatureData(entry: SignedRegistryEntry): Uint8Array {
  return b4a.concat([
    encodeEndian(entry.revision, 8),
    entry.data.length,
    entry.data,
  ]);
}

export function encodeEndian(value: number, length: number) {
  let res = new Uint8Array(length);

  for (let i = 0; i < length; i++) {
    res[i] = value & 0xff;
    value = value >> 8;
  }

  return res;
}