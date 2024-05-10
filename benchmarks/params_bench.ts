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

import { parseFormDataParams, parseGetParams } from "../params.ts";

const formData = new FormData();
const params = new URLSearchParams();

const args = [
  JSON.stringify(1),
  "MTKruto",
  false,
  null,
  [1, 2, 3, 4, 5, "", null, false],
  { _: [1, 2, 3, 4, 5, "", null, false] },
];
const kwargs = [
  ["a", "b"],
  ["c", "d"],
];
for (let i = 0; i < 2; ++i) {
  for (const arg of args.map((v) => JSON.stringify(v))) {
    params.set(arg, "");
    formData.append("_", arg);
  }
  for (const [k, v] of kwargs) {
    params.set(k, JSON.stringify(v));
  }
}
formData.append("_", new Blob([new Uint8Array(1024)]));
formData.append("_", JSON.stringify(Object.fromEntries(kwargs)));

Deno.bench("parseFormDataParams", () => {
  parseFormDataParams(formData);
});

Deno.bench("parseGetParams", () => {
  parseGetParams(params);
});
