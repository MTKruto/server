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

import { assertEquals, assertThrows } from "std/assert/mod.ts";

import { parseGetParams } from "../params.ts";

// null = throws
const cases: [string, any[] | null][] = [
  ["invalidJSON", null],
  ["a=invalidJSON", null],
  ["null&a=1", [null, { a: 1 }]],
  [
    'null&1&"Hello, world!"&[1]&{"a":1}',
    [null, 1, "Hello, world!", [1], { a: 1 }],
  ],
  ["a=1&a=1", null], // duplicate key
];
Deno.test("parseGetParams", () => {
  for (const [a, e] of cases) {
    const fn = () => parseGetParams(new URLSearchParams(a));
    if (e == null) {
      assertThrows(fn);
    } else {
      assertEquals(fn(), e);
    }
  }
});
