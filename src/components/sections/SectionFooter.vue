<script setup lang='ts'>
import { marked } from 'marked'
import { LangFooterProject, LangFooterProjectTitle, LangFooterReferences, LangPoweredBy, LangSocialLinks } from '../../content'
</script>

<template>
  <footer>
    <div class="container">
      <div>
        <strong class="footer-title">Powered By</strong>

        <div class="logo-list">
          <template v-for="brand in LangPoweredBy" :key="brand.imageUrl">
            <a v-if="brand.projectUrl" :href="brand.projectUrl" target="_blank">
              <img :src="brand.imageUrl" :alt="brand.altText" :title="brand.altText">
            </a>

            <!-- Does not have project url -->
            <img v-else :src="brand.imageUrl" :alt="brand.altText" :title="brand.altText">
          </template>
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
          Copyright {{ new Date().getUTCFullYear() }} © Project Bluefin
        </p>
      </div>
    </div>
  </footer>
</template>
