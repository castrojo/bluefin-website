<script setup lang="ts">
import { marked } from "marked"
import { LangPoweredBy, LangSocialLinks } from "../../content"

import type { MessageSchema } from "../../locales/schema"
import { useI18n } from "vue-i18n"
const { t } = useI18n<MessageSchema>({
  useScope: "global"
})

// @ts-ignore
import IframeResizer from "@iframe-resizer/vue/sfc"
</script>

<template>
  <footer>
    <section id="contributors" class="section-wrap">
      <div class="container">
        <h2>{{ $t("Flock.Title") }}</h2>
        <p style="font-size: 18px">
          {{ $t("Flock.Description") }}
        </p>
        <IframeResizer
          license="GPLv3"
          id="contributor-container"
          src="/contributors.html"
          loading="lazy"
        ></IframeResizer>
      </div>
    </section>
    <div class="container">
      <div>
        <strong class="footer-title">{{ $t("Footer.Title") }}</strong>

        <div class="logo-list">
          <template v-for="brand in LangPoweredBy" :key="brand.imageUrl">
            <a v-if="brand.projectUrl" :href="brand.projectUrl" target="_blank">
              <img
                :src="brand.imageUrl"
                :alt="brand.altText"
                :title="brand.altText"
                loading="lazy"
              />
            </a>

            <!-- Does not have project url -->
            <img
              v-else
              :src="brand.imageUrl"
              :alt="brand.altText"
              :title="brand.altText"
              loading="lazy"
            />
          </template>
        </div>
      </div>

      <div>
        <strong class="footer-title">{{ t("Footer.ProjectTitle") }}</strong>
        <p v-html="marked.parse(t('Footer.Project'))" />
        <ul class="footer-links">
          <li v-for="item in LangSocialLinks" :key="item.text">
            <a :href="item.link">
              <component :is="item.component" />
              {{ item.text }}
            </a>
          </li>
        </ul>

        <hr />

        <p v-html="marked.parse(t('Footer.References'))" />

        <div style="flex: 1" />
        <p class="copyright">
          {{ $t("Footer.Copyright", { date: new Date().getUTCFullYear() }) }}
        </p>
      </div>
    </div>
  </footer>
</template>
