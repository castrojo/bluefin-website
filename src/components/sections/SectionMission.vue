<script setup lang='ts'>
import SceneContent from '../common/SceneContent.vue'
import SceneVisibilityChecker from '../common/SceneVisibilityChecker.vue'

const content = `
Bluefin is not just software. She is a new breed of animal, adapted to survive the rigors of an ecosystem dominated by giants while protecting her family.

We believe that the desktop needs to change. That technology starts with your local computer, the device that touches your hands -- and that has to be as important as the rest of it. 

By bringing cloud-native patterns to the desktop we hope to provide an open source alternative to Chromebooks while also catering to the next-generation of open source contributor. 

Bluefin is about sustainability of the software, the hardware, and the people.

> There are two ways of spreading light: to be the candle or the mirror that reflects it. 
> <cite>[Edith Wharton][1]</cite>

[1]: https://en.wikipedia.org/wiki/Edith_Wharton
`
</script>

<template>
  <section id="scene-mission" class="section-wrap">
    <img src="/layer-transition.png" class="layer-transition" alt="">

    <div class="container">
      <SceneContent tag="Our Goal" title="Mission Statement" :text="content" />

      <div class="img-wrap">
        <img src="/characters/nest.png" alt="">
      </div>
      <!-- <div class="scene-arrow">
        <span>She's a great mom</span>
        <img src="/icons/arrow.svg" alt="">
      </div> -->
    </div>
    <SceneVisibilityChecker name="#scene-mission" />
  </section>
</template>
