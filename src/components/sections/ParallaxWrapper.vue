<script setup lang='ts'>
import { refThrottled, useWindowScroll } from '@vueuse/core'
import { computed, ref } from 'vue'
import { IS_TABLET } from '../../composables'

const { y: rawY } = useWindowScroll()
const y = refThrottled(rawY, 10)

const windowHeight = window.innerHeight * 0.75
const nightOverlayOpacity = computed(() => {
  const actualScroll = y.value - (windowHeight / 3)
  return Math.min(1, actualScroll / 650)
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

  <div v-show="showParallax" class="parallax-wrap">
    <span class="night-overlay" :style="{ opacity: nightOverlayOpacity }" />

    <div v-if="IS_TABLET" class="parallax-item">
      <img src="/mobile-parallax.png" alt="" :style="{ transform: `translate3D(0,${y * -0.05}px,0)` }">
    </div>
    <template v-else>
      <div class="parallax-item">
        <!-- Evening -->
        <img src="/evening/BlueFinSite_1_Sky-min.png" alt="">
      </div>

      <div class="parallax-item">
        <!-- Evening -->
        <img src="/evening/BlueFinSite_2_Clouds-min.png" alt="">
      </div>

      <div class="parallax-item" :style="{ transform: `translate3D(0,${y * 0.05}px,0)` }">
        <!-- Evening -->
        <img src="/evening/BlueFinSite_2_Sun-min.png" alt="">
      </div>

      <div class="parallax-item">
        <!-- Evening -->
        <img src="/evening/BlueFinSite_3_Clouds-min.png" alt="">
      </div>

      <div class="parallax-item">
        <!-- Evening -->
        <img src="/evening/BlueFinSite_4_Mountains-min.png" alt="">
      </div>

      <div class="parallax-item">
        <!-- Evening -->
        <img src="/evening/BlueFinSite_5_FogA-min.png" alt="">
      </div>
      <div class="parallax-item">
        <!-- Evening -->
        <img src="/evening/BlueFinSite_6_BackgroundA-min.png" alt="">
      </div>
      <div class="parallax-item">
        <!-- Evening -->
        <img src="/evening/BlueFinSite_7_FogB-min.png" alt="">
      </div>
      <div class="parallax-item" :style="{ transform: `translate3D(0,${y * -0.01}px,0)` }">
        <!-- Evening -->
        <img src="/evening/BlueFinSite_8_BackgroundB-min.png" alt="">
      </div>
      <div class="parallax-item" :style="{ transform: `translate3D(0,${y * -0.03}px,0)` }">
        <!-- Evening -->
        <img src="/evening/BlueFinSite_9_MidGroundA-min.png" alt="">
      </div>
      <div class="parallax-item" :style="{ transform: `translate3D(0,${y * -0.05}px,0)` }">
        <!-- Evening -->
        <img src="/evening/BlueFinSite_10_MidgroundB-min.png" alt="">
      </div>
      <div class="parallax-item" :style="{ transform: `translate3D(0,${y * -0.07}px,0)` }">
        <!-- Eveninght -->
        <img src="/evening/BlueFinSite_11_MidGroundC-min.png" alt="">
      </div>
      <div class="parallax-item" :style="{ transform: `translate3D(0,${y * -0.09}px,0)` }">
        <!-- Evening -->
        <img src="/evening/BlueFinSite_12_ForeGroundA-min.png" alt="">
      </div>
      <div class="parallax-item" :style="{ transform: `translate3D(0,${y * -0.11}px,0)` }">
        <!-- Evening -->
        <img src="/evening/BlueFinSite_13_ForegroundB-min.png" alt="">
      </div>
      <div class="parallax-item" :style="{ transform: `translate3D(0,${y * -0.13}px,0)` }">
        <!-- Evening -->
        <img src="/evening/BlueFinSite_14_ForegroundC-min.png" alt="">
      </div>
    </template>
  </div>
</template>
