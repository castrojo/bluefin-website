<script setup lang='ts'>
import { onMounted, ref } from 'vue'
import { IconLinkVariant } from '@iconify-prerendered/vue-mdi'
import SceneVisibilityChecker from '../common/SceneVisibilityChecker.vue'
import { LangLandingBluefinImageURL, LangLandingTag, LangLandingText, LangLandingTitle } from '../../content'

function scrollToUsers() {
  document
    .querySelector('#scene-users')
    ?.scrollIntoView({ behavior: 'smooth' })
}

const isLoaded = ref(false)

onMounted(() => {
  setTimeout(() => {
    isLoaded.value = true
  }, 150)
})
</script>

<template>
  <section id="scene-landing" class="section-wrap">
    <div class="container moderate">
      <div class="title" :class="{ 'is-loaded': isLoaded }">
        <div class="text">
          <strong>{{ LangLandingTag }}</strong>
          <h2>{{ LangLandingTitle }}</h2>
          <p>{{ LangLandingText }}</p>

          <div class="btn-wrap">
            <button class="btn filled" @click="scrollToUsers">
              Discover
            </button>

            <a href="https://universal-blue.org/images/bluefin/" target="_blank" class="btn black filled" @click="scrollToUsers">
              Try Out
              <IconLinkVariant />
            </a>
          </div>
        </div>
        <div class="img-wrap">
          <img :src="LangLandingBluefinImageURL" alt="Bluefin">
        </div>
      </div>
    </div>
    <SceneVisibilityChecker name="null" />

    <!-- <div class="scene-quote">
      <blockquote>
        {{ LangLandingQuote.text }}
      </blockquote>
      <p class="from">
        <a :href="LangLandingQuote.url" target="_blank">{{ LangLandingQuote.author }}</a>
      </p>
    </div> -->
  </section>
</template>
