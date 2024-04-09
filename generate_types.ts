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

import { Project } from "ts_morph/mod.ts";
import { name, paramDesc } from "mtkruto/mod.ts";

import { typeNameMap } from "./tl_json.ts";

const ROOT = import.meta.dirname + "";
const CLIENT = path.join(ROOT, "client");
const TYPES = path.join(CLIENT, "types.ts");
const ENUMS = path.join(CLIENT, "enums.ts");
const FUNCTIONS = path.join(CLIENT, "functions.ts");

try {
  Deno.removeSync(TYPES);
} catch {
  //
}
try {
  Deno.removeSync(ENUMS);
} catch {
  //
}
try {
  Deno.removeSync(FUNCTIONS);
} catch {
  //
}

const project = new Project();

function getType(type: any): any {
  if (type == Uint8Array) {
    return "Uint8Array";
  } else if (Array.isArray(type)) {
    return `${getType(type[0])}[]`;
  } else if (typeof type === "function" && name in type) {
    let n = type.name;
    if (n.startsWith("_")) {
      n = n.slice(1);
    }
    if (n.endsWith("_")) {
      n = n.slice(0, -1);
    }
    return "enum_" + n;
  } else {
    return type;
  }
}

const typesFile = project.createSourceFile(TYPES);
for (let [k, v] of Object.entries(typeNameMap)) {
  k = "type_" + k.replace(".", "_");

  const params = v[paramDesc] as any[];
  typesFile.addInterface({
    name: k,
    isExported: true,
    properties: params
      .filter(([, , ntype]) => ntype != "#")
      .map(([name, type, ntype]) => ({
        name,
        hasQuestionToken: type == "true" && ntype.includes("."),
        type: getType(type),
      })),
  });
}

project.saveSync();
