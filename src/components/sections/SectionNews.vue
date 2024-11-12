<script setup lang="ts">
import { useI18n } from "vue-i18n"
import type { MessageSchema, NumberSchema } from "../../locales/schema"
const { t } = useI18n<{ message: MessageSchema; number: NumberSchema }>({
  useScope: "global"
})
</script>

<template>
  <section id="scene-news" class="section-wrap">
    <div class="container moderate">
      <div>
        <h2>{{ t("NewsTitle") }}</h2>
      </div>
      <d-topics-list
        discourse-url="https://universal-blue.discourse.group"
        per-page="5"
        tags="bluefin-news"
        template="complete"
      ></d-topics-list>
    </div>
  </section>
</template>
