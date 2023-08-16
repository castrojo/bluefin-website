<script setup lang='ts'>
import SceneContent from '../common/SceneContent.vue'
import SceneVisibilityChecker from '../common/SceneVisibilityChecker.vue'

const content = `
Our system offers the best of both worlds: the reliability and ease of use of a Chromebook, and the performance and versatility of Ubuntu and Fedora combined
`
</script>

<template>
  <section id="scene-users" class="section-wrap">
    <div class="container">
      <div class="img-wrap">
        <img src="/characters/bluefin-small.png" alt="">
      </div>

      <div>
        <SceneContent tag="For" title="Users" :text="content" />

        <ol>
          <li>Zero maintenance</li>
          <!-- <li /> -->
          <li>An ecosphere of applications provided by Flathub</li>
          <!-- <li /> -->
          <li>Included GPU drivers and Flathub gaming experience</li>
        </ol>
      </div>
    </div>
    <SceneVisibilityChecker name="#scene-users" />
  </section>
</template>
