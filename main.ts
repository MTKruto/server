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
import { DROP } from "./drop.ts";
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
const { port, apiId, apiHash, workerCount, statsPath, addUser: addUser_ } =
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
    log.info(`Stats can be accessed from ${statsPath}.`);
  },
}, async (req) => {
  const url = new URL(req.url);
  if (req.method != "POST" && req.method != "GET") {
    return DROP();
  }
  if (url.pathname == statsPath) {
    const stats = await workers.getStats();
    return new Response(displayStats(stats));
  }
  let params: any[];
  try {
    if (req.method == "POST") {
      const contentType = req.headers.get("content-type");
      if (contentType == "application/json") {
        params = await req.json();
        if (!Array.isArray(params)) {
          return DROP();
        }
      } else if (contentType?.startsWith("multipart/form-data")) {
        params = await parseFormDataParams(await req.formData());
      } else {
        return DROP();
      }
    } else {
      params = parseGetParams(url.searchParams);
    }
  } catch (err) {
    console.error(err);
    return DROP();
  }
  const parts = url.pathname.slice(1).split("/").map(decodeURIComponent);
  if (parts.length != 2) {
    return DROP();
  }
  const [id, method] = parts as [string, AllowedMethod | "getUpdates"];
  return handleRequest(id, method, params);
});

async function handleRequest(id: string, method: string, params: any[]) {
  const worker = await workers.getClientWorker(id);
  if (isAllowedMethod(method)) {
    return await handleMethod(worker, id, method, params);
  }
  switch (method) {
    case "getUpdates":
      return handleGetUpdates(worker, id);
    case "invoke":
      if (params.length != 1) {
        return Response.json("A single argument was expected.", {
          status: 400,
          headers: { "x-error-type": "input" },
        });
      }
      return await handleInvoke(worker, id, params[0]);
    case "setWebhook":
      if (params.length != 1) {
        return Response.json("A single argument was expected.", {
          status: 400,
          headers: { "x-error-type": "input" },
        });
      }
      return await handleSetWebhook(worker, id, params[0]);
    case "deleteWebhook":
      if (params.length != 0) {
        return Response.json("No arguments were expected.", {
          status: 400,
          headers: { "x-error-type": "input" },
        });
      }
      return await handleDeleteWebhook(worker, id);
    case "dropPendingUpdates":
      if (params.length != 0) {
        return Response.json("No arguments were expected.", {
          status: 400,
          headers: { "x-error-type": "input" },
        });
      }
      return await handleDropPendingUpdates(worker, id);
    default:
      return Response.json("Invalid method", {
        status: 400,
        headers: { "x-error-type": "input" },
      });
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
    return DROP();
  } else {
    return Response.json(...result);
  }
}

function handleGetUpdates(worker: number, id: string) {
  const enc = new TextEncoder();
  return new Response(
    new ReadableStream(
      {
        async start(controller) {
          try {
            const updates = await workers.call(worker, "getUpdates", id, 0);
            controller.enqueue(enc.encode(JSON.stringify(updates)));
            controller.close();
          } catch {
            controller.error();
          }
        },
        async cancel() {
          await workers.call(worker, "abortGetUpdates", id);
        },
      },
    ),
  );
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
