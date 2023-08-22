<script setup lang='ts'>
import SceneContent from '../common/SceneContent.vue'
import SceneVisibilityChecker from '../common/SceneVisibilityChecker.vue'
</script>

<template>
  <section id="scene-landing" class="section-wrap">
    <div class="container">
      <SceneContent tag="Project" title="Bluefin" text="“Evolution is a process of constant branching and expansion”" />
      <img src="/characters/angry.png" alt="">
    </div>
    <SceneVisibilityChecker name="null" />
  </section>
</template>
