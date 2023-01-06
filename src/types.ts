export interface SignedRegistryEntry {
  pk: Uint8Array;

  // revision number of this entry, maximum is (256^8)-1
  revision: number;

  // data stored in this entry, can have a maximum length of 48 bytes
  data: Uint8Array;

  // signature of this registry entry
  signature?: Uint8Array;
}

export type RegistryStorageConstructor = new (opts?: any) => RegistryStorage;

export interface RegistryStorage {
  get(key: string): Promise<boolean | SignedRegistryEntry>;
  set(key: string, value: SignedRegistryEntry): Promise<boolean>;
}
