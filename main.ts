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

import { log } from "./log.ts";
import {
  assertArgCount,
  badRequest,
  drop,
  methodNotAllowed,
  notFound,
} from "./responses.ts";
import { addUser } from "./add_user.ts";
import { displayStats } from "./stats.tsx";
import { parseCliArgs } from "./cli_args.ts";
import { AllowedMethod } from "./client/deps.ts";
import { WorkerManager } from "./worker_manager.ts";
import { isAllowedMethod } from "./allowed_methods.ts";
import { parseFormDataParams, parseGetParams } from "./params.ts";

const args = parseCliArgs(Deno.args);
if (typeof args !== "object") {
  log.error(args);
  Deno.exit(1);
}
const { port, apiId, apiHash, workerCount, statsPort, addUser: addUser_ } =
  args;
if (addUser_) {
  await addUser(apiId, apiHash);
}

log.info(
  `Starting MTKruto Server with ${workerCount} worker${
    workerCount == 1 ? "" : "s"
  }.`,
);

const workers = new WorkerManager();
for (let i = 0; i < workerCount; i++) {
  const id = workers.create();
  await workers.call(id, "init", id, apiId, apiHash);
  log.info(`Started worker ${id + 1}.`);
}

const started = await workers.startWebhookLoops();
if (started) {
  log.info(`Started ${started} webhook loop${started == 1 ? "" : "s"}.`);
}

Deno.addSignalListener("SIGINT", async () => {
  await workers.unload();
  Deno.exit();
});

Deno.serve({
  port,
  onListen: ({ port }) => {
    log.info(`Listening for connections on port ${port}.`);
    log.info("Started MTKruto Server.");
  },
}, async (request) => {
  const url = new URL(request.url);
  if (request.method != "POST" && request.method != "GET") {
    return methodNotAllowed();
  }
  const parts = url.pathname.slice(1).split("/").map(decodeURIComponent);
  if (parts.length != 2) {
    return notFound();
  }
  let params: any[];
  if (request.method == "POST") {
    const contentType = request.headers.get("content-type");
    if (contentType == "application/json") {
      try {
        params = await request.json();
        if (!Array.isArray(params)) {
          return badRequest("An array of arguments was expected.");
        }
      } catch {
        return badRequest("Invalid JSON");
      }
    } else if (contentType?.startsWith("multipart/form-data")) {
      params = parseFormDataParams(await request.formData());
    } else {
      if (contentType) {
        return badRequest("Unsupported content type");
      } else {
        return badRequest(
          "The content-type header was expected to be present.",
        );
      }
    }
  } else {
    params = parseGetParams(url.searchParams);
  }
  const [id, method] = parts as [string, AllowedMethod | "getUpdates"];
  try {
    return await handleRequest(id, method, params);
  } catch (err) {
    if (err instanceof Response) {
      return err;
    } else {
      throw err;
    }
  }
});

async function handleRequest(id: string, method: string, params: any[]) {
  const worker = await workers.getClientWorker(id);
  if (isAllowedMethod(method)) {
    return await handleMethod(worker, id, method, params);
  }
  switch (method) {
    case "getUpdates":
      assertArgCount(params.length, 1);
      return await handleGetUpdates(worker, id, params[0]);
    case "invoke":
      assertArgCount(params.length, 1);
      return await handleInvoke(worker, id, params[0]);
    case "setWebhook":
      assertArgCount(params.length, 1);
      return await handleSetWebhook(worker, id, params[0]);
    case "deleteWebhook":
      assertArgCount(params.length, 0);
      return await handleDeleteWebhook(worker, id);
    case "dropPendingUpdates":
      assertArgCount(params.length, 0);
      return await handleDropPendingUpdates(worker, id);
    default:
      return badRequest("Invalid method");
  }
}

async function handleMethod(
  worker: number,
  id: string,
  method: AllowedMethod,
  params: any,
) {
  const result = await workers.call(worker, "serve", id, method, params);
  if (result === "DROP") {
    return drop();
  } else {
    return Response.json(...result);
  }
}

async function handleGetUpdates(worker: number, id: string, timeout: number) {
  const result = await workers.call(worker, "getUpdates", id, timeout);
  return Response.json(...result);
}

async function handleInvoke(worker: number, id: string, function_: any) {
  const result = await workers.call(worker, "invoke", id, function_);
  return Response.json(...result);
}

async function handleSetWebhook(worker: number, id: string, url: string) {
  const result = await workers.call(worker, "setWebhook", id, url);
  return Response.json(...result);
}

async function handleDeleteWebhook(worker: number, id: string) {
  const result = await workers.call(worker, "deleteWebhook", id);
  return Response.json(...result);
}

async function handleDropPendingUpdates(worker: number, id: string) {
  const result = await workers.call(worker, "dropPendingUpdates", id);
  return Response.json(...result);
}

// ============= STATS SERVER ============= //
Deno.serve({
  port: statsPort,
  onListen: () => {
    log.info(`Stats can be accessed from port ${statsPort}.`);
  },
}, async (request) => {
  const url = new URL(request.url);
  switch (url.pathname) {
    case "/": {
      const stats = await workers.getStats();
      return new Response(displayStats(stats));
    }
    case "/write-logs":
      await workers.unload();
      return Response.json("Logs were written.");
    default:
      return notFound();
  }
});
