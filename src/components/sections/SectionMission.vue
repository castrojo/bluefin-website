<script setup lang="ts">
import { ref } from "vue"
import SceneContent from "../common/SceneContent.vue"
import SceneVisibilityChecker from "../common/SceneVisibilityChecker.vue"
import { LangMissionBluefinImageURL } from "../../content"

const vis = ref(false)

import { useI18n } from "vue-i18n"
import type { MessageSchema, NumberSchema } from "../../locales/schema"
const { t } = useI18n<{ message: MessageSchema; number: NumberSchema }>({
  useScope: "global"
})
</script>

<template>
  <section id="scene-mission" class="section-wrap">
    <img src="/layer-transition.png" class="layer-transition" alt="" />

    <div class="container">
      <SceneContent
        :tag="'Mission.Tag'"
        :title="'Mission.Title'"
        :text="'Mission.Text'"
        @visible="vis = true"
      />

      <Transition name="fade">
        <div v-if="vis" class="img-wrap">
          <img
            :src="LangMissionBluefinImageURL"
            :alt="t('Misson.BluefinChillAlt')"
          />
        </div>
      </Transition>
    </div>
    <SceneVisibilityChecker name="#scene-mission" />
  </section>
</template>
