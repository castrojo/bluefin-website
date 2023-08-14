<script setup lang='ts'>
import SceneContent from '../common/SceneContent.vue'
import SceneVisibilityChecker from '../common/SceneVisibilityChecker.vue'

const content = `
Three developer workflows to get you started depending on where you’re coming from: (or bring your own!)
`
</script>

<template>
  <section id="scene-developers" class="section-wrap">
    <SceneContent tag="For" title="Developers" :text="content" />
    <SceneVisibilityChecker name="#scene-developers" />
  </section>
</template>
