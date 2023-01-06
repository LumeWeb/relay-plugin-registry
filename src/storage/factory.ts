import { RegistryStorage, RegistryStorageConstructor } from "../types.js";

const backends = new Map<string, RegistryStorageConstructor>();

export function register(
  type: string,
  instance: new (opts?: any) => RegistryStorage
): void {
  backends.set(type, instance);
}

export function get(type: string, opts = {}): RegistryStorage {
  const ctor = backends.get(type);
  return new ctor(opts);
}
export function has(type: string): boolean {
  return backends.has(type);
}
