import { SignedRegistryEntry, RegistryStorage } from "../../types.js";
import { open, RootDatabase } from "lmdb";
import { PluginAPI } from "@lumeweb/relay-types";
import path from "node:path";

export default class Lmdb implements RegistryStorage {
  private _database: RootDatabase<SignedRegistryEntry>;
  constructor(opts: { api: PluginAPI }) {
    const config = opts.api.config.str("configdir");
    this._database = open<SignedRegistryEntry>({
      path: path.join(path.dirname(config), "data", "registry"),
      sharedStructuresKey: Symbol.for("structures"),
    });
  }

  async get(key: string): Promise<boolean | SignedRegistryEntry> {
    const ret = await this._database.get(key);

    return ret ?? false;
  }

  async set(key: string, value: SignedRegistryEntry): Promise<boolean> {
    return await this._database.put(key, value);
  }
}
