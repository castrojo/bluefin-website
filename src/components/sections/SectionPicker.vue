<script setup lang="ts">
import SceneVisibilityChecker from "../common/SceneVisibilityChecker.vue"
import ImagePicker from "../ImagePicker.vue"

import { useI18n } from "vue-i18n"
import type { MessageSchema, NumberSchema } from "../../locales/schema"
const { t } = useI18n<{ message: MessageSchema; number: NumberSchema }>({
  useScope: "global"
})
</script>

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
