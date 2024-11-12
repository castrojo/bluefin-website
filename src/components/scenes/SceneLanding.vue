<script setup lang="ts">
import { onMounted, ref } from "vue"
import SceneVisibilityChecker from "../common/SceneVisibilityChecker.vue"
import { LangLandingBluefinImageURL } from "../../content"
import { i18n } from '../../locales/schema';

function scrollToUsers() {
  document.querySelector("#scene-users")?.scrollIntoView({ behavior: "smooth" })
}

function scrollToPicker() {
  document
    .querySelector("#scene-picker")
    ?.scrollIntoView({ behavior: "smooth" })
}

const isLoaded = ref(false)

onMounted(() => {
  setTimeout(() => {
    isLoaded.value = true
  }, 150)
})

const lang = ref(i18n.global.locale)
const redirectToLang = (lang: string) => {
  // @ts-ignore
  const urlParams = new URLSearchParams(window.location.search)

  urlParams.set("lang", lang)

  // @ts-ignore
  window.location.search = urlParams
}

import { useI18n } from "vue-i18n"
import type { MessageSchema, NumberSchema } from "../../locales/schema"
import { i18n } from "../../locales/schema"
const { t } = useI18n<{ message: MessageSchema; number: NumberSchema }>({
  useScope: "global"
})
</script>

<template>
  <section id="scene-landing" class="section-wrap">
    <div class="container moderate">
      <div class="title" :class="{ 'is-loaded': isLoaded }">
        <div class="text">
          <img
            style="width: 100%; height: auto"
            width="105"
            height="43"
            src="/brands/bluefin.svg"
            fetchpriority="high"
            alt="Project Bluefin"
          />
          <p>{{ t("Landing.Title") }}</p>

          <div class="btn-wrap">
            <button class="btn filled" @click="scrollToUsers">
              {{ t("Landing.DiscoverButton") }}
            </button>

            <a class="btn black filled" @click="scrollToPicker">
              {{ t("Landing.TryOutButton") }}
            </a>

            <select
              class="btn black filled"
              @change="redirectToLang(lang)"
              v-model="lang"
            >
              <option
                v-for="key in Object.keys(i18n.global.messages)"
                :value="key"
              >
                {{ key }}
              </option>
            </select>
          </div>
        </div>
        <div class="img-wrap">
          <img :src="LangLandingBluefinImageURL" alt="Bluefin" />
        </div>
      </div>
    </div>
    <SceneVisibilityChecker name="null" />

    <!-- <div class="scene-quote">
      <blockquote>
        {{ LangLandingQuote.text }}
      </blockquote>
      <p class="from">
        <a :href="LangLandingQuote.url" target="_blank">{{ LangLandingQuote.author }}</a>
      </p>
    </div> -->
  </section>
</template>
