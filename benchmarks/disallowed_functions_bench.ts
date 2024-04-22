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

import { functions } from "mtkruto/mod.ts";
import { ALLOWED_METHODS } from "../allowed_methods.ts";
import { isFunctionDisallowed } from "../disallowed_functions.ts";

Deno.bench("isFunctionDisallowed(ping)", () => {
  isFunctionDisallowed(new functions.ping({ ping_id: 0n }));
});

Deno.bench("isFunctionDisallowed(Allowed Method)", () => {
  isFunctionDisallowed(ALLOWED_METHODS[0]);
});

Deno.bench("isFunctionDisallowed(MTProto Function)", () => {
  isFunctionDisallowed(
    new functions.req_DH_params({
      nonce: 0n,
      encrypted_data: new Uint8Array(),
      p: new Uint8Array(),
      q: new Uint8Array(),
      public_key_fingerprint: 0n,
      server_nonce: 0n,
    }),
  );
});

Deno.bench("isFunctionDisallowed(ALLOWED_METHODS)", () => {
  ALLOWED_METHODS.map(isFunctionDisallowed);
});
