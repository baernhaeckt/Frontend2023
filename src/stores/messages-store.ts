import type { MessageModel } from '../models/message-model'
import { defineStore } from 'pinia'

const STORE_NAME = 'messages'
const MESSAGES_LOCAL_STORAGE_KEY = 'messages'

const getMessages = () => {
    const messages = localStorage.getItem(MESSAGES_LOCAL_STORAGE_KEY)

    if (messages) {
        var storageSettings = JSON.parse(messages)

        return storageSettings;
    }

    return []
}

export const useMessagesStore = defineStore(STORE_NAME, {
    state: () => ({
        messages: getMessages()
    }),
    actions: {
        pushMessage(message: MessageModel) {
            this.messages.push(message)

            localStorage.setItem(MESSAGES_LOCAL_STORAGE_KEY, JSON.stringify(this.messages))
        },
        clearMessages() {
            this.messages.slice(0, this.messages.length)

            localStorage.removeItem(MESSAGES_LOCAL_STORAGE_KEY)
        }
    }
})