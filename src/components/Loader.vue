<template>
  <b-spinner
    class="helpy-loader"
    :type="type"
    :variant="variant"
    :label="label"
    :label-position="labelPosition"
    :no-animation="noAnimation"
    :small="small"
  ></b-spinner>
</template>

<script lang="ts">
import { defineComponent } from "vue";

export default defineComponent({
  name: "Loader",
  props: {
    type: {
      type: String,
      default: "border",
    },
    variant: {
      type: String,
      default: null,
    },
    label: {
      type: String,
      default: null,
    },
    labelPosition: {
      type: String,
      default: "top",
    },
    noAnimation: {
      type: Boolean,
      default: false,
    },
    small: {
      type: Boolean,
      default: false,
    },
  },
});
</script>

<style lang="scss">
.helpy-loader {
  &.spinner-border {
    border-width: 2px;
    width: 120px;
    height: 120px;

    position: fixed;
    top: calc(50% - 60px);
    left: calc(50% - 60px);

    z-index: 2;
  }
}
</style>
