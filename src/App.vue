<script setup lang='ts'>
import { onBeforeMount, provide, ref } from 'vue'
import Navigation from './components/Navigation.vue'
import PageLoading from './components/PageLoading.vue'
import ParallaxWrapper from './components/sections/ParallaxWrapper.vue'
import SectionMission from './components/sections/SectionMission.vue'
import SectionQuestions from './components/sections/SectionQuestions.vue'
import SceneDevelopers from './components/scenes/SceneDevelopers.vue'
import SceneLanding from './components/scenes/SceneLanding.vue'
import SceneUsers from './components/scenes/SceneUsers.vue'
import SectionFooter from './components/sections/SectionFooter.vue'
import SectionVideo from './components/sections/SectionVideo.vue'
import SectionNews from './components/sections/SectionNews.vue'
import SectionPicker from './components/sections/SectionPicker.vue'
import { LangParallaxQuote } from './content'
import { IS_TABLET } from './composables'

const visibleSection = ref<string>('')
provide('visibleSection', visibleSection)

const imageLinks = [
  // Characters
  './characters/angry.webp',
  './characters/bluefin-small.webp',
  './characters/devs.webp',
  './characters/nest.webp',
]

// If the initial size is not tablet, load these too
if (!IS_TABLET.value) {
  imageLinks.push(
  // The goldern hour / evening scenes
    './evening/BlueFinSite_1_Sky-min.webp',
    './evening/BlueFinSite_2_Clouds-min.webp',
    './evening/BlueFinSite_2_Sun-min.webp',
    './evening/BlueFinSite_3_Clouds-min.webp',
    './evening/BlueFinSite_4_Mountains-min.webp',
    './evening/BlueFinSite_5_FogA-min.webp',
    './evening/BlueFinSite_6_BackgroundA-min.webp',
    './evening/BlueFinSite_7_FogB-min.webp',
    './evening/BlueFinSite_8_BackgroundB-min.webp',
    './evening/BlueFinSite_9_MidGroundA-min.webp',
    './evening/BlueFinSite_10_MidgroundB-min.webp',
    './evening/BlueFinSite_11_MidGroundC-min.webp',
    './evening/BlueFinSite_12_ForeGroundA-min.webp',
    './evening/BlueFinSite_13_ForegroundB-min.webp',
    './evening/BlueFinSite_14_ForegroundC-min.webp',
  )
}
else {
  imageLinks.push('./mobile-parallax.webp')
}

const isLoading = ref(true)
onBeforeMount(() => {
  Promise.all(
    imageLinks.map((link) => {
      // Iterate over all links. Create an HTMLImageElement and assign
      // the provided link to it. This returns a promise, which is only
      // resolved after image is loaded. Once all images are loaded, the
      // loading is set to false and page can be loaded.
      return new Promise((resolve) => {
        const img = new Image()
        img.src = link
        img.onload = resolve
      })
    }),
  )
    .finally(() => {
      // Adding timeout gives us a moment to also render the images
      setTimeout(() => {
        isLoading.value = false
      }, 100)
    })
})
</script>

<template>
  <Transition name="fade">
    <main>
      <PageLoading v-if="isLoading" />
      <div v-show="!isLoading">
        <ParallaxWrapper>
          <SceneLanding />
          <SceneUsers />

          <div class="scene-quote">
            <blockquote>
              <p>
                {{ LangParallaxQuote.text }}
                <cite>
                  <a :href="LangParallaxQuote.url" target="_blank">{{ LangParallaxQuote.author }}</a>
                </cite>
              </p>
            </blockquote>
          </div>

          <SceneDevelopers />
        </ParallaxWrapper>
        <SectionMission />
        <SectionVideo />
        <SectionNews />
        <SectionQuestions />
        <SectionFooter />
        <Navigation />
      </div>
    </main>
  </Transition>
</template>
