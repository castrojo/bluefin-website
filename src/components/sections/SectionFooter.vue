<script setup lang='ts'>
import { marked } from 'marked'
import { LangFooterProject, LangFooterProjectTitle, LangFooterReferences, LangSocialLinks } from '../../content'
</script>

<template>
  <footer>
    <div class="container">
      <div>
        <strong class="footer-title">Powered By</strong>

        <div class="logo-list">
          <img src="/brands/fedora.png" alt="Fedora logo" title="Fedora">
          <img src="/brands/devpod.svg" alt="Devpod logo" title="Devpod">
          <img src="/brands/devbox.svg" alt="Devbox logo" title="Devbox">
          <img src="/brands/podman-logo-dark.png" alt="Podman logo" title="Podman"
            style="height:68px;transform:translateY(-6px)">
          <img src="/brands/ubuntu.svg" alt="Ubuntu logo" title="Ubuntu">
          <img src="/brands/dontrememberthisbrand.svg" alt="Logo" title="Logo">
        </div>
      </div>

      <div>
        <strong class="footer-title">{{ LangFooterProjectTitle }}</strong>
        <p v-html="marked.parse(LangFooterProject)" />
        <ul class="footer-links">
          <li v-for="item in LangSocialLinks" :key="item.text">
            <a :href="item.link">
              <component :is="item.component" />
              {{ item.text }}
            </a>
          </li>
        </ul>

        <hr>

        <p v-html="marked.parse(LangFooterReferences)" />

        <div style="flex:1;" />

        <p class="copyright">
          Copyright {{ new Date().getUTCFullYear() }} © Project bluefin
        </p>
      </div>
    </div>
  </footer>
</template>
