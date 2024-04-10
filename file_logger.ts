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

import { writeAllSync } from "std/io/write_all.ts";

import { LoggingProvider } from "mtkruto/mod.ts";

const THRESHOLD = 1000;
/**
 * Creates a file logging provider for MTKruto.
 */
export function fileLogger(filename: string): LoggingProvider {
  const enc = new TextEncoder();
  const file = Deno.openSync(filename, {
    create: true,
    append: true,
    write: true,
  });
  let entries = new Array<any[]>();

  function write() {
    for (const entry of entries) {
      const text = enc.encode(
        entry.map((v) =>
          typeof v === "string" ? v : Deno.inspect(v, { colors: false })
        ).join(" ") + "\n",
      );
      writeAllSync(file, text);
    }
    entries = [];
  }

  function unload() {
    write();
    removeEventListener("unload", unload);
  }
  addEventListener("unload", unload);

  function log(...args: any[]) {
    entries.push(args);
    if (entries.length >= THRESHOLD) {
      write();
    }
  }

  return {
    error: log,
    warn: log,
    info: log,
    debug: log,
    log,
  };
}
