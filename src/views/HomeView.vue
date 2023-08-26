<template>
  <AvatarSelection v-if="!avatarSetupCompleted" @setup-completed="setSetupCompleted" />
  <Chat v-if="loadChat" @edit-avatar="editAvatar" />
</template>

<script lang="ts">
import { storeToRefs } from "pinia";
import { useStore } from "../stores/settings-store";
import { ref } from "vue";

export default {
  name: "HomeView",
  setup() {
    const settingsStore = useStore();
    const { settings } = storeToRefs(settingsStore);

    const avatarSetupCompleted = ref(settings.value.avatarSetupCompleted);
    const loadChat = ref(avatarSetupCompleted.value);

    return {
      settingsStore,
      settings,

      avatar: settings.value.avatar,
      avatarSetupCompleted,
      loadChat,
    };
  },
  methods: {
    setSetupCompleted() {
      this.avatarSetupCompleted = true;
      this.loadChat = true;

      this.settingsStore.updateSettings({
        avatarSetupCompleted: true,
      });
    },
    editAvatar() {
      this.avatarSetupCompleted = false;
      this.loadChat = false;

      this.settingsStore.updateSettings({
        avatarSetupCompleted: true,
      });
    },
  },
};
</script>

<style lang="scss"></style>
