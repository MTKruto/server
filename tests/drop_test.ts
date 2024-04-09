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

import {
  assertInstanceOf,
  assertStringIncludes,
  fail,
} from "std/assert/mod.ts";

async function assertDrops(promise: Promise<Response>) {
  try {
    await promise;
    fail();
  } catch (err) {
    assertInstanceOf(err, TypeError);
    assertStringIncludes(
      err.message,
      "connection closed before message completed",
    );
  }
}

Deno.test("drops requests with non-POST neither GET methods", async () => {
  await assertDrops(fetch("http://localhost:8000", { method: "PUT" }));
  await assertDrops(fetch("http://localhost:8000", { method: "DELETE" }));
  // TODO: fix HEAD
});
