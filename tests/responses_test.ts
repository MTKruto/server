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

import { assertThrows } from "std/assert/mod.ts";

import { assertArgCount } from "../responses.ts";

Deno.test("assertArgCount", () => {
  assertArgCount(2, 2);
  assertThrows(() => {
    assertArgCount(1, 2);
  });
  assertThrows(() => {
    assertArgCount(0, 1);
  });
  assertThrows(() => {
    assertArgCount(1, 0);
  });
});
