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
import * as log from "std/log/mod.ts";
import * as path from "std/path/mod.ts";
import { existsSync } from "std/fs/mod.ts";

import { InputError } from "mtkruto/0_errors.ts";
import { setLogVerbosity } from "mtkruto/1_utilities.ts";
import { functions, setLoggingProvider, types } from "mtkruto/mod.ts";

import { transform } from "./transform.ts";
import { fileLogger } from "./file_logger.ts";
import { deserialize, serialize } from "./tl_json.ts";
import { isFunctionDisallowed } from "./disallowed_functions.ts";
import { ClientManager, ClientStats } from "./client_manager.ts";
import { ALLOWED_METHODS, AllowedMethod } from "./allowed_methods.ts";

const WORKER_LOG_PATH = path.join(Deno.cwd(), ".logs", "workers");
const CLIENT_LOG_PATH = path.join(Deno.cwd(), ".logs", "clients");
if (!existsSync(CLIENT_LOG_PATH)) {
  Deno.mkdirSync(CLIENT_LOG_PATH, { recursive: true });
}
if (!existsSync(WORKER_LOG_PATH)) {
  Deno.mkdirSync(WORKER_LOG_PATH, { recursive: true });
}
let id = -1;
let clientManager = new ClientManager(0, "");

addEventListener("message", async (e) => {
  const [_id, { _, args }] = e.data;
  if (id != -1) {
    log.info("in", args, _, _id);
  }
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
      log.error(
        `[${_id}]\nAn unexpected error occurred.`,
        Deno.inspect(err, { colors: false }),
      );
      result = [null, { status: 500 }];
    }
  }
  log.info("out", result ?? null, _, _id);
  postMessage([_id, result ?? null]);
});

const handlers = {
  init,
  clientCount,
  serve,
  next,
  stats,
  getUpdates,
  invoke,
  setWebhook,
  deleteWebhook,
  startWebhookLoop,
  unload,
  dropPendingUpdates,
};
export type Handler = typeof handlers;

function init(id_: number, apiId: number, apiHash: string) {
  if (id != -1) {
    return;
  }
  id = id_;
  clientManager = new ClientManager(apiId, apiHash);
  const workerLogFile = path.join(WORKER_LOG_PATH, id + "");
  const clientLogFile = path.join(CLIENT_LOG_PATH, id + "");
  setLogVerbosity(Infinity);
  setLoggingProvider(fileLogger(clientLogFile));
  const ENTRY_SEPARATOR = "-".repeat(25);
  log.setup({
    loggers: {
      default: {
        level: "INFO",
        handlers: ["file"],
      },
    },
    handlers: {
      file: new log.FileHandler("NOTSET", {
        filename: workerLogFile,
        formatter(record) {
          const time = record.datetime.toISOString();
          const payload = record.args.length >= 1
            ? (typeof record.args[0] === "string"
              ? record.args[0]
              : JSON.stringify(record.args[0], null, 2))
              .trim()
              .split("\n")
              .map((v) => `    ${v}`)
              .join("\n")
            : "";
          if (record.msg == "out" || record.msg == "in") {
            const A = record.msg == "in" ? ">>>>>>>>>>" : "<<<<<<<<<<";
            const name = record.args[1];
            const id = (record.args[2] as string).toUpperCase();
            return `[${time}]\n    [${id}]\n    ${A} ${name}\n${payload}\n\n${ENTRY_SEPARATOR}\n`;
          } else {
            const msg = record.msg
              .split("\n")
              .map((v) => `    ${v}`)
              .join("\n");
            const maybePayload = payload.length ? `\n${payload}` : "";
            return `[${time}]\n${msg}${maybePayload}\n\n${ENTRY_SEPARATOR}\n`;
          }
        },
      }),
    },
  });
}

function clientCount() {
  return clientManager.count();
}

async function serve(
  id: string,
  method: AllowedMethod,
  args: any[],
): Promise<
  "DROP" | Parameters<typeof Response["json"]> | { streamId: string }
> {
  if (!id.trim() || !method.trim()) {
    return "DROP";
  }
  if (!(ALLOWED_METHODS.includes(method))) {
    return "DROP";
  }
  let result;
  if (method == "download") {
    result = await clientManager.download(id, args[0]);
  } else {
    const client = await clientManager.getClient(id);
    // deno-lint-ignore ban-ts-comment
    // @ts-ignore
    result = transform(await client[method](...args));
  }
  if (result !== undefined) {
    if (
      typeof result === "object" && result != null &&
      Symbol.asyncIterator in result
    ) {
      return { streamId: getStreamId(result) };
    } else {
      return [result];
    }
  } else {
    return [null];
  }
}
const streams = new Map<string, AsyncIterator<Uint8Array>>();
function getStreamId(iterable: AsyncIterable<Uint8Array>) {
  const id = crypto.randomUUID();
  streams.set(id, iterable[Symbol.asyncIterator]());
  return id;
}

async function next(streamId: string) {
  const result = await streams.get(streamId)?.next();

  if (result === undefined) {
    return null;
  } else {
    if (result.done) {
      streams.delete(streamId);
    }
    return result;
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

async function getUpdates(
  id: string,
  timeout: number,
): Promise<Parameters<typeof Response["json"]>> {
  if (timeout < 0) {
    throw new InputError(`Invalid timeout: ${timeout}`);
  }
  return [await clientManager.getUpdates(id, timeout)];
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

function unload() {
  dispatchEvent(new Event("unload"));
}

async function dropPendingUpdates(
  id: string,
): Promise<Parameters<typeof Response["json"]>> {
  await clientManager.dropPendingUpdates(id);
  return [null];
}
