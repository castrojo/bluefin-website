<script setup lang='ts'>
import SceneContent from '../common/SceneContent.vue'
import SceneVisibilityChecker from '../common/SceneVisibilityChecker.vue'
import { LangLandingTag, LangLandingText, LangLandingTitle } from '../../content'

function scrollToUsers() {
  document
    .querySelector('#scene-users')
    ?.scrollIntoView({ behavior: 'smooth' })
}
</script>

<template>
  <section id="scene-landing" class="section-wrap">
    <div class="container">
      <SceneContent :tag="LangLandingTag" :title="LangLandingTitle" :text="LangLandingText" />
      <img src="/characters/angry.png" alt="">

      <button class="button" aria-label="Discover Bluefin" @click="scrollToUsers">
        Discover
      </button>
    </div>
    <SceneVisibilityChecker name="null" />
  </section>
</template>
