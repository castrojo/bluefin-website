<script setup lang='ts'>
import { marked } from 'marked'
import { LangAppendixText, LangAppendixYTVideo } from '../../content'
</script>

<template>
  <section id="scene-video" class="section-wrap">
    <div class="container moderate">
      <div class="video-wrapper">
        <div v-html="LangAppendixYTVideo" />
      </div>
    </div>

    <div class="container small">
      <div class="content" v-html="marked.parse(LangAppendixText)" />
    </div>
  </section>
</template>
