import { SignedRegistryEntry, RegistryStorage } from "../../types.js";
import NodeCache from "node-cache";

export default class Memory implements RegistryStorage {
  private _storage = new NodeCache();
  async get(key: string): Promise<boolean | SignedRegistryEntry> {
    const ret = await this._storage.get<SignedRegistryEntry>(key);

    return ret ?? false;
  }

  async set(key: string, value: SignedRegistryEntry): Promise<boolean> {
    return await this._storage.set<SignedRegistryEntry>(key, value);
  }
}
