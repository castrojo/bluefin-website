<script setup lang='ts'>
import { useWindowScroll } from '@vueuse/core'
import { computed } from 'vue'

// import { useWindowScroll } from '@vueuse/core'

const { y } = useWindowScroll()

// function offset(index: number) {
//   return {
//     top: `${50 * index}px`,
//     transform: `translateY(${y.value * -(0.05 * index)}px)`,
//   }
// }

const windowHeight = window.innerHeight * 0.75

const nightOverlayOpacity = computed(() => {
  if (y.value < windowHeight)
    return 0

  const actualScroll = y.value - windowHeight

  return Math.min(1, actualScroll / 500)
})
</script>

<!-- eslint-disable vue/first-attribute-linebreak -->
<!-- eslint-disable vue/html-closing-bracket-newline -->
<template>
  <div class="scene-components">
    <slot />
  </div>

  <div class="parallax-wrap">
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
      <img :style="{}" src="/evening/BlueFinSite_2_Clouds-min.png" alt="">

      <!-- Night -->
      <!-- <img src="/night/BlueFinSite_2_Clouds-min.png" alt=""> -->
    </div>
    <div class="parallax-item">
      <!-- Evening -->
      <img :style="{}" src="/evening/BlueFinSite_2_Sun-min.png" alt="">

      <!-- Night -->
      <!-- <img src="/night/BlueFinSite_2_Moon-min.png" alt=""> -->
    </div>
    <div class="parallax-item">
      <!-- Evening -->
      <img :style="{}" src="/evening/BlueFinSite_3_Clouds-min.png" alt="">

      <!-- Night -->
      <!-- <img src="/night/BlueFinSite_3_Clouds-min.png" alt=""> -->
      <!-- <img src="/night/BlueFinSite_3_SunMoon-min.png" alt=""> -->
    </div>
    <div class="parallax-item">
      <!-- Evening -->
      <img :style="{}" src="/evening/BlueFinSite_4_Mountains-min.png" alt="">

      <!-- Night -->
      <!-- <img :style="{}" src="/night/BlueFinSite_4_Mountains-min.png" alt=""> -->
    </div>
    <div class="parallax-item">
      <!-- Evening -->
      <img :style="{}" src="/evening/BlueFinSite_5_FogA-min.png" alt="">

      <!-- Night -->
      <!-- <img :style="{}" src="/night/BlueFinSite_5_FogB-min.png" alt=""> -->
    </div>
    <div class="parallax-item">
      <!-- Evening -->
      <img :style="{ top: '85px' }" src="/evening/BlueFinSite_6_BackgroundA-min.png" alt="">

      <!-- Night -->
      <!-- <img :style="{ top: '85px' }" src="/night/BlueFinSite_6_BackgroundA-min.png" alt=""> -->
    </div>
    <div class="parallax-item">
      <!-- Evening -->
      <img :style="{ top: '100px' }" src="/evening/BlueFinSite_7_FogB-min.png" alt="">

      <!-- Night -->
      <!-- <img :style="{ top: '100px' }" src="/night/BlueFinSite_7_FogB-min.png" alt=""> -->
    </div>
    <div class="parallax-item">
      <!-- Evening -->
      <img :style="{ top: '125px;' }" src="/evening/BlueFinSite_8_BackgroundB-min.png" alt="">

      <!-- Night -->
      <!-- <img :style="{ top: '125px;' }" src="/night/BlueFinSite_8_BackgroundB-min.png" alt=""> -->
    </div>
    <div class="parallax-item">
      <!-- Evening -->
      <img :style="{ top: '150px;' }" src="/evening/BlueFinSite_9_MidGroundA-min.png" alt="">

      <!-- Night -->
      <!-- <img :style="{ top: '150px;' }" src="/night/BlueFinSite_9_MidGroundA-min.png" alt=""> -->
    </div>
    <div class="parallax-item">
      <!-- Evening -->
      <img :style="{ top: '175px;' }" src="/evening/BlueFinSite_10_MidgroundB-min.png" alt="">

      <!-- Night -->
      <!-- <img :style="{ top: '175px;' }" src="/night/BlueFinSite_10_MidgroundB-min.png" alt=""> -->
    </div>
    <div class="parallax-item">
      <!-- Eveninght -->
      <img :style="{ top: '200px;' }" src="/evening/BlueFinSite_11_MidGroundC-min.png" alt="">

      <!-- Night -->
      <!-- <img :style="{ top: '200px;' }" src="/night/BlueFinSite_11_MidGroundC-min.png" alt=""> -->
    </div>
    <div class="parallax-item">
      <!-- Evening -->
      <img :style="{ top: '220px;' }" src="/evening/BlueFinSite_12_ForeGroundA-min.png" alt="">

      <!-- Night -->
      <!-- <img :style="{ top: '220px;' }" src="/night/BlueFinSite_12_ForeGroundA-min.png" alt=""> -->
    </div>
    <div class="parallax-item">
      <!-- Evening -->
      <img :style="{ top: '240px;' }" src="/evening/BlueFinSite_13_ForegroundB-min.png" alt="">

      <!-- Night -->
      <!-- <img :style="{ top: '240px;' }" src="/night/BlueFinSite_13_ForegroundB-min.png" alt=""> -->
    </div>
    <div class="parallax-item">
      <!-- Evening -->
      <img :style="{ top: '260px;' }" src="/evening/BlueFinSite_14_ForegroundC-min.png" alt="">

      <!-- Night -->
      <!-- <img :style="{ top: '260px;' }" src="/night/BlueFinSite_14_ForegroundC-min.png" alt=""> -->
    </div>
  </div>
</template>
