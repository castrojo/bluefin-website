<script setup lang='ts'>
import { marked } from 'marked'

const props = defineProps<{
  tag: string
  title: string
  text: string
}>()
</script>

<template>
  <div class="scene-content">
    <strong>{{ props.tag }}</strong>
    <h2>{{ props.title }}</h2>
    <div v-html="marked.parse(props.text ?? '')" />
  </div>
</template>
