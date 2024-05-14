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

import * as path from "std/path/mod.ts";
import { exists, existsSync } from "std/fs/mod.ts";

import { Client } from "mtkruto/mod.ts";
import { Queue } from "mtkruto/1_utilities.ts";

export class DownloadManager {
  #client: Client;
  static DOWNLOADS_PATH = path.join(Deno.cwd(), ".downloads");

  constructor(client: Client) {
    this.#client = client;
    if (!existsSync(DownloadManager.DOWNLOADS_PATH)) {
      Deno.mkdirSync(DownloadManager.DOWNLOADS_PATH);
    }
  }

  async *download(fileId: string) {
    const dir = path.join(DownloadManager.DOWNLOADS_PATH, fileId);
    if (!await exists(dir)) {
      await Deno.mkdir(dir);
    }
    let n = 0;
    let offset = 0;
    const haveAllParts = await exists(path.join(dir, "_all"));
    let partsAvailable = 0;
    for await (const entry of Deno.readDir(dir)) {
      if (entry.name.startsWith("_") || !entry.isFile) {
        continue;
      }
      if (entry.name == partsAvailable + "") {
        ++partsAvailable;
        const { size } = await Deno.stat(path.join(dir, entry.name));
        offset += size;
      }
    }
    let download: Download | undefined;
    if (!haveAllParts) {
      download = this.#startDownload(fileId, partsAvailable, offset);
    }
    for (let i = 0; i < partsAvailable; ++i) {
      const part = await Deno.readFile(path.join(dir, i + ""));
      offset += part.byteLength;
      ++n;
      yield part;
    }
    if (download) {
      while (true) {
        if (download.partsAvailable > n) {
          if (await exists(path.join(dir, n + ""))) {
            const part = await Deno.readFile(path.join(dir, n + ""));
            ++n;
            yield part;
          }
        } else if (download.haveAllParts) {
          break;
        }
        await new Promise<void>((r) => {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 5000);
          download.addEventListener("partAvailable", () => {
            clearTimeout(timeout);
            r();
          }, { once: true, signal: controller.signal });
        });
      }
    }
  }

  #downloadQueue = new Queue("downloads");
  #downloads = new Map<string, Download>();
  #startDownload(fileId: string, partsAvailable: number, offset: number) {
    let download = this.#downloads.get(fileId);
    if (!download) {
      download = new Download(this.#client, fileId, partsAvailable, offset);
      this.#downloads.set(fileId, download);
      this.#downloadQueue.add(() =>
        download!.start().finally(() => this.#downloads.delete(fileId))
      );
    }
    return download;
  }
}

class Download extends EventTarget {
  haveAllParts = false;

  constructor(
    private client: Client,
    private fileId: string,
    public partsAvailable: number,
    private offset: number,
  ) {
    super();
  }

  async start() {
    const dir = path.join(DownloadManager.DOWNLOADS_PATH, this.fileId);
    if (!await exists(dir)) {
      await Deno.mkdir(dir);
    }
    for await (
      const chunk of this.client.download(this.fileId, { offset: this.offset })
    ) {
      await Deno.writeFile(path.join(dir, "" + this.partsAvailable), chunk);
      ++this.partsAvailable;
      this.dispatchEvent(new Event("partAvailable"));
    }
    await Deno.writeFile(path.join(dir, "_all"), new Uint8Array());
  }
}
