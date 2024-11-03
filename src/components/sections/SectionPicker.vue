<script setup lang='ts'>
import SceneVisibilityChecker from '../common/SceneVisibilityChecker.vue'
</script>

<template>
  <section id="scene-picker" class="section-wrap">
    <div class="container">
      <div>
        <h2>Try Bluefin</h2>
        <p>Use the form below to get the correct ISO download link for your hardware and use case. The team recommends <a href="https://flathub.org/apps/org.fedoraproject.MediaWriter">Fedora Media Writer</a> to create installation media:</p>
      </div>
      <iframe id="image-picker" src="/image-picker.html" loading="lazy"></iframe>
    </div>
    <SceneVisibilityChecker name="#scene-picker" />
  </section>
</template>
