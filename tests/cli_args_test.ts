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

import { assert } from "std/assert/mod.ts";

import { parseCliArgs } from "../cli_args.ts";

const port = ["--port", "8080"];
const apiId = ["--api-id", "1"];
const apiHash = ["--api-hash", "abc"];
const workerCount = ["--workers", "2"];
const statsPath = ["--stats", "/stats"];

function assertFails(argList: string[]) {
  assert(typeof parseCliArgs(argList) === "string");
}

function assertOk(argList: string[]) {
  assert(typeof parseCliArgs(argList) !== "string");
}

Deno.test("port", () => {
  const otherArgs = [...apiId, ...apiHash, ...workerCount, ...statsPath];

  assertFails(["--port", "a", ...otherArgs]);
  assertFails(["--port", "0", ...otherArgs]);
  assertFails(["--port", "-1", ...otherArgs]);
  assertFails(["--port", "1.1", ...otherArgs]);
  assertFails(["--port", "65537", ...otherArgs]);
  assertOk(["--port", "80", ...otherArgs]);
  assertOk(["--port", "3030", ...otherArgs]);
});

Deno.test("apiId", () => {
  const otherArgs = [...port, ...apiHash, ...workerCount, ...statsPath];

  assertFails(["--api-id", "a", ...otherArgs]);
  assertFails(["--api-id", "0", ...otherArgs]);
  assertOk(["--api-id", "1", ...otherArgs]);
});

Deno.test("apiHash", () => {
  const otherArgs = [...port, ...apiId, ...workerCount, ...statsPath];

  assertFails(["--api-hash", "1", ...otherArgs]);
  assertFails(["--api-hash", " ", ...otherArgs]);
  assertOk(["--api-hash", "aabbcc", ...otherArgs]);
});

Deno.test("workerCount", () => {
  const otherArgs = [...port, ...apiId, ...apiHash, ...statsPath];

  assertFails(["--workers", "30000", ...otherArgs]);
  assertFails(["--workers", "1.1", ...otherArgs]);
  assertFails(["--workers", "-1", ...otherArgs]);
  assertFails(["--workers", "0", ...otherArgs]);
  assertOk(["--workers", "4", ...otherArgs]);
});

Deno.test("statsPath", () => {
  const otherArgs = [...port, ...apiId, ...apiHash, ...workerCount];

  assertFails(["--stats", " ", ...otherArgs]);
  assertFails(["--stats", "stats", ...otherArgs]);
  assertOk(["--stats", "/stats", ...otherArgs]);
});
