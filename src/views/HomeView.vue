<template>
  <AvatarSelection v-if="!avatarSetupCompleted" @setup-completed="setSetupCompleted" />
  <Chat v-if="loadChat" @edit-avatar="editAvatar" />
</template>

<script lang="ts">
import { storeToRefs } from "pinia";
import { useStore } from "../stores/settings-store";
import { computed, ref } from "vue";

export default {
  name: "HomeView",
  setup() {
    const settingsStore = useStore();
    const { settings } = storeToRefs(settingsStore);

    return {
      settingsStore,

      avatar: settings.value.avatar,
      isLoading: ref(true),
      avatarInitialized: computed(() => settings.value.avatar && settings.value.avatar.length > 0),
      avatarSetupCompleted: ref(false),
      loadChat: ref(false),
    };
  },
  methods: {
    setSetupCompleted() {
      this.avatarSetupCompleted = true;
      this.loadChat = true;
    },
    editAvatar() {
      this.avatarSetupCompleted = false;
      this.loadChat = false;
    },
  },
};
</script>

<style lang="scss"></style>
