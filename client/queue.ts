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

export class Queue {
  functions = new Array<() => Promise<void>>();

  add(fn: () => Promise<void>) {
    this.functions.push(fn);
    this.#check();
  }

  #busy = false;
  #check() {
    if (this.#busy) {
      return;
    } else {
      this.#busy = true;
    }
    const fn = this.functions.shift();
    if (fn !== undefined) {
      fn()
        .catch((_err) => {
          // TODO
        })
        .finally(() => {
          this.#busy = false;
          this.#check();
        });
    } else {
      this.#busy = false;
    }
  }
}
