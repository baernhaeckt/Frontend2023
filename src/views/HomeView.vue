<template>
  <div class="loader-screen" v-if="isLoading">
    <Loader type="border" variant="primary" label="Loading..." />
  </div>
  <AvatarSelection v-if="avatarSetupCompleted" />
  <Chat v-if="loadChat" />
</template>

<script lang="ts">
import { storeToRefs } from "pinia";
import { useStore } from "../stores/settings-store";
import { computed, ref } from "vue";
import type { SettingsModel } from "@/models/settings-model";

export default {
  name: "HomeView",
  setup() {
    const settingsStore = useStore();
    const { settings } = storeToRefs(settingsStore);

    return {
      settingsStore,

      avatar: settings.value.avatar,
      isLoading: ref(false),
      avatarInitialized: computed(
        () => settings.value.avatar && settings.value.avatar.length > 0
      ),
      avatarSetupCompleted: ref(true),
      conversationId: settings.value.conversationId,
      loadChat: ref(true),
    };
  },
  async mounted() {
    if (!this.avatarInitialized) {
      await this.initializeAvatar();
    }
  },
  methods: {
    async initializeAvatar() {
      console.log(import.meta.env.VITE_MLSERVICES_BASEURL);
      const response = await fetch(
        `${import.meta.env.VITE_MLSERVICES_BASEURL}/api/v1/avatar/`
      );

      const data = await response.json();

      this.settingsStore.updateSettings({
        avatar: data.default,
      });
    },
  },
};
</script>

<style lang="scss"></style>
