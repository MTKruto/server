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

const ROOT = path.dirname(import.meta.dirname + "");
const MAIN = path.join(ROOT, "main.ts");
const TESTS = path.join(ROOT, "tests");

const proc = new Deno.Command("deno", {
  args: ["run", "-A", MAIN, "--api-id", "1", "--api-hash", "aabbcc"],
  stdout: "piped",
}).spawn();

const dec = new TextDecoder();
const reader = proc.stdout.getReader();
while (true) {
  const text = dec.decode((await reader.read()).value ?? new Uint8Array());
  if (text.includes("port 8000")) {
    reader.releaseLock();
    break;
  }
}

await new Deno.Command("deno", { args: ["test", "--no-check", "-A", TESTS] })
  .spawn()
  .output();

proc.unref();

try {
  Deno.removeSync(path.join(ROOT, ".logs"), { recursive: true });
} catch {
  //
}
try {
  Deno.removeSync(path.join(ROOT, ".kv"), { recursive: true });
} catch {
  //
}
