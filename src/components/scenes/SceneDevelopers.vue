<script setup lang='ts'>
import { ref } from 'vue'
import { marked } from 'marked'
import { LangDevsAppendix, LangDevsBoxFour, LangDevsBoxOne, LangDevsBoxThree, LangDevsBoxTwo, LangDevsTag, LangDevsText, LangDevsTitle, LangDevsTowerImageURL } from '../../content'
import SceneContent from '../common/SceneContent.vue'
import SceneVisibilityChecker from '../common/SceneVisibilityChecker.vue'

const vis = ref(false)
</script>

<template>
  <section id="scene-developers" class="section-wrap">
    <div class="container">
      <Transition name="fade">
        <div v-if="vis">
          <div class="img-wrap">
            <img :src="LangDevsTowerImageURL" alt="Tower character artwork">
          </div>
          <div class="scene-arrow">
            <img src="/icons/arrow.svg" alt="">
            <span><b>Tower</b> over your <br>Backlog!</span>
          </div>
        </div>
      </Transition>

      <div class="content">
        <SceneContent :tag="LangDevsTag" :title="LangDevsTitle" :text="LangDevsText" @visible="vis = true">
          <div class="brand-grid">
            <div class="brand-item">
              <div>
                <div class="icon-wrap">
                  <img src="/brands/vscode.svg" alt="Visual Studio Code logo blur" loading="lazy">
                  <img src="/brands/vscode.svg" alt="Visual Studio Code logo" loading="lazy">
                </div>
              </div>
              <p> {{ LangDevsBoxOne }}</p>
            </div>

            <div class="brand-item">
              <div>
                <div class="icon-wrap">
                  <img src="/brands/devbox.svg" alt="Devbox logo blur" loading="lazy">
                  <img src="/brands/devbox.svg" alt="Devbox logo" loading="lazy">
                </div>
              </div>
              <p>{{ LangDevsBoxTwo }}</p>
            </div>

            <div class="brand-item">
              <div>
                <div class="icon-wrap">
                  <img src="/brands/devpod.svg" alt="Devpod logo blur" loading="lazy">
                  <img src="/brands/devpod.svg" alt="Devpod logo" loading="lazy">
                </div>
              </div>
              <p>{{ LangDevsBoxThree }}</p>
            </div>

            <div class="brand-item">
              <div>
                <div class="icon-wrap">
                  <img src="/brands/homebrew.svg" alt="Homebrew logo blur" loading="lazy">
                  <img src="/brands/homebrew.svg" alt="Homebrew logo" loading="lazy">
                </div>
              </div>
              <p>{{ LangDevsBoxFour }}</p>
            </div>
          </div>

          <div v-if="LangDevsAppendix" v-html="marked.parse(LangDevsAppendix)" />
        </SceneContent>
      </div>
    </div>
    <SceneVisibilityChecker name="#scene-developers" />
  </section>
</template>
