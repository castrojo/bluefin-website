<script setup lang="ts">
import { LangFaqQuestions } from "../../content"
import FaqItem from "../FaqItem.vue"
import SceneContent from "../common/SceneContent.vue"
import SceneVisibilityChecker from "../common/SceneVisibilityChecker.vue"
</script>

<template>
  <section id="scene-faq" class="section-wrap">
    <div class="container">
      <div>
        <SceneContent
          :tag="'Faq.Tag'"
          :title="'Faq.Title'"
          :text="'Faq.Text'"
          disable-animation
        />
      </div>

      <div class="faq-list">
        <FaqItem
          v-for="question in LangFaqQuestions"
          :key="question.question"
          v-bind="question"
        />
      </div>

      <SceneVisibilityChecker name="#scene-faq" />
    </div>
  </section>
</template>
