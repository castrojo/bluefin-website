<script setup lang='ts'>
import SceneContent from '../common/SceneContent.vue'
import SceneVisibilityChecker from '../common/SceneVisibilityChecker.vue'

const content = `
Three developer workflows to get you started depending on where you’re coming from: (or bring your own!)

<ul>
          <li>Local Kubernetes tools for development and associated tooling</li>
          <li>Cockpit and goodies for local and remote management</li>
          <li>A collection of well curated monospace fonts</li>
          <li>Cloud Native Terminal powered by Project Exo and Wolfi</li>
        </ul>
`
</script>

<template>
  <section id="scene-developers" class="section-wrap">
    <div class="container">
      <div class="img-wrap">
        <img src="/characters/devs.png" alt="">
      </div>
      <div class="scene-arrow">
        <img src="/icons/arrow.svg" alt="">
        <span>This big boy's <br> name is <b>Tower</b></span>
      </div>

      <div class="content">
        <SceneContent tag="For" title="Developers" :text="content" />

        <div class="brand-grid">
          <div class="brand-item">
            <div>
              <div class="icon-wrap">
                <img src="/brands/vscode.svg" alt="">
                <img src="/brands/vscode.svg" alt="">
              </div>
            </div>
            <p>
              Built-in Ubuntu user space integrated with Visual Studio Code. Run any OCI container as your developer
              environment.
            </p>
          </div>

          <div class="brand-item">
            <div>
              <div class="icon-wrap">
                <img src="/brands/devbox.svg" alt="">
                <img src="/brands/devbox.svg" alt="">
              </div>
              <div class="icon-wrap">
                <img src="/brands/fleek.svg" alt="">
                <img src="/brands/fleek.svg" alt="">
              </div>
            </div>
            <p>Devbox and Fleek - harness the power of nix without the complexity</p>
          </div>

          <div class="brand-item">
            <div>
              <div class="icon-wrap">
                <img src="/brands/devpod.svg" alt="">
                <img src="/brands/devpod.svg" alt="">
              </div>
            </div>
            <p>Next generation developer tools like Devpod</p>
          </div>

          <div class="brand-item">
            <div>
              <div class="icon-wrap">
                <img src="/brands/homebrew.svg" alt="">
                <img src="/brands/homebrew.svg" alt="">
              </div>
            </div>
            <p>Built-in Homebrew</p>
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
