import type { Plugin, PluginAPI } from "@lumeweb/relay-types";
import DHTFlood from "@lumeweb/dht-flood";
import { Message, Query, MessageType } from "./messages.js";
import EventEmitter from "events";
import NodeCache from "node-cache";
import b4a from "b4a";
import { SignedRegistryEntry } from "./types.js";
import { verifyEntry } from "./utils.js";

const PROTOCOL = "lumeweb.registry";

const events = new EventEmitter();
let messenger: DHTFlood;
let api: PluginAPI;
let memStore: NodeCache;

function setup() {
  messenger = new DHTFlood({
    swarm: api.swarm,
    protocol: PROTOCOL,
    id: api.identity.publicKeyRaw as Buffer,
  });

  messenger.on("message", (data: Buffer, origin: Buffer) => {
    try {
      let response = Message.fromBinary(data);
      switch (response.type) {
        case MessageType.CREATE:
          events.emit("create", response, origin);
          break;
        case MessageType.CREATED:
          events.emit("created", response, origin);
          break;
        case MessageType.RESPONSE:
          events.emit("response", response, origin);
          break;
      }
      return;
    } catch {}

    try {
      let query = Query.fromBinary(data);
      events.emit("query", query, origin);
    } catch {}
  });
}

function entryFromMessage(message: Message): SignedRegistryEntry {
  return {
    pk: message.pubkey,
    data: message.data,
    revision: message.revision,
    signature: message.signature,
  };
}

function sendDirectOrBroadcast(message: Message, pubkey: Buffer) {
  let peer = api.swarm._allConnections.get(pubkey);
  let data = Message.toBinary(message);
  if (peer) {
    messenger.send(peer, data, 0);
    return;
  }

  messenger.broadcast(data);
}

async function getEntry(
  pubkey: Uint8Array
): Promise<SignedRegistryEntry | boolean> {
  let pubkeyHex = b4a.from(pubkey).toString("hex");
  if (memStore) {
    return await memStore.get<SignedRegistryEntry>(pubkeyHex);
  }

  return false;
}

async function setEntry(entry: SignedRegistryEntry): Promise<boolean> {
  let pubkeyHex = b4a.from(entry.pk).toString("hex");
  if (memStore) {
    return await memStore.set<SignedRegistryEntry>(pubkeyHex, entry);
  }

  return false;
}

const plugin: Plugin = {
  name: "registry",
  async plugin(_api: PluginAPI): Promise<void> {
    api = _api;
    setup();

    if (api.pluginConfig.bool("store.memory")) {
      memStore = new NodeCache();
    }

    events.on("create", async (message: Message, origin: Buffer) => {
      let newEntry = entryFromMessage(message);
      if (!newEntry.signature?.length) {
        return;
      }
      if (!verifyEntry(newEntry)) {
        return;
      }
      if (newEntry.data.length > 48) {
        return;
      }
      let entry = (await getEntry(newEntry.pk)) as SignedRegistryEntry;

      async function setAndRespond(entry: SignedRegistryEntry) {
        await setEntry(newEntry);
        sendDirectOrBroadcast(
          Message.create({
            type: MessageType.CREATED,
            pubkey: entry.pk,
            revision: entry.revision,
            signature: entry.signature,
            data: entry.data,
          }),
          origin
        );
      }

      if (entry) {
        if (newEntry.revision <= entry.revision) {
          setAndRespond(newEntry);
          return;
        }
        setAndRespond(entry);
        return;
      }
      setAndRespond(newEntry);
    });

    events.on("query", async (query: Query, origin: Buffer) => {
      let entry = (await getEntry(query.pubkey)) as SignedRegistryEntry;

      if (entry) {
        sendDirectOrBroadcast(
          Message.create({
            type: MessageType.RESPONSE,
            pubkey: entry.pk,
            revision: entry.revision,
            signature: entry.signature,
            data: entry.data,
          }),
          origin
        );
      }
    });
  },
};

export default plugin;
