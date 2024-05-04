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

/**
 * Utility function to transform dates in objects into a JSON-(de)serializable format and vice-verca.
 */
export function transform(a: any) {
  if (a != null && typeof a === "object") {
    for (const key in a) {
      if (a[key] != null && typeof a[key] === "object") {
        if (a[key] instanceof Date) {
          a[key] = { _: "date", value: a[key].toJSON() };
        } else if (
          "_" in a[key] && a[key] == "date" && "value" in a[key] && typeof a[key].value === "string"
        ) {
          a[key] = new Date(a[key].value);
        } else {
          transform(a[key]);
        }
      }
    }
  }
  return a;
}
