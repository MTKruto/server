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
  AllowedMethod,
  BotCommand,
  BusinessConnection,
  Chat,
  ChatMember,
  cleanObject,
  Client_,
  Composer,
  Context_,
  InactiveChat,
  InviteLink,
  Message,
  MessageAnimation,
  MessageAudio,
  MessageContact,
  MessageDice,
  MessageDocument,
  MessageLocation,
  MessagePhoto,
  MessagePoll,
  MessageSticker,
  MessageText,
  MessageVenue,
  MessageVideo,
  MessageVideoNote,
  MessageVoice,
  Poll,
  resolve,
  Sticker,
  Story,
  unimplemented,
  unreachable,
  Update,
  User,
} from "./deps.ts";
import { Queue } from "./queue.ts";

export interface Context extends Omit<Context_, "client"> {
  client: Client;
}

export class InternalError extends Error {
}

export class InputError extends Error {
}

export class TelegramError extends Error {
  constructor(code: number, description: string) {
    super(`${code}: ${description}`);
  }
}

export class Client<C extends Context = Context> extends Composer<C> {
  #endpoint: string;

  constructor(endpoint: string) {
    super();
    if (!endpoint.endsWith("/")) {
      endpoint += "/";
    }
    this.#endpoint = endpoint;
  }

  #me: User | null = null;
  #getMe() {
    if (this.#me == null) {
      unreachable("Not inited");
    } else {
      return this.#me;
    }
  }
  #inited = false;
  async init() {
    if (this.#inited) {
      return;
    }
    this.#me = await this.getMe();
    this.#inited = true;
  }

  #constructContext = async (update: Update) => {
    const msg = "message" in update
      ? update.message
      : "editedMessage" in update
      ? update.editedMessage
      : "callbackQuery" in update
      ? update.callbackQuery.message
      : undefined;
    const reactions = "messageInteractions" in update
      ? update.messageInteractions
      : undefined;
    const mustGetMsg = () => {
      if (msg !== undefined) {
        return {
          chatId: msg.chat.id,
          messageId: msg.id,
          businessConnectionId: msg.businessConnectionId,
          senderId: (msg.from ?? msg.senderChat)?.id,
        };
      } else if (reactions !== undefined) {
        return { chatId: reactions.chatId, messageId: reactions.messageId };
      } else {
        unreachable();
      }
    };
    const mustGetUserId = () => {
      if (msg?.from) {
        return msg.from.id;
      } else if ("callbackQuery" in update) {
        return update.callbackQuery.from.id;
      } else if ("chosenInlineResult" in update) {
        return update.chosenInlineResult.from.id;
      } else {
        unreachable();
      }
    };
    const mustGetInlineMsgId = () => {
      if ("chosenInlineResult" in update) {
        if (update.chosenInlineResult.inlineMessageId) {
          return update.chosenInlineResult.inlineMessageId;
        }
      } else if ("callbackQuery" in update) {
        if (update.callbackQuery.inlineMessageId) {
          return update.callbackQuery.inlineMessageId;
        }
      }
      unreachable();
    };
    const chat_ = "messageReactions" in update
      ? update.messageReactions.chat
      : "messageReactionCount" in update
      ? update.messageReactionCount.chat
      : undefined;
    const chat = chat_ ?? msg?.chat;
    const from = "callbackQuery" in update
      ? update.callbackQuery.from
      : "inlineQuery" in update
      ? update.inlineQuery.from
      : "message" in update
      ? update.message.from
      : "editedMessage" in update
      ? update.editedMessage?.from
      : undefined;
    const senderChat = msg?.senderChat;
    const getReplyToMessageId = (
      quote: boolean | undefined,
      chatId: number,
      messageId: number,
    ) => {
      const isPrivate = chatId > 0;
      const shouldQuote = quote === undefined ? !isPrivate : quote;
      const replyToMessageId = shouldQuote ? messageId : undefined;
      return replyToMessageId;
    };
    const me = await this.#getMe();

    const context: Context = {
      ...update,
      client: this as unknown as Client,
      me: (me == null ? undefined : me) as C["me"],
      msg: msg as C["msg"],
      chat: chat as C["chat"],
      from: from as C["from"],
      senderChat: senderChat as C["senderChat"],
      get toJSON() {
        return () => update;
      },
      reply: (text, params) => {
        const { chatId, messageId, businessConnectionId } = mustGetMsg();
        const replyToMessageId = getReplyToMessageId(
          params?.quote,
          chatId,
          messageId,
        );
        return this.sendMessage(chatId, text, {
          ...params,
          replyToMessageId,
          businessConnectionId,
        });
      },
      replyPhoto: (photo, params) => {
        const { chatId, messageId, businessConnectionId } = mustGetMsg();
        const replyToMessageId = getReplyToMessageId(
          params?.quote,
          chatId,
          messageId,
        );
        return this.sendPhoto(chatId, photo, {
          ...params,
          replyToMessageId,
          businessConnectionId,
        });
      },
      replyDocument: (document, params) => {
        const { chatId, messageId, businessConnectionId } = mustGetMsg();
        const replyToMessageId = getReplyToMessageId(
          params?.quote,
          chatId,
          messageId,
        );
        return this.sendDocument(chatId, document, {
          ...params,
          replyToMessageId,
          businessConnectionId,
        });
      },
      replySticker: (sticker, params) => {
        const { chatId, messageId, businessConnectionId } = mustGetMsg();
        const replyToMessageId = getReplyToMessageId(
          params?.quote,
          chatId,
          messageId,
        );
        return this.sendSticker(chatId, sticker, {
          ...params,
          replyToMessageId,
          businessConnectionId,
        });
      },
      replyPoll: (question, options, params) => {
        const { chatId, messageId, businessConnectionId } = mustGetMsg();
        const replyToMessageId = getReplyToMessageId(
          params?.quote,
          chatId,
          messageId,
        );
        return this.sendPoll(chatId, question, options, {
          ...params,
          replyToMessageId,
          businessConnectionId,
        });
      },
      replyContact: (firstName, number, params) => {
        const { chatId, messageId, businessConnectionId } = mustGetMsg();
        const replyToMessageId = getReplyToMessageId(
          params?.quote,
          chatId,
          messageId,
        );
        return this.sendContact(chatId, firstName, number, {
          ...params,
          replyToMessageId,
          businessConnectionId,
        });
      },
      replyLocation: (latitude, longitude, params) => {
        const { chatId, messageId, businessConnectionId } = mustGetMsg();
        const replyToMessageId = getReplyToMessageId(
          params?.quote,
          chatId,
          messageId,
        );
        return this.sendLocation(chatId, latitude, longitude, {
          ...params,
          replyToMessageId,
          businessConnectionId,
        });
      },
      replyDice: (params) => {
        const { chatId, messageId, businessConnectionId } = mustGetMsg();
        const replyToMessageId = getReplyToMessageId(
          params?.quote,
          chatId,
          messageId,
        );
        return this.sendDice(chatId, {
          ...params,
          replyToMessageId,
          businessConnectionId,
        });
      },
      replyVenue: (latitude, longitude, title, address, params) => {
        const { chatId, messageId, businessConnectionId } = mustGetMsg();
        const replyToMessageId = getReplyToMessageId(
          params?.quote,
          chatId,
          messageId,
        );
        return this.sendVenue(chatId, latitude, longitude, title, address, {
          ...params,
          replyToMessageId,
          businessConnectionId,
        });
      },

      replyVideo: (video, params) => {
        const { chatId, messageId, businessConnectionId } = mustGetMsg();
        const replyToMessageId = getReplyToMessageId(
          params?.quote,
          chatId,
          messageId,
        );
        return this.sendVideo(chatId, video, {
          ...params,
          replyToMessageId,
          businessConnectionId,
        });
      },
      replyAnimation: (document, params) => {
        const { chatId, messageId, businessConnectionId } = mustGetMsg();
        const replyToMessageId = getReplyToMessageId(
          params?.quote,
          chatId,
          messageId,
        );
        return this.sendAnimation(chatId, document, {
          ...params,
          replyToMessageId,
          businessConnectionId,
        });
      },
      replyVoice: (document, params) => {
        const { chatId, messageId, businessConnectionId } = mustGetMsg();
        const replyToMessageId = getReplyToMessageId(
          params?.quote,
          chatId,
          messageId,
        );
        return this.sendVoice(chatId, document, {
          ...params,
          replyToMessageId,
          businessConnectionId,
        });
      },
      replyAudio: (document, params) => {
        const { chatId, messageId, businessConnectionId } = mustGetMsg();
        const replyToMessageId = getReplyToMessageId(
          params?.quote,
          chatId,
          messageId,
        );
        return this.sendAudio(chatId, document, {
          ...params,
          replyToMessageId,
          businessConnectionId,
        });
      },
      replyVideoNote: (videoNote, params) => {
        const { chatId, messageId, businessConnectionId } = mustGetMsg();
        const replyToMessageId = getReplyToMessageId(
          params?.quote,
          chatId,
          messageId,
        );
        return this.sendVideoNote(chatId, videoNote, {
          ...params,
          replyToMessageId,
          businessConnectionId,
        });
      },
      delete: () => {
        const { chatId, messageId } = mustGetMsg();
        return this.deleteMessage(chatId, messageId);
      },
      forward: (to, params) => {
        const { chatId, messageId } = mustGetMsg();
        return this.forwardMessage(
          chatId,
          to,
          messageId,
          params,
        ) as unknown as ReturnType<C["forward"]>;
      },
      pin: (params) => {
        const { chatId, messageId } = mustGetMsg();
        return this.pinMessage(chatId, messageId, params);
      },
      unpin: () => {
        const { chatId, messageId } = mustGetMsg();
        return this.unpinMessage(chatId, messageId);
      },
      banSender: (params) => {
        const { chatId, senderId } = mustGetMsg();
        if (!senderId) {
          unreachable();
        }
        return this.banChatMember(chatId, senderId, params);
      },
      kickSender: () => {
        const { chatId, senderId } = mustGetMsg();
        if (!senderId) {
          unreachable();
        }
        return this.kickChatMember(chatId, senderId);
      },
      setSenderRights: (params) => {
        const { chatId, senderId } = mustGetMsg();
        if (!senderId) {
          unreachable();
        }
        return this.setChatMemberRights(chatId, senderId, params);
      },
      getChatAdministrators: () => {
        const { chatId } = mustGetMsg();
        return this.getChatAdministrators(chatId);
      },
      react: (reactions, params) => {
        const { chatId, messageId } = mustGetMsg();
        return this.setReactions(chatId, messageId, reactions, params);
      },
      answerCallbackQuery: (params) => {
        if (!("callbackQuery" in update)) {
          unreachable();
        }
        return this.answerCallbackQuery(update.callbackQuery.id, params);
      },
      answerInlineQuery: (results, params) => {
        if (!("inlineQuery" in update)) {
          unreachable();
        }
        return this.answerInlineQuery(update.inlineQuery.id, results, params);
      },
      sendChatAction: (chatAction, params) => {
        const { chatId } = mustGetMsg();
        return this.sendChatAction(chatId, chatAction, params);
      },
      editInlineMessageText: (text, params) => {
        const inlineMessageId = mustGetInlineMsgId();
        return this.editInlineMessageText(inlineMessageId, text, params);
      },
      editInlineMessageLiveLocation: (latitude, longitude, params) => {
        const inlineMessageId = mustGetInlineMsgId();
        return this.editInlineMessageLiveLocation(
          inlineMessageId,
          latitude,
          longitude,
          params,
        );
      },
      editInlineMessageReplyMarkup: (params) => {
        const inlineMessageId = mustGetInlineMsgId();
        return this.editInlineMessageReplyMarkup(inlineMessageId, params);
      },
      editMessageText: (messageId, text, params) => {
        const { chatId } = mustGetMsg();
        return this.editMessageText(chatId, messageId, text, params);
      },
      editMessageLiveLocation: (messageId, latitude, longitude, params) => {
        const { chatId } = mustGetMsg();
        return this.editMessageLiveLocation(
          chatId,
          messageId,
          latitude,
          longitude,
          params,
        );
      },
      editMessageReplyMarkup: (messageId, params) => {
        const { chatId } = mustGetMsg();
        return this.editMessageReplyMarkup(chatId, messageId, params);
      },
      getMessage: (messageId) => {
        const { chatId } = mustGetMsg();
        return this.getMessage(chatId, messageId);
      },
      getMessages: (messageIds) => {
        const { chatId } = mustGetMsg();
        return this.getMessages(chatId, messageIds);
      },
      forwardMessage: (to, messageId, params) => {
        const { chatId } = mustGetMsg();
        return this.forwardMessage(chatId, to, messageId, params);
      },
      forwardMessages: (to, messageIds, params) => {
        const { chatId } = mustGetMsg();
        return this.forwardMessages(chatId, to, messageIds, params);
      },
      deleteMessage: (messageId, params) => {
        const { chatId } = mustGetMsg();
        return this.deleteMessage(chatId, messageId, params);
      },
      deleteMessages: (messageIds, params) => {
        const { chatId } = mustGetMsg();
        return this.deleteMessages(chatId, messageIds, params);
      },
      pinMessage: (messageId, params) => {
        const { chatId } = mustGetMsg();
        return this.pinMessage(chatId, messageId, params);
      },
      unpinMessage: (messageId) => {
        const { chatId } = mustGetMsg();
        return this.unpinMessage(chatId, messageId);
      },
      unpinMessages: () => {
        const { chatId } = mustGetMsg();
        return this.unpinMessages(chatId);
      },
      setAvailableReactions: (availableReactions) => {
        const { chatId } = mustGetMsg();
        return this.setAvailableReactions(chatId, availableReactions);
      },
      addReaction: (messageId, reaction, params) => {
        const { chatId } = mustGetMsg();
        return this.addReaction(chatId, messageId, reaction, params);
      },
      removeReaction: (messageId, reaction) => {
        const { chatId } = mustGetMsg();
        return this.removeReaction(chatId, messageId, reaction);
      },
      setReactions: (messageId, reactions, params) => {
        const { chatId } = mustGetMsg();
        return this.setReactions(chatId, messageId, reactions, params);
      },
      setChatPhoto: (photo, params) => {
        const { chatId } = mustGetMsg();
        return this.setChatPhoto(chatId, photo, params);
      },
      deleteChatPhoto: () => {
        const { chatId } = mustGetMsg();
        return this.deleteChatPhoto(chatId);
      },
      banChatMember: (memberId, params) => {
        const { chatId } = mustGetMsg();
        return this.banChatMember(chatId, memberId, params);
      },
      unbanChatMember: (memberId) => {
        const { chatId } = mustGetMsg();
        return this.unbanChatMember(chatId, memberId);
      },
      kickChatMember: (memberId) => {
        const { chatId } = mustGetMsg();
        return this.kickChatMember(chatId, memberId);
      },
      setChatMemberRights: (memberId, params) => {
        const { chatId } = mustGetMsg();
        return this.setChatMemberRights(chatId, memberId, params);
      },
      deleteChatMemberMessages: (userId) => {
        const { chatId } = mustGetMsg();
        return this.deleteChatMemberMessages(chatId, userId);
      },
      searchMessages: (query, params) => {
        const { chatId } = mustGetMsg();
        return this.searchMessages(chatId, query, params);
      },
      setBoostsRequiredToCircumventRestrictions: (boosts) => {
        const { chatId } = mustGetMsg();
        return this.setBoostsRequiredToCircumventRestrictions(chatId, boosts);
      },
      createInviteLink: (params) => {
        const { chatId } = mustGetMsg();
        return this.createInviteLink(chatId, params);
      },
      getCreatedInviteLinks: (params) => {
        const { chatId } = mustGetMsg();
        return this.getCreatedInviteLinks(chatId, params);
      },
      leave: () => {
        const { chatId } = mustGetMsg();
        return this.leaveChat(chatId);
      },
      block: () => {
        return this.blockUser(mustGetUserId());
      },
      unblock: () => {
        return this.unblockUser(mustGetUserId());
      },
      getChatMember: (userId) => {
        const { chatId } = mustGetMsg();
        return this.getChatMember(chatId, userId);
      },
      setChatStickerSet: (setName) => {
        const { chatId } = mustGetMsg();
        return this.setChatStickerSet(chatId, setName);
      },
      deleteChatStickerSet: () => {
        const { chatId } = mustGetMsg();
        return this.deleteChatStickerSet(chatId);
      },
      getBusinessConnection: () => {
        const { businessConnectionId } = mustGetMsg();
        if (!businessConnectionId) {
          unreachable();
        }
        return this.getBusinessConnection(businessConnectionId);
      },
    };

    return cleanObject(context as C);
  };

  async handleUpdate(update: Update) {
    await this.middleware()(await this.#constructContext(update), resolve);
  }

  #updateQueue = new Queue();
  #queueUpdate(update: Update) {
    this.#updateQueue.add(() => this.handleUpdate(update));
  }

  #running = false;
  async start() {
    this.init();
    this.#running = true;
    const retryIn = 5;
    while (this.#running) {
      try {
        const updates = await this.#request(
          "getUpdates" as unknown as AllowedMethod,
          [],
        ) as unknown as Update[];
        for (const update of updates) {
          this.#queueUpdate(update);
        }
      } catch (err) {
        console.trace(
          `getUpdates request failed, retrying in ${retryIn} seconds. Reason:`,
          err,
        );
        await new Promise((r) => setTimeout(r, retryIn * 1_000));
      }
    }
  }

  stop() {
    return Promise.resolve().then(() => {
      this.#running = false;
    });
  }

  async #request<M extends AllowedMethod>(
    method: M,
    args: unknown[],
  ): Promise<Awaited<ReturnType<Client_[M]>>> {
    let useMultipart = false;
    let body: BodyInit;
    if (args[1] instanceof Uint8Array) {
      useMultipart = true;
      body = new FormData();
      for (const arg of args) {
        if (arg instanceof Uint8Array) {
          body.append("_", new Blob([arg]));
        } else {
          body.append("_", JSON.stringify(arg));
        }
      }
    } else {
      body = JSON.stringify(args);
    }
    const url = new URL(method, this.#endpoint);
    const response = await fetch(url, {
      method: "POST",
      headers: useMultipart
        ? undefined
        : { "content-type": "application/json" },
      body,
    });
    const result = await response.json();
    if (response.status == 200) {
      return result;
    } else {
      switch (response.headers.get("x-error-type")) {
        case "input":
          throw new InputError(result);
        case "rpc":
          throw new TelegramError(response.status, result);
        default:
          throw new InternalError(result);
      }
    }
  }

  async setWebhook(url: string) {
    await this.#request("setWebhook" as unknown as AllowedMethod, [url]);
  }

  async deleteWebhook() {
    await this.#request("deleteWebhook" as unknown as AllowedMethod, []);
  }

  invoke(function_: unknown) {
    return this.#request("invoke" as unknown as AllowedMethod, [function_]);
  }

  //
  // ========================= ACCOUNT ========================= //
  //

  getMe(): Promise<User> {
    return this.#request("getMe", []);
  }

  async showUsername(...args: Parameters<Client_["showUsername"]>) {
    await this.#request("showUsername", args);
  }

  async hideUsername(...args: Parameters<Client_["hideUsername"]>) {
    await this.#request("hideUsername", args);
  }

  reorderUsernames(
    ...args: Parameters<Client_["reorderUsernames"]>
  ): Promise<boolean> {
    return this.#request("reorderUsernames", args);
  }

  hideUsernames(
    ...args: Parameters<Client_["hideUsernames"]>
  ): Promise<boolean> {
    return this.#request("hideUsernames", args);
  }

  getBusinessConnection(
    ...args: Parameters<Client_["getBusinessConnection"]>
  ): Promise<BusinessConnection> {
    return this.#request("getBusinessConnection", args);
  }

  //
  // ========================= MESSAGES ========================= //
  //

  sendMessage(
    ...args: Parameters<Client_["sendMessage"]>
  ): Promise<MessageText> {
    return this.#request("sendMessage", args);
  }

  sendPhoto(
    ...args: Parameters<Client_["sendPhoto"]>
  ): Promise<MessagePhoto> {
    return this.#request("sendPhoto", args);
  }

  sendDocument(
    ...args: Parameters<Client_["sendDocument"]>
  ): Promise<MessageDocument> {
    return this.#request("sendDocument", args);
  }

  sendSticker(
    ...args: Parameters<Client_["sendSticker"]>
  ): Promise<MessageSticker> {
    return this.#request("sendSticker", args);
  }

  sendVideo(
    ...args: Parameters<Client_["sendVideo"]>
  ): Promise<MessageVideo> {
    return this.#request("sendVideo", args);
  }

  sendAnimation(
    ...args: Parameters<Client_["sendAnimation"]>
  ): Promise<MessageAnimation> {
    return this.#request("sendAnimation", args);
  }

  sendVoice(
    ...args: Parameters<Client_["sendVoice"]>
  ): Promise<MessageVoice> {
    return this.#request("sendVoice", args);
  }

  sendAudio(
    ...args: Parameters<Client_["sendAudio"]>
  ): Promise<MessageAudio> {
    return this.#request("sendAudio", args);
  }

  sendVideoNote(
    ...args: Parameters<Client_["sendVideoNote"]>
  ): Promise<MessageVideoNote> {
    return this.#request("sendVideoNote", args);
  }

  sendLocation(
    ...args: Parameters<Client_["sendLocation"]>
  ): Promise<MessageLocation> {
    return this.#request("sendLocation", args);
  }

  sendContact(
    ...args: Parameters<Client_["sendContact"]>
  ): Promise<MessageContact> {
    return this.#request("sendContact", args);
  }

  sendDice(...args: Parameters<Client_["sendDice"]>): Promise<MessageDice> {
    return this.#request("sendDice", args);
  }

  sendVenue(...args: Parameters<Client_["sendVenue"]>): Promise<MessageVenue> {
    return this.#request("sendVenue", args);
  }

  sendPoll(...args: Parameters<Client_["sendPoll"]>): Promise<MessagePoll> {
    return this.#request("sendPoll", args);
  }

  editMessageText(
    ...args: Parameters<Client_["editMessageText"]>
  ): Promise<MessageText> {
    return this.#request("editMessageText", args);
  }

  async editInlineMessageText(
    ...args: Parameters<Client_["editInlineMessageText"]>
  ): Promise<void> {
    await this.#request("editInlineMessageText", args);
  }

  editMessageReplyMarkup(
    ...args: Parameters<Client_["editMessageReplyMarkup"]>
  ): Promise<Message> {
    return this.#request("editMessageReplyMarkup", args);
  }

  async editInlineMessageReplyMarkup(
    ...args: Parameters<Client_["editInlineMessageReplyMarkup"]>
  ): Promise<void> {
    await this.#request("editInlineMessageReplyMarkup", args);
  }

  editMessageLiveLocation(
    ...args: Parameters<Client_["editMessageLiveLocation"]>
  ): Promise<MessageLocation> {
    return this.#request("editMessageLiveLocation", args);
  }

  async editInlineMessageLiveLocation(
    ...args: Parameters<Client_["editInlineMessageLiveLocation"]>
  ): Promise<void> {
    await this.#request("editInlineMessageLiveLocation", args);
  }

  getMessages(
    ...args: Parameters<Client_["getMessages"]>
  ): Promise<Message[]> {
    return this.#request("getMessages", args);
  }

  getMessage(
    ...args: Parameters<Client_["getMessage"]>
  ): Promise<Message | null> {
    return this.#request("getMessage", args);
  }

  async deleteMessages(
    ...args: Parameters<Client_["deleteMessages"]>
  ): Promise<void> {
    await this.#request("deleteMessages", args);
  }

  async deleteMessage(
    ...args: Parameters<Client_["deleteMessage"]>
  ): Promise<void> {
    await this.#request("deleteMessage", args);
  }

  async deleteChatMemberMessages(
    ...args: Parameters<Client_["deleteChatMemberMessages"]>
  ): Promise<void> {
    await this.#request("deleteChatMemberMessages", args);
  }

  async pinMessage(
    ...args: Parameters<Client_["pinMessage"]>
  ): Promise<void> {
    await this.#request("pinMessage", args);
  }

  async unpinMessages(
    ...args: Parameters<Client_["unpinMessages"]>
  ): Promise<void> {
    await this.#request("unpinMessages", args);
  }

  async unpinMessage(
    ...args: Parameters<Client_["unpinMessage"]>
  ): Promise<void> {
    await this.#request("unpinMessage", args);
  }

  forwardMessages(
    ...args: Parameters<Client_["forwardMessages"]>
  ): Promise<Message[]> {
    return this.#request("forwardMessages", args);
  }

  forwardMessage(
    ...args: Parameters<Client_["forwardMessage"]>
  ): Promise<Message> {
    return this.#request("forwardMessage", args);
  }

  stopPoll(
    ...args: Parameters<Client_["stopPoll"]>
  ): Promise<Poll> {
    return this.#request("stopPoll", args);
  }

  async sendChatAction(
    ...args: Parameters<Client_["sendChatAction"]>
  ): Promise<void> {
    await this.#request("sendChatAction", args);
  }

  searchMessages(
    ...args: Parameters<Client_["searchMessages"]>
  ): Promise<Message[]> {
    return this.#request("searchMessages", args);
  }

  //
  // ========================= FILES ========================= //
  //

  download(): never {
    unimplemented();
  }

  getCustomEmojiStickers(
    ...args: Parameters<Client_["getCustomEmojiStickers"]>
  ): Promise<Sticker[]> {
    return this.#request("getCustomEmojiStickers", args);
  }

  //
  // ========================= CHATS ========================= //
  //

  getChats(): never {
    unimplemented();
  }

  getChat(
    ...args: Parameters<Client_["getChat"]>
  ): Promise<Chat> {
    return this.#request("getChat", args);
  }

  getHistory(
    ...args: Parameters<Client_["getHistory"]>
  ): Promise<Message[]> {
    return this.#request("getHistory", args);
  }

  async setAvailableReactions(
    ...args: Parameters<Client_["setAvailableReactions"]>
  ): Promise<void> {
    await this.#request("setAvailableReactions", args);
  }

  async setChatPhoto(
    ...args: Parameters<Client_["setChatPhoto"]>
  ): Promise<void> {
    await this.#request("setChatPhoto", args);
  }

  async deleteChatPhoto(
    ...args: Parameters<Client_["deleteChatPhoto"]>
  ): Promise<void> {
    await this.#request("deleteChatPhoto", args);
  }

  async banChatMember(
    ...args: Parameters<Client_["banChatMember"]>
  ): Promise<void> {
    await this.#request("banChatMember", args);
  }

  async unbanChatMember(
    ...args: Parameters<Client_["unbanChatMember"]>
  ): Promise<void> {
    await this.#request("unbanChatMember", args);
  }

  async kickChatMember(
    ...args: Parameters<Client_["kickChatMember"]>
  ): Promise<void> {
    await this.#request("kickChatMember", args);
  }

  async setChatMemberRights(
    ...args: Parameters<Client_["setChatMemberRights"]>
  ): Promise<void> {
    await this.#request("setChatMemberRights", args);
  }

  getChatAdministrators(
    ...args: Parameters<Client_["getChatAdministrators"]>
  ): Promise<ChatMember[]> {
    return this.#request("getChatAdministrators", args);
  }

  async enableJoinRequests(
    ...args: Parameters<Client_["enableJoinRequests"]>
  ): Promise<void> {
    await this.#request("enableJoinRequests", args);
  }

  async disableJoinRequests(
    ...args: Parameters<Client_["disableJoinRequests"]>
  ): Promise<void> {
    await this.#request("disableJoinRequests", args);
  }

  getInactiveChats(
    ...args: Parameters<Client_["getInactiveChats"]>
  ): Promise<InactiveChat[]> {
    return this.#request("getInactiveChats", args);
  }

  getCreatedInviteLinks(
    ...args: Parameters<Client_["getCreatedInviteLinks"]>
  ): Promise<InviteLink[]> {
    return this.#request("getCreatedInviteLinks", args);
  }

  async joinChat(
    ...args: Parameters<Client_["joinChat"]>
  ): Promise<void> {
    await this.#request("joinChat", args);
  }

  async leaveChat(
    ...args: Parameters<Client_["leaveChat"]>
  ): Promise<void> {
    await this.#request("leaveChat", args);
  }

  getChatMember(
    ...args: Parameters<Client_["getChatMember"]>
  ): Promise<ChatMember> {
    return this.#request("getChatMember", args);
  }

  async setChatStickerSet(
    ...args: Parameters<Client_["setChatStickerSet"]>
  ): Promise<void> {
    await this.#request("setChatStickerSet", args);
  }

  async deleteChatStickerSet(
    ...args: Parameters<Client_["deleteChatStickerSet"]>
  ): Promise<void> {
    await this.#request("deleteChatStickerSet", args);
  }

  async setBoostsRequiredToCircumventRestrictions(
    ...args: Parameters<Client_["setBoostsRequiredToCircumventRestrictions"]>
  ): Promise<void> {
    await this.#request("setBoostsRequiredToCircumventRestrictions", args);
  }

  createInviteLink(
    ...args: Parameters<Client_["createInviteLink"]>
  ): Promise<InviteLink> {
    return this.#request("createInviteLink", args);
  }

  //
  // ========================= CALLBACK QUERIES ========================= //
  //

  async answerCallbackQuery(
    ...args: Parameters<Client_["answerCallbackQuery"]>
  ): Promise<void> {
    await this.#request("answerCallbackQuery", args);
  }

  //
  // ========================= INLINE QUERIES ========================= //
  //

  async answerInlineQuery(
    ...args: Parameters<Client_["answerInlineQuery"]>
  ): Promise<void> {
    await this.#request("answerInlineQuery", args);
  }

  //
  // ========================= BOTS ========================= //
  //

  async setMyDescription(
    ...args: Parameters<Client_["setMyDescription"]>
  ): Promise<void> {
    await this.#request("setMyDescription", args);
  }

  async setMyName(
    ...args: Parameters<Client_["setMyName"]>
  ): Promise<void> {
    await this.#request("setMyName", args);
  }

  async setMyShortDescription(
    ...args: Parameters<Client_["setMyShortDescription"]>
  ): Promise<void> {
    await this.#request("setMyShortDescription", args);
  }

  async setMyCommands(
    ...args: Parameters<Client_["setMyCommands"]>
  ): Promise<void> {
    await this.#request("setMyCommands", args);
  }

  getMyDescription(
    ...args: Parameters<Client_["getMyDescription"]>
  ): Promise<string> {
    return this.#request("getMyDescription", args);
  }

  getMyName(
    ...args: Parameters<Client_["getMyName"]>
  ): Promise<string> {
    return this.#request("getMyName", args);
  }

  getMyShortDescription(
    ...args: Parameters<Client_["getMyShortDescription"]>
  ): Promise<string> {
    return this.#request("getMyShortDescription", args);
  }

  getMyCommands(
    ...args: Parameters<Client_["getMyCommands"]>
  ): Promise<BotCommand[]> {
    return this.#request("getMyCommands", args);
  }

  //
  // ========================= REACTIONS ========================= //
  //

  async setReactions(
    ...args: Parameters<Client_["setReactions"]>
  ): Promise<void> {
    await this.#request("setReactions", args);
  }

  async addReaction(
    ...args: Parameters<Client_["addReaction"]>
  ): Promise<void> {
    await this.#request("addReaction", args);
  }

  async removeReaction(
    ...args: Parameters<Client_["removeReaction"]>
  ): Promise<void> {
    await this.#request("removeReaction", args);
  }

  //
  // ========================= STORIES ========================= //
  //

  createStory(): never {
    unimplemented();
  }

  getStories(
    ...args: Parameters<Client_["getStories"]>
  ): Promise<Story[]> {
    return this.#request("getStories", args);
  }

  getStory(
    ...args: Parameters<Client_["getStory"]>
  ): Promise<Story | null> {
    return this.#request("getStory", args);
  }

  async deleteStories(
    ...args: Parameters<Client_["deleteStories"]>
  ): Promise<void> {
    await this.#request("deleteStories", args);
  }

  async deleteStory(
    ...args: Parameters<Client_["deleteStory"]>
  ): Promise<void> {
    await this.#request("deleteStory", args);
  }

  async addStoriesToHighlights(
    ...args: Parameters<Client_["addStoriesToHighlights"]>
  ): Promise<void> {
    await this.#request("addStoriesToHighlights", args);
  }

  async addStoryToHighlights(
    ...args: Parameters<Client_["addStoryToHighlights"]>
  ): Promise<void> {
    await this.#request("addStoryToHighlights", args);
  }

  async removeStoriesFromHighlights(
    ...args: Parameters<Client_["removeStoriesFromHighlights"]>
  ): Promise<void> {
    await this.#request("removeStoriesFromHighlights", args);
  }

  async removeStoryFromHighlights(
    ...args: Parameters<Client_["removeStoryFromHighlights"]>
  ): Promise<void> {
    await this.#request("removeStoryFromHighlights", args);
  }

  //
  // ========================= MISC ========================= //
  //

  getNetworkStatistics(): never {
    unimplemented();
  }

  async blockUser(
    ...args: Parameters<Client_["blockUser"]>
  ): Promise<void> {
    await this.#request("blockUser", args);
  }

  async unblockUser(
    ...args: Parameters<Client_["unblockUser"]>
  ): Promise<void> {
    await this.#request("unblockUser", args);
  }
}
