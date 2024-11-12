<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from "vue"
import { marked } from "marked"
import { IconChevronDown, IconChevronUp } from "@iconify-prerendered/vue-mdi"

const props = defineProps<{
  question: string
  answer: string
  open?: boolean
}>()

const content = ref<HTMLDivElement>()
const open = ref(false)
const contentMaxHeight = ref(0)

watch(
  open,
  async (value) => {
    if (value) {
      await nextTick()
      contentMaxHeight.value = content.value?.scrollHeight ?? 0
    }
  },
  { immediate: true }
)

onMounted(() => {
  if (props.open !== undefined) open.value = props.open
})

// Check when marked has finished parsing
marked.use({
  hooks: {
    // Should probably fix that mr marked
    preprocess: (html) => html,
    postprocess(html) {
      contentMaxHeight.value = content.value?.scrollHeight ?? 0

      return html
    }
  }
})

// Tweak marked to not turn `` into code blocks
const renderer = new marked.Renderer()
renderer.code = (code) => `<p>${code}</p>`

const renderedContent = computed(() =>
  marked.parse(t(props.answer), { renderer })
)

import { useI18n } from "vue-i18n"
import type { MessageSchema, NumberSchema } from "../locales/schema"
const { t } = useI18n<{ message: MessageSchema; number: NumberSchema }>({
  useScope: "global"
})
</script>

<template>
  <div class="faq-item" :class="{ 'is-open': open }">
    <button class="faq-btn" @click="open = !open">
      <IconChevronUp v-if="open" />
      <IconChevronDown v-else />
      {{ t(props.question) }}
    </button>

    <div
      ref="content"
      class="faq-content"
      :style="{ 'max-height': open ? `${contentMaxHeight + 5}px` : 0 }"
    >
      <div v-html="renderedContent" />
    </div>
  </div>
</template>
