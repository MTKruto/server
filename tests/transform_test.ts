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

import { assertEquals } from "std/assert/mod.ts";

import { transform } from "../transform.ts";

Deno.test("transform", () => {
  const date = new Date();
  const bigint = 123123n;
  const buffer = crypto.getRandomValues(new Uint8Array(1024));
  const a = {
    _: {
      _: { _: date, a: [buffer, date, date], bigint, c: bigint, x: buffer },
    },
  };
  assertEquals(transform(transform(a)), a);
});
