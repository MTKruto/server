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

import { functions, name } from "mtkruto/mod.ts";
import { isMtprotoFunction } from "mtkruto/client/0_utilities.ts";

const DISALLOWED_FUNCTIONS = [
  "invokeAfterMsg",
  "invokeAfterMsgs",
  "initConnection",
  "invokeWithLayer",
  "invokeWithoutUpdates",
  "invokeWithMessagesRange",
  "invokeWithTakeout",

  // auth.
  "auth.sendCode",
  "auth.signUp",
  "auth.signIn",
  "auth.logOut",
  "auth.resetAuthorizations",
  "auth.exportAuthorization",
  "auth.importAuthorization",
  "auth.bindTempAuthKey",
  "auth.importBotAuthorization",
  "auth.checkPassword",
  "auth.requestPasswordRecovery",
  "auth.recoverPassword",
  "auth.resendCode",
  "auth.cancelCode",
  "auth.dropTempAuthKeys",
  "auth.exportLoginToken",
  "auth.importLoginToken",
  "auth.acceptLoginToken",
  "auth.checkRecoveryPassword",
  "auth.importWebTokenAuthorization",
  "auth.requestFirebaseSms",
  "auth.resetLoginEmail",

  // upload.
  "upload.saveFilePart",
  "upload.getFile",
  "upload.saveBigFilePart",
  "upload.getWebFile",
  "upload.getCdnFile",
  "upload.reuploadCdnFile",
  "upload.getCdnFileHashes",
  "upload.getFileHashes",
];

export function isFunctionDisallowed(function_: any) {
  if (function_ instanceof functions.ping) {
    return false;
  }

  if (DISALLOWED_FUNCTIONS.includes(function_[name])) {
    return false;
  }

  if (isMtprotoFunction(function_)) {
    return false;
  }

  return true;
}
