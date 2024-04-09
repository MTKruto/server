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

import { InputError } from "mtkruto/0_errors.ts";

export function parseGetParams(searchParams: URLSearchParams) {
  const args = [];
  const obj: Record<string, any> = {};
  let objHasKeys = false;
  for (const [key, value] of searchParams.entries()) {
    if (!value) {
      args.push(JSON.parse(key));
    } else {
      if (key in obj) {
        throw new InputError(
          `The search parameter "${key}" has a value assigned more than once.`,
        );
      }
      objHasKeys = true;
      obj[key] = JSON.parse(value);
    }
  }
  if (objHasKeys) {
    args.push(obj);
  }
  return args;
}

export async function parseFormDataParams(formData: FormData) {
  const args = [];
  for (const v of formData.values()) {
    args.push(
      typeof v === "string"
        ? JSON.parse(v)
        : new Uint8Array(await v.arrayBuffer()),
    );
  }
  return args;
}
