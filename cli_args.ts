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

import { parseArgs } from "std/cli/mod.ts";

interface CliArgs {
  port: number;
  apiId: number;
  apiHash: string;
  workerCount: number;
  statsPort: number;
  addUser: boolean;
}

/**
 * Parses CLI arguments. Returns a string describing the error if failed or {@link CliArgs} if succeeded.
 */
export function parseCliArgs(argsList: string[]): string | CliArgs {
  const args = parseArgs(argsList);
  const apiId = args["api-id"];
  if (apiId === undefined || apiId === true) {
    return "API ID not provided.";
  }
  if (typeof apiId !== "number") {
    return "API ID must be a number.";
  }
  if (!apiId) {
    return "Invalid API ID.";
  }
  let apiHash = args["api-hash"];
  if (apiHash === undefined || apiHash === true) {
    return "API hash not provided.";
  }
  if (typeof apiHash !== "string") {
    return "API hash must be a string.";
  }
  apiHash = apiHash.trim();
  if (!apiHash) {
    return "Invalid API hash.";
  }
  const workerCount = args["workers"] ?? 1;
  if (
    typeof workerCount !== "number" || !workerCount || workerCount < 0 ||
    workerCount % 1 != 0 || workerCount > 1_000
  ) {
    return "Invalid worker count.";
  }
  const port = args["port"] ?? 8000;
  if (typeof port !== "number") {
    return "Port must be a number.";
  }
  if (!port || port < 0 || port > 0xFFFF || port % 1 != 0) {
    return "Invalid port.";
  }
  const statsPort = args["stats-port"] ?? 3000;
  if (typeof statsPort !== "number") {
    return "Stats port must be a number.";
  }
  if (!statsPort || statsPort < 0 || statsPort > 0xFFFF || statsPort % 1 != 0) {
    return "Invalid stats port.";
  }
  const addUser = args["add-user"] ?? false;
  if (typeof addUser !== "boolean") {
    return "Invalid value for --add-user.";
  }
  for (const arg of Object.keys(args)) {
    if (
      !["_", "api-id", "api-hash", "workers", "stats", "port", "add-user"]
        .includes(arg)
    ) {
      return `Invalid argument: ${arg}`;
    }
  }
  if (args._.length) {
    return `Invalid argument: ${args._[0]}`;
  }
  return {
    port,
    apiId,
    apiHash,
    workerCount,
    statsPort,
    addUser,
  };
}
