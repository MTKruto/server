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

export const ALLOWED_METHODS = [
  "getMe",
  "showUsername",
  "hideUsername",
  "reorderUsernames",
  "hideUsernames",
  "getBusinessConnection",
  "sendMessage",
  "sendPhoto",
  "sendDocument",
  "sendSticker",
  "sendVideo",
  "sendAnimation",
  "sendVoice",
  "sendAudio",
  "sendVideoNote",
  "sendLocation",
  "sendContact",
  "sendDice",
  "sendVenue",
  "sendPoll",
  "editMessageText",
  "editInlineMessageText",
  "editMessageReplyMarkup",
  "editInlineMessageReplyMarkup",
  "editMessageLiveLocation",
  "editInlineMessageLiveLocation",
  "getMessages",
  "getMessage",
  "deleteMessages",
  "deleteMessage",
  "deleteChatMemberMessages",
  "pinMessage",
  "unpinMessage",
  "unpinMessages",
  "forwardMessages",
  "forwardMessage",
  "stopPoll",
  "sendChatAction",
  "searchMessages",
  "getCustomEmojiStickers",
  "getChat",
  "getHistory",
  "setAvailableReactions",
  "setChatPhoto",
  "deleteChatPhoto",
  "banChatMember",
  "unbanChatMember",
  "kickChatMember",
  "setChatMemberRights",
  "getChatAdministrators",
  "enableJoinRequests",
  "disableJoinRequests",
  "getInactiveChats",
  "getCreatedInviteLinks",
  "joinChat",
  "leaveChat",
  "getChatMember",
  "setChatStickerSet",
  "deleteChatStickerSet",
  "setBoostsRequiredToCircumventRestrictions",
  "createInviteLink",
  "answerCallbackQuery",
  "answerInlineQuery",
  "setMyDescription",
  "setMyName",
  "setMyShortDescription",
  "getMyDescription",
  "getMyName",
  "getMyShortDescription",
  "setMyCommands",
  "getMyCommands",
  "setReactions",
  "addReaction",
  "removeReaction",
  "getStories",
  "getStory",
  "deleteStories",
  "deleteStory",
  "addStoriesToHighlights",
  "addStoryToHighlights",
  "removeStoriesFromHighlights",
  "removeStoryFromHighlights",
  "blockUser",
  "unblockUser",
] as const;

export type AllowedMethod = (typeof ALLOWED_METHODS)[number];

export function isAllowedMethod(value: unknown): value is AllowedMethod {
  return (ALLOWED_METHODS as readonly unknown[]).includes(value);
}
