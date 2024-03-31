<script setup lang='ts'>
import { marked } from 'marked'
import { LangFooterProject, LangFooterProjectTitle, LangFooterReferences, LangPoweredBy, LangSocialLinks } from '../../content'
</script>

<template>
  <footer>
    <section id="contributors" class="section-wrap">
      <div class="container" style="display:block;width:100%;text-align:center;">
        <h2 style="font-size:42px;">Our Team</h2>
        <p style="font-size:18px;">Bluefin is built by a dedicated group of maintainers and contributors.</p>
        <iframe style="width:100%;margin-top:30px;" id="contributor-container" src="/contributors.html"></iframe>
      </div>
    </section>
    <div class="container">
      <div>
        <strong class="footer-title">Powered By</strong>

        <div class="logo-list">
          <template v-for="brand in LangPoweredBy" :key="brand.imageUrl">
            <a v-if="brand.projectUrl" :href="brand.projectUrl" target="_blank">
              <img :src="brand.imageUrl" :alt="brand.altText" :title="brand.altText" loading="lazy">
            </a>

            <!-- Does not have project url -->
            <img v-else :src="brand.imageUrl" :alt="brand.altText" :title="brand.altText" loading="lazy">
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
          Copyright {{ new Date().getUTCFullYear() }} © Project Bluefin and Universal Blue
        </p>
      </div>
    </div>
  </footer>
</template>
