import type { SettingsModel } from '@/models/settings-model'
import { defineStore } from 'pinia'

const STORE_NAME = 'settings'
const SETTINGS_LOCAL_STORAGE_KEY = 'settings'

const getDefaultSettings = () => ({
    avatar: '',
    conversationId: ''
})

const getSettings = () => {
    const settings = localStorage.getItem(SETTINGS_LOCAL_STORAGE_KEY)

    return settings ? JSON.parse(settings) : getDefaultSettings()
}

export const useStore = defineStore(STORE_NAME, {
    state: () => ({
        settings: getSettings()
    }),
    actions: {
        updateSettings(partialSettings: Partial<SettingsModel>) {
            this.settings = { ...this.settings, ...partialSettings }
            
            localStorage.setItem(SETTINGS_LOCAL_STORAGE_KEY, JSON.stringify(this.settings))
        }
    }
})