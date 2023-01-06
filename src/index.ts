import type { Plugin, PluginAPI } from "@lumeweb/relay-types";
import DHTFlood from "@lumeweb/dht-flood";
import { Message, MessageType, Query } from "./messages.js";
import EventEmitter from "events";
import b4a from "b4a";
import { RegistryStorage, SignedRegistryEntry } from "./types.js";
import { verifyEntry } from "./utils.js";
import { getStorage, hasStorage } from "./storage/index.js";

const PROTOCOL = "lumeweb.registry";

const events = new EventEmitter();
let messenger: DHTFlood;
let api: PluginAPI;
let store: RegistryStorage;

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

function setupEventHandlers() {
  events.on("create", handleCreate);
  events.on("query", handleQuery);
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
  return store.get(b4a.from(pubkey).toString("hex"));
}

async function handleCreate(message: Message, origin: Buffer) {
  {
    const setEntry = async (entry: SignedRegistryEntry): Promise<boolean> => {
      let pubkeyHex = b4a.from(entry.pk).toString("hex");

      return store.set(pubkeyHex, entry);
    };
    const setAndRespond = async (entry: SignedRegistryEntry, set = true) => {
      let ret = true;
      if (set) {
        ret = await setEntry(newEntry);
      }
      if (ret) {
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
        api.logger.info("added entry %s", b4a.from(entry.pk).toString("hex"));
      }
    };

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

    if (entry) {
      if (newEntry.revision <= entry.revision) {
        setAndRespond(newEntry);
        return;
      }
      setAndRespond(entry, false);
      return;
    }
    setAndRespond(newEntry);
  }
}

async function handleQuery(query: Query, origin: Buffer) {
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
}

const plugin: Plugin = {
  name: "registry",
  async plugin(_api: PluginAPI): Promise<void> {
    api = _api;

    const storageType = api.pluginConfig.str("store.type");
    const storageOptions = api.pluginConfig.str("store.type", {});
    if (!hasStorage(storageType)) {
      api.logger.error("Storage type %s does not exist", storageType);
      return;
    }

    store = getStorage(storageType, { ...storageOptions, api });

    setup();
    setupEventHandlers();
  },
};

export default plugin;
