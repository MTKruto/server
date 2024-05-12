/**
 * MTKruto Server
 * Copyright (C) 2024 Roj <https://roj.im/>
 *
 * This file is part of MTKruto Server.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import * as log from "std/log/mod.ts";
import * as path from "std/path/mod.ts";
import { existsSync } from "std/fs/exists.ts";
import { unreachable } from "std/assert/unreachable.ts";

import { Mutex, Queue } from "mtkruto/1_utilities.ts";
import {
  Client,
  errors,
  InputError,
  InvokeErrorHandler,
  NetworkStatistics,
  Update,
  User,
} from "mtkruto/mod.ts";
import { StorageDenoKV } from "mtkruto/storage/1_storage_deno_kv.ts";
import { transportProviderTcp } from "mtkruto/transport/3_transport_provider_tcp.ts";

import { DownloadManager } from "./download_manager.ts";

export interface ClientStats {
  connected: boolean;
  me: User;
  lastUpdate: Date | null;
  network: NetworkStatistics;
}

export class ClientManager {
  #apiId: number;
  #apiHash: string;

  #clients = new Map<string, Client>();
  #mutex = new Mutex();
  #lastUpdates = new Map<Client, Date>();
  #lastGetUpdates = new Map<Client, Date>();
  #updates = new Map<Client, Update[]>();
  #kvMap = new Map<Client, Deno.Kv>();
  #webhooks = new Map<Client, string>();

  static #PENDING_UPDATES = "pendingUpdates";
  static WEBHOOK = "webhook";

  static KV_PATH = path.join(Deno.cwd(), ".kv");

  static createKvPath() {
    if (!existsSync(ClientManager.KV_PATH)) {
      Deno.mkdirSync(ClientManager.KV_PATH);
    }
  }

  constructor(apiId: number, apiHash: string) {
    this.#apiId = apiId;
    this.#apiHash = apiHash;
    ClientManager.createKvPath();
    this.#startPeriodicChecks();
  }

  #invokeErrorHandler(id: string): InvokeErrorHandler<Client> {
    return (ctx) => {
      if (
        ctx.error instanceof errors.AuthKeyUnregistered ||
        ctx.error instanceof errors.AuthKeyDuplicated ||
        ctx.error instanceof errors.AuthKeyInvalid
      ) {
        this.#clients.delete(id);
        this.#lastUpdates.delete(ctx.client);
      }
      return false;
    };
  }

  #downloadManagers = new Map<Client, DownloadManager>();
  async download(id: string, fileId: string) {
    const client = await this.getClient(id);
    let downloadManager = this.#downloadManagers.get(client);
    if (!downloadManager) {
      downloadManager = new DownloadManager(client);
    }
    return downloadManager.download(fileId);
  }

  async getClient(id: string) {
    {
      const client = this.#clients.get(id);
      if (client) {
        if (!client.connected) {
          await client.connect();
        }
        return client;
      }
    }
    const unlock = await this.#mutex.lock();
    {
      const client = this.#clients.get(id);
      if (client) {
        return client;
      }
    }
    try {
      if (!id.startsWith("bot") && !id.startsWith("user")) {
        throw new InputError("Invalid client ID");
      }
      const kvPath = path.join(ClientManager.KV_PATH, id);
      const client = new Client({
        storage: new StorageDenoKV(kvPath),
        apiId: this.#apiId,
        apiHash: this.#apiHash,
        dropPendingUpdates: false,
        transportProvider: transportProviderTcp(),
      });
      let updates = this.#updates.get(client);
      if (!updates) {
        this.#updates.set(client, updates = []);
      }
      const kv = await Deno.openKv(kvPath);
      this.#kvMap.set(client, kv);
      for await (
        const update of kv.list({ prefix: [ClientManager.#PENDING_UPDATES] })
      ) {
        updates.push(update.value as Update);
      }
      const webhook = await kv.get([ClientManager.WEBHOOK]);
      if (webhook.value != null) {
        this.#webhooks.set(client, webhook.value as string);
      }
      client.invoke.use(this.#invokeErrorHandler(id));
      client.use(async (ctx) => {
        if (ctx.connectionState || ctx.authorizationState) {
          return;
        }
        this.#lastUpdates.set(client, new Date());
        updates.push(ctx.toJSON());
        this.#updateResolvers.get(client)?.();
        const update = ctx.toJSON();
        const updateId = ClientManager.#getUpdateId(update);
        if (updateId != null) {
          await kv.set([ClientManager.#PENDING_UPDATES, updateId], update);
        }
      });
      if (id.startsWith("bot")) {
        const botToken = id.slice(3);
        await client.start({ botToken });
      } else {
        await client.start({
          phone: () => {
            throw new InputError("Invalid client ID");
          },
          code: () => {
            throw new InputError("Invalid client ID");
          },
          password: () => {
            throw new InputError("Invalid client ID");
          },
        });
      }
      this.#clients.set(id, client);
      return client;
    } finally {
      unlock();
    }
  }
  mustGetClient(id: string) {
    return this.#clients.get(id) ?? unreachable();
  }

  count() {
    return this.#clients.size;
  }

  async getStats() {
    const stats = new Array<ClientStats>();
    for (const [_, client] of this.#clients) {
      const me = await client.getMe();
      const network = await client.getNetworkStatistics();
      stats.push({
        connected: client.connected,
        me,
        lastUpdate: this.#lastUpdates.get(client) ?? null,
        network,
      });
    }
    return stats;
  }

  #updateCleanupQueue = new Queue("updateCleanup");
  #addToUpdateCleanupQueue(id: string, updates: Update[]) {
    this.#updateCleanupQueue.add(async () => {
      const client = await this.getClient(id);
      if (!client) {
        return;
      }
      const kv = this.#kvMap.get(client);
      if (!kv) {
        return;
      }
      for (const update of updates) {
        const updateId = ClientManager.#getUpdateId(update);
        if (updateId == null) {
          continue;
        }
        await kv.delete([ClientManager.#PENDING_UPDATES, updateId]);
      }
    });
  }

  async getUpdates(id: string, timeoutSeconds: number) {
    const updates = await this.#getUpdatesInner(id, timeoutSeconds);
    this.#addToUpdateCleanupQueue(id, updates);
    return updates;
  }

  #polls = new Set<Client>();
  static #GET_UPDATES_MAX_UPDATES = 100;
  #updateResolvers = new Map<Client, () => void>();
  #getUpdatesControllers = new Map<Client, AbortController>();
  async #getUpdatesInner(id: string, timeoutSeconds: number) {
    const client = await this.getClient(id);
    if (this.#webhooks.has(client)) {
      throw new InputError("getUpdates is not allowed when a webhook is set.");
    }

    if (this.#polls.has(client)) {
      const controller = this.#getUpdatesControllers.get(client);
      if (controller) {
        controller.abort();
      }
      this.#getUpdatesControllers.delete(client);
      // just in case
      this.#polls.delete(client);
      this.#updateResolvers.get(client)?.();
      this.#updateResolvers.delete(client);
    }
    this.#polls.add(client);
    let controller: AbortController | null = null;
    let timeout: number | null = null;
    try {
      let updates = this.#updates.get(client);
      if (updates && updates.length) {
        return updates.splice(
          0,
          Math.min(ClientManager.#GET_UPDATES_MAX_UPDATES, updates.length),
        );
      }

      controller = new AbortController();
      this.#getUpdatesControllers.set(client, controller);

      await new Promise<void>((resolve) => {
        controller!.signal.addEventListener("abort", () => resolve());
        if (timeoutSeconds != 0) {
          timeout = setTimeout(() => {
            controller!.abort();
          }, timeoutSeconds * 1_000);
        }
        this.#updateResolvers.set(client, resolve);
      });
      if (controller.signal.aborted) {
        throw new InputError("Aborted by another getUpdates request.");
      }

      updates = this.#updates.get(client);
      if (updates && updates.length) {
        return updates.splice(
          0,
          Math.min(ClientManager.#GET_UPDATES_MAX_UPDATES, updates.length),
        );
      } else {
        return [];
      }
    } finally {
      this.#updateResolvers.delete(client);
      this.#polls.delete(client);
      this.#lastGetUpdates.set(client, new Date());
      if (timeout != null) {
        clearTimeout(timeout);
      }
      if (
        controller != null &&
        this.#getUpdatesControllers.get(client) == controller
      ) {
        this.#getUpdatesControllers.delete(client);
      }
    }
  }

  #startPeriodicChecks() {
    Promise.resolve().then(this.#periodicChecks.bind(this));
  }

  async #periodicChecks() {
    await new Promise((r) => setTimeout(r, 30 * 60 * 1_000));
    for (const [id, client] of this.#clients) {
      if (this.#polls.has(client)) {
        continue;
      }
      const lastGetUpdates = this.#lastGetUpdates.get(client);
      if (
        lastGetUpdates !== undefined &&
        Date.now() - lastGetUpdates.getTime() <= 5 * 60 * 1_000
      ) {
        continue;
      }
      const lastUpdates = this.#lastGetUpdates.get(client);
      if (
        lastUpdates === undefined ||
        Date.now() - lastUpdates.getTime() >= 5 * 60 * 1_000
      ) {
        try {
          await client.disconnect();
        } catch {
          //
        }
        this.#clients.delete(id);
        this.#updates.delete(client);

        this.#lastGetUpdates.delete(client);
        this.#lastUpdates.delete(client);

        this.#kvMap.get(client)?.close();
        this.#kvMap.delete(client);
      }
    }
  }

  static #getUpdateId(update: Update) {
    if ("deletedMessages" in update) {
      return `D-${
        update.businessConnectionId ?? "0"
      }${Date.now()}-${crypto.randomUUID()}`;
    } else if ("message" in update) {
      const { message } = update;
      return `M-${
        message.businessConnectionId ?? "0"
      }-${message.chat.id}-${message.id}`;
    } else if ("editedMessage" in update) {
      const { editedMessage } = update;
      return `N-${
        editedMessage.businessConnectionId ?? "0"
      }-${editedMessage.chat.id}-${editedMessage.id}-${
        editedMessage.editDate?.getTime() ?? 0
      }`;
    } else if ("messageReactionCount" in update) {
      const { messageReactionCount } = update;
      return `RC-${messageReactionCount.chat.id}-${messageReactionCount.messageId}-${messageReactionCount.date.getTime()}`;
    } else if ("messageReactions" in update) {
      const { messageReactions } = update;
      return `R-${messageReactions.chat.id}-${messageReactions.chat.id}-${
        messageReactions.user?.id ?? messageReactions.actorChat?.id ?? 0
      }-${messageReactions.date.getTime()}`;
    } else if ("chatMember" in update) {
      const { chatMember } = update;
      return `CM-${chatMember.chat.id}-${chatMember.from.id}-${chatMember.date.getTime()}`;
    } else if ("myChatMember" in update) {
      const { myChatMember } = update;
      return `MCM-${myChatMember.chat.id}-${myChatMember.from.id}-${myChatMember.date.getTime()}`;
    } else if ("businessConnection" in update) {
      const { businessConnection } = update;
      return `BC-${businessConnection.id}-${businessConnection.date.getTime()}`;
    }
    // not recoverable yet (unimplemented) or not recoverable at all
    return null;
  }

  async setWebhook(id: string, url: string) {
    const client = await this.getClient(id);
    try {
      const url_ = new URL(url);
      if (url_.protocol != "http:" && url_.protocol != "https:") {
        throw new InputError("Webhook protocol must be HTTP(S).");
      }
    } catch {
      throw new InputError("Invalid webhook URL.");
    }
    await this.deleteWebhook(id);
    await this.#kvMap.get(client)!.set([ClientManager.WEBHOOK], url);
    this.#webhooks.set(client, url);
    await this.startWebhookLoop(id);
  }

  async deleteWebhook(id: string) {
    const client = await this.getClient(id);
    this.#webhooks.delete(client);
    await this.#kvMap.get(client)!.delete([ClientManager.WEBHOOK]);
    const controller = this.#webhookAbortControllers.get(client);
    if (controller) {
      controller.abort();
      this.#webhookAbortControllers.delete(client);
    }
    this.#webhookLoops.delete(client);
  }

  #webhookLoops = new Map<Client, Promise<void>>();
  #webhookAbortControllers = new Map<Client, AbortController>();
  async startWebhookLoop(id: string) {
    const client = await this.getClient(id);
    if (this.#activeWebhookLoops.has(client)) {
      return;
    }
    if (!this.#webhooks.has(client)) {
      return;
    }
    const controller = new AbortController();
    this.#webhookAbortControllers.set(client, controller);
    this.#webhookLoops.set(client, this.#webhookLoop(id, controller.signal));
  }

  static #WEBHOOK_MAX_DISPATCHED_UPDATES = 100;
  #activeWebhookLoops = new Set<Client>();
  async #webhookLoop(id: string, signal: AbortSignal) {
    const client = this.mustGetClient(id);
    const url = this.#webhooks.get(client);
    if (!url) {
      return;
    }
    const updates = this.#updates.get(client);
    if (!updates) {
      return;
    }
    this.#activeWebhookLoops.add(client);
    try {
      do {
        let updatesToDispatch: Update[];
        if (updates.length) {
          updatesToDispatch = updates.splice(
            0,
            Math.min(
              ClientManager.#WEBHOOK_MAX_DISPATCHED_UPDATES,
              updates.length,
            ),
          );
        } else {
          await new Promise<void>((resolve) => {
            const onAbort = () => resolve();
            signal.addEventListener("abort", onAbort, { once: true });
            this.#updateResolvers.set(client, () => {
              resolve();
              signal.removeEventListener("abort", onAbort);
            });
          });
          updatesToDispatch = updates.splice(
            0,
            Math.min(
              ClientManager.#WEBHOOK_MAX_DISPATCHED_UPDATES,
              updates.length,
            ),
          );
        }

        if (signal.aborted) {
          break;
        }

        this.#addToUpdateCleanupQueue(id, updatesToDispatch);
        try {
          await fetch(url, {
            method: "POST",
            body: JSON.stringify(updatesToDispatch),
          });
        } catch (err) {
          log.error(
            `[${id}]\nFailed to dispatch ${updatesToDispatch.length} update${
              updatesToDispatch.length == 1 ? "" : "s"
            } to webhook at ${url}.`,
            Deno.inspect(err, { colors: false }),
          );
        }
      } while (!signal.aborted);
    } finally {
      this.#activeWebhookLoops.delete(client);
    }
  }

  async dropPendingUpdates(id: string) {
    const client = await this.getClient(id);
    if (!client) {
      return;
    }
    const kv = this.#kvMap.get(client);
    if (!kv) {
      return;
    }
    for await (
      const update of kv.list({ prefix: [ClientManager.#PENDING_UPDATES] })
    ) {
      await kv.delete(update.key);
    }
    this.#updates.set(client, []);
  }
}
