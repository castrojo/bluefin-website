<script setup lang='ts'>
import SceneVisibilityChecker from '../common/SceneVisibilityChecker.vue'
</script>

<template>
  <section id="scene-picker" class="section-wrap">
    <div class="container">
      <div>
        <h2>Try Bluefin (Beta)</h2>
        <p>Use the form below to get the correct ISO download link for your hardware and use case.</p>
      </div>
      <iframe id="image-picker" src="/image-picker.html" loading="lazy"></iframe>
    </div>
    <SceneVisibilityChecker name="#scene-picker" />
  </section>
</template>
