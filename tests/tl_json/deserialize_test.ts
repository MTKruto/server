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

import { functions, types } from "mtkruto/mod.ts";

import { deserialize } from "../../tl_json.ts";

Deno.test("errors on null, symbol, undefined", () => {
  assertThrows(() => deserialize(null));
  assertThrows(() => deserialize(Symbol.for("err")));
  assertThrows(() => deserialize(undefined));
});

Deno.test("returns strings as-is", () => {
  for (let i = 0; i < 100; ++i) {
    const id = crypto.randomUUID();
    assertEquals(deserialize(id), id);
  }
});

Deno.test("returns true as-is", () => {
  assertEquals(deserialize(true), true);
});

Deno.test("returns false as undefined", () => {
  assertEquals(deserialize(false), undefined);
});

Deno.test("errors on objects with no _ field", () => {
  assertThrows(() => deserialize({}));
  assertThrows(() => deserialize({ a: 1 }));
});

Deno.test("errors on BigInt objects with no value field", () => {
  assertThrows(() => deserialize({ _: "bigint" }));
});

Deno.test("errors on BigInt objects with non-string value field", () => {
  assertThrows(() => deserialize({ _: "bigint", value: 1 }));
});
Deno.test("errors on BigInt objects with empty value field", () => {
  assertThrows(() => deserialize({ _: "bigint", value: "" }));
});

Deno.test("properly deserializes BigInt objects", () => {
  for (let i = 0; i < 1000; ++i) {
    const bi = BigInt(Math.ceil(Math.random() * 1000));
    assertEquals(deserialize({ _: "bigint", value: String(bi) }), bi);
  }
});
Deno.test("errors on bytes objects with no value field", () => {
  assertThrows(() => deserialize({ _: "bytes" }));
});

Deno.test("errors on bytes objects with non-string value field", () => {
  assertThrows(() => deserialize({ _: "bytes", value: 1 }));
});
Deno.test("errors on bytes objects with empty value field", () => {
  assertThrows(() => deserialize({ _: "bytes", value: "" }));
});

Deno.test("properly deserializes bytes objects", () => {
  const enc = new TextEncoder();
  for (let i = 0; i < 1000; ++i) {
    const bytes = Math.ceil(Math.random() * 1000) + "";
    assertEquals(
      deserialize({ _: "bytes", value: btoa(bytes) }),
      enc.encode(bytes),
    );
  }
});

Deno.test("properly deserializes functions", () => {
  for (let i = 0; i < 1000; ++i) {
    const pingId = BigInt(1 + Math.ceil(Math.random() * 1000));
    assertEquals(
      deserialize({ _: "ping", ping_id: { _: "bigint", value: pingId + "" } }),
      new functions.ping({ ping_id: pingId }),
    );
  }

  const actual = {
    _: "messages.sendMedia",
    random_id: {
      _: "bigint",
      value: "123",
    },
    peer: {
      _: "inputPeerSelf",
    },
    media: {
      _: "inputMediaPhoto",
      id: {
        _: "inputPhoto",
        id: { _: "bigint", value: "123" },
        access_hash: { _: "bigint", value: "123" },
        file_reference: { _: "bytes", value: btoa("R") },
      },
      spoiler: true,
    },
    message: "Test",
    silent: false,
  };
  const expected = new functions.messages.sendMedia({
    random_id: 123n,
    peer: new types.InputPeerSelf(),
    media: new types.InputMediaPhoto({
      id: new types.InputPhoto({
        id: 123n,
        access_hash: 123n,
        file_reference: new Uint8Array([0x52]),
      }),
      spoiler: true,
    }),
    message: "Test",
    silent: undefined,
  });
  assertEquals(deserialize(actual), expected);
});
