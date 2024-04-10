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

///<reference lib="webworker"/>
///<reference lib="dom" />
import * as path from "std/path/mod.ts";
import { existsSync } from "std/fs/mod.ts";

import { InputError } from "mtkruto/0_errors.ts";
import { setLogVerbosity } from "mtkruto/1_utilities.ts";
import { functions, setLoggingProvider, types, Update } from "mtkruto/mod.ts";

import { log } from "./log.ts";
import { serialize } from "./tl_json.ts";
import { deserialize } from "./tl_json.ts";
import { fileLogger } from "./file_logger.ts";
import { isFunctionDisallowed } from "./disallowed_functions.ts";
import { ClientManager, ClientStats } from "./client_manager.ts";
import { ALLOWED_METHODS, AllowedMethod } from "./allowed_methods.ts";

const LOG_PATH = path.join(Deno.cwd(), ".logs", "clients");
if (!existsSync(LOG_PATH)) {
  Deno.mkdirSync(LOG_PATH, { recursive: true });
}
let id = -1;
let clientManager = new ClientManager(0, "");

addEventListener("message", async (e) => {
  const [_id, { _, args }] = e.data;
  let result;
  try {
    result = await (handlers as any)[_](...args as any[]);
  } catch (err) {
    if (err instanceof InputError) {
      result = [err.message, {
        status: 400,
        headers: { "x-error-type": "input" },
      }];
    } else if (err instanceof types.Rpc_error) {
      result = [err.error_message, {
        status: err.error_code,
        headers: { "x-error-type": "rpc" },
      }];
    } else {
      console.error(err);
      result = [null, { status: 500 }];
    }
  }
  postMessage([_id, result ?? null]);
});

const handlers = {
  init,
  clientCount,
  serve,
  stats,
  getUpdates,
  abortGetUpdates,
  invoke,
  setWebhook,
  deleteWebhook,
  startWebhookLoop,
};
export type Handler = typeof handlers;

function init(id_: number, apiId: number, apiHash: string) {
  if (id != -1) {
    return;
  }
  id = id_;
  clientManager = new ClientManager(apiId, apiHash);
  const logFile = path.join(LOG_PATH, id + "");
  setLogVerbosity(Infinity);
  setLoggingProvider(fileLogger(logFile));
  log.info(`Started worker ${id + 1}.`);
}

function clientCount() {
  return clientManager.count();
}

async function serve(
  id: string,
  method: AllowedMethod,
  args: any[],
): Promise<"DROP" | Parameters<typeof Response["json"]>> {
  if (!id.trim() || !method.trim()) {
    return "DROP";
  }
  if (!(ALLOWED_METHODS.includes(method))) {
    return "DROP";
  }
  const client = await clientManager.getClient(id);
  // deno-lint-ignore ban-ts-comment
  // @ts-ignore
  const result = await client[method](...args);
  if (result !== undefined) {
    return [result];
  } else {
    return [null];
  }
}

async function invoke(
  id: string,
  function_: any,
): Promise<Parameters<typeof Response["json"]>> {
  const function__ = deserialize(function_);
  if (!(function__ instanceof functions.Function)) {
    throw new InputError("Expected a function");
  }
  if (isFunctionDisallowed(function__)) {
    throw new InputError("Unallowed function");
  }
  const client = await clientManager.getClient(id);
  const result = serialize(await client.invoke(function__));
  if (result !== undefined) {
    return [result];
  } else {
    return [null];
  }
}

export interface WorkerStats {
  clientCount: number;
  clients: ClientStats[];
}
async function stats(): Promise<WorkerStats> {
  return {
    clientCount: clientCount(),
    clients: await clientManager.getStats(),
  };
}

function getUpdates(id: string, timeout: number): Promise<Update[] | "DROP"> {
  if (timeout < 0) {
    throw new Error(`Invalid timeout: ${timeout}`);
  }
  return clientManager.getUpdates(id, timeout);
}

async function abortGetUpdates(id: string) {
  await clientManager.abortGetUpdates(id);
}

async function setWebhook(
  id: string,
  url: string,
): Promise<Parameters<typeof Response["json"]>> {
  await clientManager.setWebhook(id, url);
  return ["Webhook was set."];
}

async function deleteWebhook(
  id: string,
): Promise<Parameters<typeof Response["json"]>> {
  await clientManager.deleteWebhook(id);
  return ["Webhook was deleted."];
}

async function startWebhookLoop(id: string) {
  await clientManager.startWebhookLoop(id);
}
