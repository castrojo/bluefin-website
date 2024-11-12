<script setup lang="ts">
import { marked } from "marked"
import { useI18n } from "vue-i18n"
import type { MessageSchema, NumberSchema } from "../../locales/schema"
const { t } = useI18n<{ message: MessageSchema; number: NumberSchema }>({
  useScope: "global"
})
</script>

<template>
  <section id="scene-video" class="section-wrap">
    <div class="container moderate">
      <div class="video-wrapper">
        <iframe
          width="560"
          height="315"
          :src="t('Video.URL')"
          srcdoc="<style>*{padding:0;margin:0;overflow:hidden}html,body{height:100%}img,span{position:absolute;width:100%;top:0;bottom:0;margin:auto}span{height:1.5em;text-align:center;font:48px/1.5 sans-serif;color:white;text-shadow:0 0 0.5em black}</style><a href=https://www.youtube.com/embed/3_yyyUMecwo?autoplay=1><img src=https://img.youtube.com/vi/Nz-yyDwTfRM/hqdefault.jpg alt=\'Bluefin Linux introduction\'><span>▶</span></a>"
          frameborder="0"
          allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
          :title="t('Video.Title')"
          allowfullscreen
        ></iframe
        >,
      </div>
    </div>

    <div class="container small">
      <div class="content" v-html="marked.parse(t('Video.AppendixText'))" />
    </div>
  </section>
</template>
