<script setup lang='ts'>
import SceneContent from '../common/SceneContent.vue'
import SceneVisibilityChecker from '../common/SceneVisibilityChecker.vue'
import { LangMissionTag, LangMissionText, LangMissionTitle } from '../../content'
</script>

<template>
  <section id="scene-mission" class="section-wrap">
    <img src="/layer-transition.png" class="layer-transition" alt="">

    <div class="container">
      <SceneContent :tag="LangMissionTag" :title="LangMissionTitle" :text="LangMissionText" />

      <div class="img-wrap">
        <img src="/characters/nest.png" alt="Bluefin laying down and chilling">
      </div>
    </div>
    <SceneVisibilityChecker name="#scene-mission" />
  </section>
</template>
