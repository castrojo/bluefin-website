<script setup lang='ts'>
import { LangDevsBoxFour, LangDevsBoxOne, LangDevsBoxThree, LangDevsBoxTwo, LangDevsTag, LangDevsText, LangDevsTitle } from '../../content'
import SceneContent from '../common/SceneContent.vue'
import SceneVisibilityChecker from '../common/SceneVisibilityChecker.vue'
</script>

<template>
  <section id="scene-developers" class="section-wrap">
    <div class="container">
      <div class="img-wrap">
        <img src="/characters/devs.png" alt="Tower character artwork">
      </div>
      <div class="scene-arrow">
        <img src="/icons/arrow.svg" alt="">
        <span>This big boy's <br> name is <b>Tower</b></span>
      </div>

      <div class="content">
        <SceneContent :tag="LangDevsTag" :title="LangDevsTitle" :text="LangDevsText" />

        <div class="brand-grid">
          <div class="brand-item">
            <div>
              <div class="icon-wrap">
                <img src="/brands/vscode.svg" alt="Visual Studio Code logo blur">
                <img src="/brands/vscode.svg" alt="Visual Studio Code logo">
              </div>
            </div>
            <p> {{ LangDevsBoxOne }}</p>
          </div>

          <div class="brand-item">
            <div>
              <div class="icon-wrap">
                <img src="/brands/devbox.svg" alt="Devbox logo blur">
                <img src="/brands/devbox.svg" alt="Devbox logo">
              </div>
              <div class="icon-wrap">
                <img src="/brands/fleek.png" alt="Fleek logo blur">
                <img src="/brands/fleek.png" alt="Fleek logo">
              </div>
            </div>
            <p>{{ LangDevsBoxTwo }}</p>
          </div>

          <div class="brand-item">
            <div>
              <div class="icon-wrap">
                <img src="/brands/devpod.svg" alt="Devpod logo blur">
                <img src="/brands/devpod.svg" alt="Devpod logo">
              </div>
            </div>
            <p>{{ LangDevsBoxThree }}</p>
          </div>

          <div class="brand-item">
            <div>
              <div class="icon-wrap">
                <img src="/brands/homebrew.svg" alt="Homebrew logo blur">
                <img src="/brands/homebrew.svg" alt="Homebrew logo">
              </div>
            </div>
            <p>{{ LangDevsBoxFour }}</p>
          </div>
        </div>

        <!-- <ul>
          <li>Local Kubernetes tools for development and associated tooling</li>
          <li>Cockpit and goodies for local and remote management</li>
          <li>A collection of well curated monospace fonts</li>
          <li>Cloud Native Terminal powered by Project Exo and Wolfi</li>
        </ul> -->
      </div>
    </div>
    <SceneVisibilityChecker name="#scene-developers" />
  </section>
</template>
