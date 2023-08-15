<script setup lang='ts'>
interface Props {
  left: boolean
  right: boolean
  top: boolean
  bottom: boolean
  deg: number
  text: boolean
}

const props = defineProps<Props>()
</script>

<template>
  <div class="arrow">
    <img src="/icons/arrow.svg" alt=" ">
    <span>{{ props.text }}</span>
  </div>
</template>
