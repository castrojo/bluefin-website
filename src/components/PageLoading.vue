<script setup lang='ts'>
import { onUnmounted, ref } from 'vue'

const dots = ref('.')
const interval = setInterval(() => {
  if (dots.value === '.....') {
    dots.value = '.'
    return
  }

  dots.value += '.'
}, 500)

onUnmounted(() => {
  clearInterval(interval)
})
</script>

<template>
  <div class="page-loading">
    <span class="loader" />
    <span>{{ dots }}</span>
  </div>
</template>
