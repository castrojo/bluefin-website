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

const visibleSection = ref<string>('')
provide('visibleSection', visibleSection)

const imageLinks = [
  // The goldern hour / evening scenes
  './evening/BlueFinSite_1_Sky-min.png',
  './evening/BlueFinSite_2_Clouds-min.png',
  './evening/BlueFinSite_2_Sun-min.png',
  './evening/BlueFinSite_3_Clouds-min.png',
  './evening/BlueFinSite_4_Mountains-min.png',
  './evening/BlueFinSite_5_FogA-min.png',
  './evening/BlueFinSite_6_BackgroundA-min.png',
  './evening/BlueFinSite_7_FogB-min.png',
  './evening/BlueFinSite_8_BackgroundB-min.png',
  './evening/BlueFinSite_9_MidGroundA-min.png',
  './evening/BlueFinSite_10_MidgroundB-min.png',
  './evening/BlueFinSite_11_MidGroundC-min.png',
  './evening/BlueFinSite_12_ForeGroundA-min.png',
  './evening/BlueFinSite_13_ForegroundB-min.png',
  './evening/BlueFinSite_14_ForegroundC-min.png',
]

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
    .finally(() => isLoading.value = false)
})
</script>

<template>
  <main>
    <Transition name="fade">
      <PageLoading v-if="isLoading" />
      <div v-else>
        <ParallaxWrapper>
          <SceneLanding />
          <SceneUsers />
          <SceneDevelopers />
        </ParallaxWrapper>
        <SectionMission />
        <SectionQuestions />
        <SectionFooter />

        <Navigation />
      </div>
    </Transition>
  </main>
</template>
