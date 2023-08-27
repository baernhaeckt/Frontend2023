<template>
  <BContainer fluid class="min-vh-100" id="ChatContainer">
    <BRow>
      <div :class="[{ 'loader-backdrop': isLoading }]" class="d-flex flex-column min-vh-100">
        <Loader v-if="isLoading" type="border" variant="primary" label="Loading..." class="z-2" />
        <BCol cols="12" class="d-flex justify-content-center mt-3 flex-shrink-0 border rounded-3 z-0 avatar-image-container">
          <img :src="avatar" class="rounded-3 avatar-image" alt="Dein Avatar" />
        </BCol>
        <BCol cols="12" class="d-flex flex-column justify-content-center mt-3 mb-3 p-3 flex-grow-1 border rounded-3 z-0">
          <div class="avatar-configurator row mx-auto">
            <h1 class="h4">Avatar Konfiguration</h1>
            <BForm>
              <BFormGroup label="Haare" label-class="fs-5" class="mb-3">
                <BFormSelect :options="hairConfigurations" v-model="currentAvatarConfiguration.hairId" @change="updateAvatar"> </BFormSelect>
              </BFormGroup>
              <BFormGroup label="Haarfarbe" label-class="fs-5" class="mb-3">
                <BFormRadioGroup v-model="currentAvatarConfiguration.hairColorId" @change="updateAvatar" buttons class="w-100">
                  <BFormRadio v-for="hairColor in hairColorConfigurations" :value="hairColor.id" name="hairColor" inline>{{ hairColor.name }}</BFormRadio>
                </BFormRadioGroup>
              </BFormGroup>
              <BFormGroup label="Hautton" label-class="fs-5" class="mb-3">
                <BFormRadioGroup v-model="currentAvatarConfiguration.skinColorId" @change="updateAvatar" buttons class="w-100">
                  <BFormRadio v-for="skinColor in skinColorConfigurations" :value="skinColor.id" name="skinColor" inline>{{ skinColor.name }}</BFormRadio>
                </BFormRadioGroup>
              </BFormGroup>
              <BFormGroup label="Gesichtsbehaarung" label-class="fs-5" class="mb-3">
                <BFormRadioGroup v-model="currentAvatarConfiguration.facialHairId" @change="updateAvatar" buttons class="w-100">
                  <BFormRadio v-for="facialHair in facialHairConfigurations" :value="facialHair.id" name="facialHair" inline>{{ facialHair.name }}</BFormRadio>
                </BFormRadioGroup>
              </BFormGroup>
              <BFormGroup label="Kleidung" label-class="fs-5" class="mb-3">
                <BFormRadioGroup v-model="currentAvatarConfiguration.clothingId" @change="updateAvatar" buttons class="w-100" stacked="">
                  <BFormRadio v-for="clothing in clothingConfigurations" :value="clothing.id" name="clothing" inline>{{ clothing.name }}</BFormRadio>
                </BFormRadioGroup>
              </BFormGroup>
              <BButton variant="primary" @click="finishConfiguration" class="w-100 mb-3">Avatar verwenden</BButton>
            </BForm>
          </div>
        </BCol>
      </div>
    </BRow>
  </BContainer>
</template>
<script lang="ts">
import type { SettingsModel } from "../models/settings-model";
import type { AvatarConfigurationOptionsModel } from "../models/avatar-configuration-options-model";
import { AvatarService } from "../services/avatar-service";
import { storeToRefs, type Store } from "pinia";
import { useStore } from "../stores/settings-store";
import { computed, ref, type Ref } from "vue";
import { BFormRow } from "bootstrap-vue-next";

export default {
  name: "AvatarSelection",
  setup() {
    const settingsStore = useStore();
    const { settings } = storeToRefs(settingsStore);

    const avatarService = new AvatarService();

    const avatarConfigurationOptions: Ref<AvatarConfigurationOptionsModel | null> = ref(null);

    return {
      settingsStore,
      avatarService,

      settings,

      avatarInitialized: computed(() => settings.value?.avatar && settings.value?.avatar.length > 0),

      hairConfigurations: computed(() => avatarConfigurationOptions?.value?.hairConfigurations?.map((h) => ({ value: h.id, text: h.name })) ?? []),
      hairColorConfigurations: computed(() => avatarConfigurationOptions?.value?.hairColors ?? []),
      skinColorConfigurations: computed(() => avatarConfigurationOptions?.value?.skinColors ?? []),
      facialHairConfigurations: computed(() => avatarConfigurationOptions?.value?.facialHairConfigurations ?? []),
      clothingConfigurations: computed(() => avatarConfigurationOptions?.value?.clothings ?? []),

      avatar: ref(""),
      storedAvatarConfiguration: settings.value.avatarConfiguration,

      isLoading: ref(true),
      avatarConfigurationOptions,

      currentAvatarConfiguration: ref({
        hairId: "",
        hairColorId: "",
        skinColorId: "",
        facialHairId: "",
        clothingId: "",
      }),
    };
  },
  mounted() {
    this.avatarConfigurationOptions = this.avatarService.configurationOptions;

    if (!this.avatarInitialized) {
      this.initializeAvatar();
    } else {
      this.isLoading = false;
    }

    this.updateLocalAvatarConfiguration(this.settings.avatar, this.storedAvatarConfiguration);
  },
  methods: {
    storeAvatarAndConfiguration(data) {
      this.settingsStore.updateSettings({
        avatar: data.default,
        avatarConfiguration: data.configuration,
      });

      this.updateLocalAvatarConfiguration(data.default, data.configuration);
    },
    updateLocalAvatarConfiguration(avatarImage, configuration) {
      this.avatar = avatarImage;
      this.currentAvatarConfiguration.hairId = configuration.hairId;
      this.currentAvatarConfiguration.hairColorId = configuration.hairColorId;
      this.currentAvatarConfiguration.skinColorId = configuration.skinColorId;
      this.currentAvatarConfiguration.facialHairId = configuration.facialHairId;
      this.currentAvatarConfiguration.clothingId = configuration.clothingId;
    },
    finishConfiguration() {
      this.$emit("setup-completed");
    },
    async initializeAvatar() {
      this.isLoading = true;
      this.enableLoadingGuard();
      const data = await this.avatarService.loadRandomAvatar();
      this.storeAvatarAndConfiguration(data);

      this.isLoading = false;
    },
    async updateAvatar() {
      this.isLoading = true;
      this.enableLoadingGuard();
      const data = await this.avatarService.loadAvatar(
        this.currentAvatarConfiguration.hairId,
        this.currentAvatarConfiguration.hairColorId,
        this.currentAvatarConfiguration.skinColorId,
        this.currentAvatarConfiguration.facialHairId,
        this.currentAvatarConfiguration.clothingId
      );

      this.storeAvatarAndConfiguration(data);

      this.isLoading = false;
    },
    enableLoadingGuard() {
      setTimeout(() => {
        if (this.isLoading) {
          this.isLoading = false;
        }
      }, 6000);
    },
  },
};
</script>
<style lang="scss">
.loader-backdrop {
  &:after {
    content: "";
    background-color: rgba(0, 0, 0, 0.5);
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 1;
    display: flex;
    justify-content: center;
    align-items: center;
  }
}
.avatar-image-container {
  max-height: 30vh;

  background: radial-gradient(farthest-side, rgba(255, 255, 255, 0.5) 50%, rgba(255, 31, 39, 0.05) 100%);

  .avatar-image {
    mix-blend-mode: multiply;
  }
}
.avatar-configurator {
  max-width: 750px;
}
img {
  max-width: 100%;
  max-height: 100%;
}
</style>
