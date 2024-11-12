<script setup lang='ts'>
import { useElementVisibility, watchOnce } from '@vueuse/core'
import { marked } from 'marked'
import { ref } from 'vue'

const props = defineProps<{
  tag: string
  title: string
  text: string
  disableAnimation?: boolean
}>()

const emit = defineEmits<{
  visible: []
}>()

// Trigger only once
const wrapper = ref<HTMLDivElement>()
const isVisible = useElementVisibility(wrapper)
const fired = ref(false)

if (props.disableAnimation)
  fired.value = true

watchOnce(isVisible, () => {
  fired.value = true

  setTimeout(() => {
    emit('visible')
  }, 50)
})

import { useI18n } from 'vue-i18n'
import type { MessageSchema, NumberSchema } from './locales/schema'
const { t, n } = useI18n<{ message: MessageSchema, number: NumberSchema }>({
  useScope: 'global'
})
</script>

<template>
  <div ref="wrapper" class="scene-content" :class="{ visible: fired }">
    <div>
      <strong>{{ t(props.tag) }}</strong>
    </div>
    <div>
      <h2>
        {{ t(props.title) }}
      </h2>
    </div>
    <div>
      <div>
        <div v-html="marked.parse(t(props.text) ?? '')" />
        <slot />
      </div>
    </div>
  </div>
</template>
