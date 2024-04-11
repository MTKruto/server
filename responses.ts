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

/**
 * Creates a response that closes the incoming TCP connection.
 */
export function drop() {
  return new Response(
    new ReadableStream({
      start(controller) {
        controller.error();
      },
    }),
  );
}

export function badRequest(body: string) {
  return Response.json(body, {
    status: 400,
    headers: { "x-error-type": "input" },
  });
}

export function notFound() {
  return Response.json("Not found", {
    status: 404,
  });
}

export function methodNotAllowed() {
  return Response.json("Method not allowed", {
    status: 403,
  });
}

export function assertArgCount(actual: number, expected: number) {
  if (expected == 0 && actual != 0) {
    throw badRequest("No arguments were expected.");
  }
  if (expected == 1 && actual != 1) {
    throw badRequest("A single argument was expected.");
  }
  if (actual != expected) {
    throw badRequest(`${expected} arguments were expected.`);
  }
}
