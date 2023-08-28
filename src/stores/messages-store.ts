import type { MessageModel } from '../models/message-model';
import { defineStore } from 'pinia';
import { openDB } from 'idb';

const STORE_NAME = 'messages';
const MESSAGES_DB_NAME = 'messagesDB';
const MESSAGES_STORE_NAME = 'messagesStore';

// Initialize the database
const initDB = async () => {
  return openDB(MESSAGES_DB_NAME, 1, {
    upgrade(db) {
      db.createObjectStore(MESSAGES_STORE_NAME, { keyPath: 'messageId' });
    },
  });
};

// Get messages from IndexedDB
const getMessages = async () => {
  const db = await initDB();
  const messages = await db.getAll(MESSAGES_STORE_NAME);
  return messages || [];
};

export const useMessagesStore = defineStore(STORE_NAME, {
  state: () => ({
    messages: [] as MessageModel[],  // Start empty, will populate asynchronously
  }),
  actions: {
    async init() {
      this.messages = await getMessages();
    },
    async pushMessage(message: MessageModel) {
      this.messages.push(message);
      const db = await initDB();
      await db.put(MESSAGES_STORE_NAME, message);
    },
    async updateEmotions(messageId: number, emotions: { name: string, emojiHtml: string }[]) {
      const message = this.messages.find(m => m.messageId === messageId);
      if (message) {
        message.emotions = emotions;

        const db = await initDB();
        const dbMessage : MessageModel = await db.get(MESSAGES_STORE_NAME, messageId);
        if (dbMessage) {
          dbMessage.emotions = emotions;
          await db.put(MESSAGES_STORE_NAME, dbMessage);
        }
      }
    },
    async clearMessages() {
      this.messages = [];
      const db = await initDB();
      await db.clear(MESSAGES_STORE_NAME);
    },
    async removeMessageById(messageId: number) {
      const index = this.messages.findIndex(m => m.messageId === messageId);
      if (index !== -1) {
        this.messages.splice(index, 1);
        const db = await initDB();
        await db.delete(MESSAGES_STORE_NAME, messageId);
      }
    }
  },
});
