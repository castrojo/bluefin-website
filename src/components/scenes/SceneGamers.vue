<script setup lang='ts'>
import SceneContent from '../common/SceneContent.vue'
import SceneVisibilityChecker from '../common/SceneVisibilityChecker.vue'

const content = `
Featuring a world class gaming experience, provided by Flathub. Bluefin inherits the same great stack from Fedora and Flathub, and provides built in Nvidia drivers and improved controller support. No matter which GPU you own, you’ll be set to go.
`
</script>

<template>
  <section id="scene-gamers" class="section-wrap">
    <SceneContent tag="For" title="Gamers" :text="content" />
    <SceneVisibilityChecker name="#scene-gamers" />
  </section>
</template>
