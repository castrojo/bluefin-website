<script setup lang='ts'>
import SceneContent from '../common/SceneContent.vue'
import SceneVisibilityChecker from '../common/SceneVisibilityChecker.vue'

const content = `
Our system offers the best of both worlds: the reliability and ease of use of a Chromebook, and the performance and versatility of Ubuntu and Fedora combined

An ecosphere of applications provided by Flathub
`
</script>

<template>
  <section id="scene-users" class="section-wrap">
    <SceneContent tag="For" title="Users" :text="content" />
    <SceneVisibilityChecker name="#scene-users" />
  </section>
</template>
