import { SignedRegistryEntry } from "./types.js";
import * as ed from "@noble/ed25519";
import b4a from "b4a";
import { sha512 } from "@noble/hashes/sha512";

ed.utils.sha512Sync = (...m) => sha512(ed.utils.concatBytes(...m));

export function verifyEntry(entry: SignedRegistryEntry) {
  return ed.sync.verify(
    entry.signature,
    createSignatureData(entry),
    entry.pk.slice(1)
  );
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
    b4a.from([entry.data.length]),
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
