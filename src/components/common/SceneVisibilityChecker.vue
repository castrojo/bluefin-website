<script setup lang='ts'>
import type { WritableComputedRef } from 'vue'
import { inject } from 'vue'
import { vElementVisibility } from '@vueuse/components'

const props = defineProps<{ name: string }>()
const visibleSection = inject('visibleSection') as WritableComputedRef<string>

function setVisibility(state: boolean) {
  if (state)
    visibleSection.value = props.name
}
</script>

<template>
  <div v-element-visibility="setVisibility" class="scene-visibility-checker" />
</template>

<style scoped>
.scene-visibility-checker {
  position: absolute;
  top: 50%;
  transform: translateX(-50%);
  left: 0;
  right: 0;
  height: 1px;
  pointer-events: none;
  z-index: -1;
  opacity: 0;
}
</style>
