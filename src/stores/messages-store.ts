import type { MessageModel } from '../models/message-model'
import { defineStore } from 'pinia'

const STORE_NAME = 'messages'
const MESSAGES_LOCAL_STORAGE_KEY = 'messages'
const MESSAGES_META_KEY = 'message_meta'

const getMessages = () => {
  const meta = localStorage.getItem(MESSAGES_META_KEY)
  const messages = []

  if (meta) {
    const metaObj = JSON.parse(meta)

    for (const id of metaObj.ids) {
      const item = localStorage.getItem(`${MESSAGES_LOCAL_STORAGE_KEY}_${id}`)
      if (item) {
        messages.push(JSON.parse(item))
      }
    }
  }

  return messages
}

export const useMessagesStore = defineStore(STORE_NAME, {
  state: () => ({
    messages: getMessages(),
  }),
  actions: {
    pushMessage(message: MessageModel) {
      this.messages.push(message)

      // Store each message under a separate key
      localStorage.setItem(`${MESSAGES_LOCAL_STORAGE_KEY}_${message.messageId}`, JSON.stringify(message))

      // Update meta information
      const meta = localStorage.getItem(MESSAGES_META_KEY) || JSON.stringify({ ids: [] })
      const metaObj = JSON.parse(meta)
      metaObj.ids.push(message.messageId)
      localStorage.setItem(MESSAGES_META_KEY, JSON.stringify(metaObj))
    },
    updateEmotions(messageId: number, emotions: { name: string, emojiHtml: string }[]) {
      const message = this.messages.find(m => m.messageId === messageId)

      if (message) {
        message.emotions = emotions

        // Update the individual message in local storage
        localStorage.setItem(`${MESSAGES_LOCAL_STORAGE_KEY}_${messageId}`, JSON.stringify(message))
      }
    },
    clearMessages() {
      // Clear messages array
      this.messages.length = 0

      // Remove items from local storage
      const meta = localStorage.getItem(MESSAGES_META_KEY)
      if (meta) {
        const metaObj = JSON.parse(meta)
        for (const id of metaObj.ids) {
          localStorage.removeItem(`${MESSAGES_LOCAL_STORAGE_KEY}_${id}`)
        }
      }

      // Clear the meta key
      localStorage.removeItem(MESSAGES_META_KEY)
    },
  },
})
