<script setup lang='ts'>
import { refThrottled, useWindowScroll } from '@vueuse/core'
import { computed, ref } from 'vue'

const { y: rawY } = useWindowScroll()
const y = refThrottled(rawY, 10)

const windowHeight = window.innerHeight * 0.75
const nightOverlayOpacity = computed(() => {
  if (y.value < windowHeight)
    return 0

  const actualScroll = y.value - windowHeight
  return Math.min(1, actualScroll / 1000)
})

// const visibleSection = inject('visibleSection') as WritableComputedRef<string>
const self = ref()
const showParallax = computed(() => {
  return y.value <= self.value?.getBoundingClientRect().height
})
</script>

<!-- eslint-disable vue/first-attribute-linebreak -->
<!-- eslint-disable vue/html-closing-bracket-newline -->
<template>
  <div ref="self" class="scene-components">
    <slot />
  </div>

  <div v-if="showParallax" class="parallax-wrap">
    <!-- <div class="vignette" /> -->
    <div class="night-overlay" :style="{ opacity: nightOverlayOpacity }" />

    <div class="parallax-item">
      <!-- Evening -->
      <img src="/evening/BlueFinSite_1_Sky-min.png" alt="">

      <!-- Night -->
      <!-- <img src="/night/BlueFinSite_1_Sky_Stars-min.png" alt=""> -->
      <!-- <img src="/night/BlueFinSite_1_Sky-min.png" alt=""> -->
    </div>
    <div class="parallax-item">
      <!-- Evening -->
      <img src="/evening/BlueFinSite_2_Clouds-min.png" alt="">

      <!-- Night -->
      <!-- <img src="/night/BlueFinSite_2_Clouds-min.png" alt=""> -->
    </div>
    <div class="parallax-item">
      <!-- Evening -->
      <img src="/evening/BlueFinSite_2_Sun-min.png" alt="">

      <!-- Night -->
      <!-- <img src="/night/BlueFinSite_2_Moon-min.png" alt=""> -->
    </div>
    <div class="parallax-item">
      <!-- Evening -->
      <img src="/evening/BlueFinSite_3_Clouds-min.png" alt="">

      <!-- Night -->
      <!-- <img src="/night/BlueFinSite_3_Clouds-min.png" alt=""> -->
      <!-- <img src="/night/BlueFinSite_3_SunMoon-min.png" alt=""> -->
    </div>
    <div class="parallax-item">
      <!-- Evening -->
      <img src="/evening/BlueFinSite_4_Mountains-min.png" alt="">

      <!-- Night -->
      <!-- <img src="/night/BlueFinSite_4_Mountains-min.png" alt=""> -->
    </div>
    <div class="parallax-item">
      <!-- Evening -->
      <img src="/evening/BlueFinSite_5_FogA-min.png" alt="">

      <!-- Night -->
      <!-- <img src="/night/BlueFinSite_5_FogB-min.png" alt=""> -->
    </div>
    <div class="parallax-item" :style="{ top: '165px' }">
      <!-- Evening -->
      <img src="/evening/BlueFinSite_6_BackgroundA-min.png" alt="">

      <!-- Night -->
      <!-- <img :style="{ top: '85px' }" src="/night/BlueFinSite_6_BackgroundA-min.png" alt=""> -->
    </div>
    <div class="parallax-item" :style="{ top: '200px' }">
      <!-- Evening -->
      <img src="/evening/BlueFinSite_7_FogB-min.png" alt="">

      <!-- Night -->
      <!-- <img :style="{ top: '100px' }" src="/night/BlueFinSite_7_FogB-min.png" alt=""> -->
    </div>
    <div class="parallax-item" :style="{ top: '175px', transform: `translateY(${y * -0.01}px)` }">
      <!-- Evening -->
      <img src="/evening/BlueFinSite_8_BackgroundB-min.png" alt="">

      <!-- Night -->
      <!-- <img :style="{ top: '125px' }" src="/night/BlueFinSite_8_BackgroundB-min.png" alt=""> -->
    </div>
    <div class="parallax-item" :style="{ top: '210px', transform: `translateY(${y * -0.03}px)` }">
      <!-- Evening -->
      <img src="/evening/BlueFinSite_9_MidGroundA-min.png" alt="">

      <!-- Night -->
      <!-- <img :style="{ top: '150px' }" src="/night/BlueFinSite_9_MidGroundA-min.png" alt=""> -->
    </div>
    <div class="parallax-item" :style="{ top: '250px', transform: `translateY(${y * -0.05}px)` }">
      <!-- Evening -->
      <img src="/evening/BlueFinSite_10_MidgroundB-min.png" alt="">

      <!-- Night -->
      <!-- <img :style="{ top: '175px' }" src="/night/BlueFinSite_10_MidgroundB-min.png" alt=""> -->
    </div>
    <div class="parallax-item" :style="{ top: '300px', transform: `translateY(${y * -0.07}px)` }">
      <!-- Eveninght -->
      <img src="/evening/BlueFinSite_11_MidGroundC-min.png" alt="">

      <!-- Night -->
      <!-- <img :style="{ top: '200px' }" src="/night/BlueFinSite_11_MidGroundC-min.png" alt=""> -->
    </div>
    <div class="parallax-item" :style="{ top: '320px', transform: `translateY(${y * -0.09}px)` }">
      <!-- Evening -->
      <img src="/evening/BlueFinSite_12_ForeGroundA-min.png" alt="">

      <!-- Night -->
      <!-- <img :style="{ top: '220px' }" src="/night/BlueFinSite_12_ForeGroundA-min.png" alt=""> -->
    </div>
    <div class="parallax-item" :style="{ top: '340px', transform: `translateY(${y * -0.11}px)` }">
      <!-- Evening -->
      <img src="/evening/BlueFinSite_13_ForegroundB-min.png" alt="">

      <!-- Night -->
      <!-- <img :style="{ top: '240px' }" src="/night/BlueFinSite_13_ForegroundB-min.png" alt=""> -->
    </div>
    <div class="parallax-item" :style="{ top: '360px', transform: `translateY(${y * -0.13}px)` }">
      <!-- Evening -->
      <img src="/evening/BlueFinSite_14_ForegroundC-min.png" alt="">

      <!-- Night -->
      <!-- <img :style="{ top: '260px' }" src="/night/BlueFinSite_14_ForegroundC-min.png" alt=""> -->
    </div>
  </div>
</template>
