<script setup lang="ts">
import type { MessageSchema } from '../../locales/schema'
import { marked } from 'marked'
import { useI18n } from 'vue-i18n'

import SceneVisibilityChecker from '../common/SceneVisibilityChecker.vue'
import ImageChooser from '../ImageChooser.vue'

const { t } = useI18n<MessageSchema>({
  useScope: 'global'
})
</script>

<template>
  <section id="scene-picker" class="section-wrap">
    <div class="container">
      <div class="picker-header">
        <div class="picker-tag">
          <strong>{{ t("TryBluefin.Tag") }}</strong>
        </div>
        <h2>{{ t("TryBluefin.Title") }}</h2>
      </div>

      <div class="picker-card">
        <div class="card-content">
          <p v-html="marked.parse(t('TryBluefin.Description.Choice'))" />
          <p v-html="marked.parse(t('TryBluefin.Description.Updates'))" />
        </div>
      </div>

      <ImageChooser />
    </div>
    <SceneVisibilityChecker name="#scene-picker" />
  </section>
</template>

<style scoped lang="scss">
@use '../../style/setup/fonts';

.picker-card {
  padding: 40px;
  background: rgba(255, 255, 255, 0.02);
  border-radius: 8px;
  border: 1px solid var(--color-border);
  margin-bottom: 40px;

  .card-content {
    p {
      font-size: 1.6rem;
      line-height: 1.6em;
      color: var(--color-text-light);
      margin: 0;
    }
  }
}

p :deep(a) {
  @include fonts.font(700);
  color: var(--color-blue-light);

  &:hover {
    text-decoration: none;
  }
}
</style>
