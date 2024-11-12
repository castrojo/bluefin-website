<script setup lang="ts">
import { marked } from "marked"
import { LangPoweredBy, LangSocialLinks } from "../../content"

import { useI18n } from "vue-i18n"
import type { MessageSchema, NumberSchema } from "../../locales/schema"
const { t } = useI18n<{ message: MessageSchema; number: NumberSchema }>({
  useScope: "global"
})
</script>

<template>
  <footer>
    <section id="contributors" class="section-wrap">
      <div class="container">
        <h2>{{ $t("Flock.Title") }}</h2>
        <p style="font-size: 18px">
          {{ $t("Flock.Description") }}
        </p>
        <iframe
          id="contributor-container"
          src="/contributors.html"
          loading="lazy"
        ></iframe>
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
