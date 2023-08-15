<script setup lang='ts'>
import SceneContent from '../common/SceneContent.vue'
import SceneVisibilityChecker from '../common/SceneVisibilityChecker.vue'

const content = `
Bluefin is not just software. She is a new breed of animal, adapted to survive the rigors of an ecosystem dominated by giants while protecting her family.

We believe that the desktop needs to change, and creatures like Bluefin will take us there through guidance and mentorship. She acts as our onramp to nurture contributors through their cloud native journey. That technology starts with your local computer, the device that touches your hands -- and that has to be as important as the rest of it.

Bluefin strives to prove it.
`
</script>

<template>
  <section id="scene-mission" class="section-wrap">
    <div class="container">
      <SceneContent tag="Our Goal" title="Mission Statement" :text="content" />

      <div class="img-wrap">
        <img src="/characters/nest.png" alt="">
      </div>
      <div class="scene-arrow">
        <span>She's a great mom</span>
        <img src="/icons/arrow.svg" alt="">
      </div>
    </div>
    <SceneVisibilityChecker name="#scene-mission" />
  </section>
</template>
