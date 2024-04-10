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

import * as fs from "std/fs/mod.ts";
import * as path from "std/path/mod.ts";

import { Mutex } from "mtkruto/1_utilities.ts";

import type { Handler, WorkerStats } from "./worker.ts";
import { ClientManager } from "./client_manager.ts";

const workerUrl = path.toFileUrl(path.join(import.meta.dirname!, "worker.ts"));

interface Worker_ {
  worker: Worker;
  promises: Map<string, (result: any) => void>;
}

export class WorkerManager {
  #workers = new Array<Worker_>();
  #map = new Map<string, number>();
  #mutexes = new Map<string, Mutex>();

  #registerListeners(id: number) {
    const { worker, promises } = this.get(id);
    worker.addEventListener("message", (e) => {
      const [_id, result] = e.data;
      promises.get(_id)?.(result);
      promises.delete(_id);
    });
  }

  create() {
    const id = this.#workers.push({
      worker: new Worker(workerUrl, { type: "module" }),
      promises: new Map(),
    }) - 1;
    this.#registerListeners(id);
    return id;
  }

  get(id: number) {
    return this.#workers[id];
  }

  count() {
    return this.#workers.length;
  }

  call<M extends keyof Handler>(
    id: number,
    _: M,
    ...args: Parameters<Handler[M]>
  ): Promise<Awaited<ReturnType<Handler[M]>>> {
    const { worker, promises } = this.get(id);
    const _id = crypto.randomUUID();
    const promise = new Promise<any>((r) => {
      promises.set(_id, r);
    });
    worker.postMessage([_id, { _, args }]);
    return promise;
  }

  async #getNextWorker() {
    let prevCount = 0;
    let prevI = 0;
    for (let i = 0; i < this.count(); i++) {
      const count = await this.call(i, "clientCount");
      if (count == 0) {
        return i;
      }
      if (i == 0 || count < prevCount) {
        prevCount = count;
        prevI = i;
      }
      if (prevCount == 0) {
        return i;
      }
    }
    return prevI;
  }

  async getClientWorker(id: string) {
    let worker = this.#map.get(id);
    if (worker !== undefined) {
      return worker;
    }
    let mutex = this.#mutexes.get(id);
    if (!mutex) {
      mutex = new Mutex();
      this.#mutexes.set(id, mutex);
    }
    const unlock = await mutex.lock();
    try {
      worker = this.#map.get(id);
      if (worker !== undefined) {
        return worker;
      }
      worker = await this.#getNextWorker();
      this.#map.set(id, worker);
      return worker;
    } finally {
      unlock();
      this.#mutexes.delete(id);
    }
  }

  getStats() {
    const stats = new Array<Promise<WorkerStats>>();
    for (const worker of this.#workers.keys()) {
      stats.push(this.call(worker, "stats"));
    }
    return Promise.all(stats);
  }

  async startWebhookLoops() {
    let started = 0;
    if (await fs.exists(ClientManager.KV_PATH)) {
      for await (const entry of Deno.readDir(ClientManager.KV_PATH)) {
        if (!entry.isFile) {
          continue;
        }
        const id = entry.name;
        let kv: Deno.Kv;
        try {
          kv = await Deno.openKv(path.join(ClientManager.KV_PATH, id));
        } catch {
          continue;
        }
        const webhook = await kv.get([ClientManager.WEBHOOK]);
        if (webhook.value != null) {
          const worker = await this.getClientWorker(id);
          await this.call(worker, "startWebhookLoop", id);
          ++started;
        }
      }
    }
    return started;
  }

  async unload() {
    const promises = new Array<Promise<void>>();
    for (const worker of this.#workers.keys()) {
      promises.push(this.call(worker, "unload"));
    }
    await Promise.all(promises);
  }
}
