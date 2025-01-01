<script setup lang="ts">
import SceneVisibilityChecker from "../common/SceneVisibilityChecker.vue"
import ImagePicker from "../ImagePicker.vue"

import { useI18n } from "vue-i18n"
import type { MessageSchema } from "../../locales/schema"
const { t } = useI18n<MessageSchema>({
  useScope: "global"
})
</script>

<style>
a {
  @include font(700);
  color: var(--color-blue-light) !important;

  &:hover {
    text-decoration: none;
  }
}
</style>

<template>
  <section id="scene-picker" class="section-wrap">
    <div class="container">
      <div>
        <h2>{{ t("TryBluefin.Title") }}</h2>
        <p v-html="t('TryBluefin.Description')" />
      </div>
      <ImagePicker />
    </div>
    <SceneVisibilityChecker name="#scene-picker" />
  </section>
</template>
