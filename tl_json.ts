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

import { decodeBase64, encodeBase64 } from "std/encoding/base64.ts";

import { functions, InputError, name, types } from "mtkruto/mod.ts";

function collectObjects(types: any, map: Record<string, any>) {
  for (const type of Object.values(types)) {
    const name_: string | undefined = (type as any)[name];
    if (name_) {
      map[name_] = type;
    }
    if ((type as any).constructor == Object) {
      collectObjects(type, map);
    }
  }
}

export const typeNameMap = {} as Record<string, any>;
export const functionNameMap = {} as Record<string, any>;
collectObjects(types, typeNameMap);
collectObjects(functions, functionNameMap);

export function deserialize(value: any): any {
  if (typeof value === "string") {
    return value;
  } else if (typeof value === "number") {
    return value;
  } else if (typeof value === "boolean") {
    return value ? true : undefined;
  } else if (typeof value === "object") {
    if (!("_" in value)) {
      throw new InputError("Expected object to contain the field _");
    }
    if (typeof value._ !== "string") {
      throw new InputError("Expected the _ field to be string");
    }
    if (value._ == "bigint") {
      if (!("value" in value)) {
        throw new InputError(
          "Expected BigInt object to include the field value",
        );
      }
      if (typeof value.value !== "string") {
        throw new InputError("Expected BigInt value to be string");
      }
      const v = value.value.trim();
      if (!v.trim()) {
        throw new InputError("Expected BigInt value to be non-empty");
      }
      try {
        return BigInt(v);
      } catch {
        throw new InputError(`Invalid BigInt: ${v}`);
      }
    }
    if (value._ == "bytes") {
      if (!("value" in value)) {
        throw new InputError(
          "Expected bytes object to include the field value",
        );
      }
      if (typeof value.value !== "string") {
        throw new InputError("Expected bytes value to be string");
      }
      const v = value.value.trim();
      if (!v.trim()) {
        throw new InputError("Expected bytes value to be non-empty");
      }
      try {
        return decodeBase64(v);
      } catch {
        throw new InputError("Expected bytes value to be vaild Base64");
      }
    }

    if (!(value._ in typeNameMap) && !(value._ in functionNameMap)) {
      throw new InputError(`Invalid type: ${value._}`);
    }

    // @ts-ignore: no idea why it errors, but trust me it works
    const params = Object.entries(value)
      .filter(([k]) => k != "_")
      .map(([k, v]) => [k, deserialize(v)]);
    // @ts-ignore: too complex to represent, I feel you
    const constructor = value._ in typeNameMap
      ? typeNameMap[value._]
      : functionNameMap[value._];
    return new constructor(Object.fromEntries(params));
  } else {
    throw new InputError(`Unexpected value: ${typeof value}`);
  }
}

export function serialize(value: any): any {
  if (typeof value === "string") {
    return value;
  } else if (typeof value === "number") {
    return value;
  } else if (typeof value === "boolean") {
    return value;
  } else if (value === undefined) {
    return false;
  } else if (typeof value === "bigint") {
    return {
      _: "bigint",
      value: value + "",
    };
  } else if (value instanceof Uint8Array) {
    return {
      _: "bytes",
      value: encodeBase64(value),
    };
  }

  // @ts-ignore: please
  const params = Object.entries(value)
    .filter(([k]) => k !== "__R")
    .map(([k, v]) => [k, serialize(v)]);

  return {
    _: value.constructor[name],
    ...Object.fromEntries(params),
  };
}
