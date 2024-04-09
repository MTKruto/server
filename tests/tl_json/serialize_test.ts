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
import { encodeBase64 } from "std/encoding/base64.ts";

import { functions, types } from "mtkruto/mod.ts";

import { serialize } from "../../tl_json.ts";

Deno.test("string", () => {
  assertEquals(serialize("string"), "string");
});

Deno.test("number", () => {
  assertEquals(serialize("number"), "number");
});

Deno.test("bigint", () => {
  assertEquals(serialize(123n), { _: "bigint", value: "123" });
});

Deno.test("boolean", () => {
  assertEquals(serialize(true), true);
  assertEquals(serialize(false), false);
});

Deno.test("undefined", () => {
  assertEquals(serialize(undefined), false);
});

Deno.test("bytes", () => {
  const enc = new TextEncoder();
  const bytes = enc.encode("Hello, world!");
  assertEquals(serialize(bytes), { _: "bytes", value: encodeBase64(bytes) });
});

Deno.test("object", () => {
  const actual = new functions.messages.sendMedia({
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
  const expected = {
    _: "messages.sendMedia",
    background: false,
    clear_draft: false,
    entities: false,
    invert_media: false,
    media: {
      _: "inputMediaPhoto",
      id: {
        _: "inputPhoto",
        access_hash: {
          _: "bigint",
          value: "123",
        },
        file_reference: {
          _: "bytes",
          value: "Ug==",
        },
        id: {
          _: "bigint",
          value: "123",
        },
      },
      spoiler: true,
      ttl_seconds: false,
    },
    message: "Test",
    noforwards: false,
    peer: {
      _: "inputPeerSelf",
    },
    quick_reply_shortcut: false,
    random_id: {
      _: "bigint",
      value: "123",
    },
    reply_markup: false,
    reply_to: false,
    schedule_date: false,
    send_as: false,
    silent: false,
    update_stickersets_order: false,
  };
  assertEquals(serialize(actual), expected);
});
