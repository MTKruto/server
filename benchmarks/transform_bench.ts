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

import { transform } from "../transform.ts";

const date = new Date();
const object = { _: { _: { _: date, a: [date, date] } } };

Deno.bench("transform", () => {
  transform(object);
});

Deno.bench("JSON.stringify(transform)", () => {
  JSON.stringify(transform(object));
});

Deno.bench("JSON.parse(JSON.stringify(transform))", () => {
  JSON.parse(JSON.stringify(transform(object)));
});

Deno.bench("transform(JSON.parse(JSON.stringify(transform)))", () => {
  transform(JSON.parse(JSON.stringify(transform(object))));
});
