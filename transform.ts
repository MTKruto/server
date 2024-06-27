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

import { decodeBase64, encodeBase64 } from "https://deno.land/std@0.224.0/encoding/base64.ts"; // DIRECT

/**
 * Utility function to transform dates in objects into a JSON-(de)serializable format and vice-verca.
 */
export function transform(a: any) {
  if (a != null && typeof a === "object") {
    for (const key in a) {
      if (a[key] != null && typeof a[key] === "object") {
        if (a[key] instanceof Date) {
          a[key] = { _: "date", value: a[key].toJSON() };
        } else if (a[key] instanceof Uint8Array) {
          a[key] = { _: "bytes", value: encodeBase64(a[key]) };
        } else if (
          "_" in a[key] && a[key]._ == "date" && "value" in a[key] &&
          typeof a[key].value === "string"
        ) {
          a[key] = new Date(a[key].value);
        } else if (
          "_" in a[key] && a[key]._ == "bigint" && "value" in a[key] &&
          typeof a[key].value === "string"
        ) {
          a[key] = BigInt(a[key].value);
        } else if (
          "_" in a[key] && a[key]._ == "bytes" && "value" in a[key] &&
          typeof a[key].value === "string"
        ) {
          a[key] = decodeBase64(a[key].value);
        } else {
          transform(a[key]);
        }
      } else if (typeof a[key] === "bigint") {
        a[key] = { _: "bigint", value: String(a[key]) };
      }
    }
  }
  return a;
}
