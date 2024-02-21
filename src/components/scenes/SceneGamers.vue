<script setup lang='ts'>
import SceneContent from '../common/SceneContent.vue'
import SceneVisibilityChecker from '../common/SceneVisibilityChecker.vue'

const content = `
Featuring a world class gaming experience, provided by Flathub. Bluefin inherits the same great stack from Fedora and Flathub, and provides built in Nvidia drivers and improved controller support. No matter which GPU you own, you’ll be set to go.
`
</script>

<template>
  <section id="scene-gamers" class="section-wrap">
    <div class="container small">
      <SceneContent tag="For" title="Gamers" :text="content" />
      <img src="/characters/gamer.webp" alt="">
      <SceneVisibilityChecker name="#scene-gamers" />

      <div class="gradient-1" />
      <div class="gradient-2" />
    </div>
  </section>
</template>
