<script setup lang="ts">
import type { MessageSchema } from '../../locales/schema'
import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import Holidaysaurus from '../../assets/img/Holidaysaurus.webp'
import { LangLandingBluefinImageURLs } from '../../content'
import { i18n } from '../../locales/schema'
import SceneVisibilityChecker from '../common/SceneVisibilityChecker.vue'

function scrollToUsers() {
  document.querySelector('#scene-users')?.scrollIntoView({ behavior: 'smooth' })
}

function scrollToPicker() {
  document
    .querySelector('#scene-picker')
    ?.scrollIntoView({ behavior: 'smooth' })
}

function getRandomBluefinImage() {
  return LangLandingBluefinImageURLs[
    Math.floor(Math.random() * LangLandingBluefinImageURLs.length)
  ]
}

const isLoaded = ref(false)

const currentMonth = new Date().getMonth()
const isHolidaySeason = currentMonth === 11
const isPrideMonth = currentMonth === 5
const imageToDisplay = isHolidaySeason
  ? Holidaysaurus
  : isPrideMonth
    ? `${import.meta.env.BASE_URL}characters/header/pride.webp`
    : getRandomBluefinImage()

onMounted(() => {
  setTimeout(() => {
    isLoaded.value = true
  }, 150)
})

const lang = ref(i18n.global.locale)
function redirectToLang(lang: string) {
  // We could utilize zod here to actually assess if the params exist (https://zod.dev/)
  const urlParams = new URLSearchParams(window.location.search)

  urlParams.set('lang', lang)

  // We should also utilize UFO here (https://github.com/unjs/ufo)
  window.location.search = urlParams.toString()
}
const { t } = useI18n<MessageSchema>({
  useScope: 'global'
})
</script>

<template>
  <section id="scene-landing" class="section-wrap">
    <div class="container moderate">
      <div class="title" :class="{ 'is-loaded': isLoaded }">
        <div class="text">
          <img
            style="width: 100%; max-width: 437px; height: auto"
            width="105"
            height="43"
            src="/brands/bluefin-wordmark-light.svg"
            fetchpriority="high"
            alt="Bluefin"
          >
          <p>{{ t("Landing.Title") }}</p>

          <div class="btn-wrap">
            <button class="btn filled text-nowrap" @click="scrollToUsers">
              {{ t("Landing.DiscoverButton") }}
            </button>

            <a class="btn black filled text-nowrap" @click="scrollToPicker">
              {{ t("Landing.TryOutButton") }}
            </a>

            <select
              v-model="lang"
              class="btn black filled text-nowrap"
              @change="redirectToLang(lang)"
            >
              <option
                v-for="key in Object.keys(i18n.global.messages)"
                :key="key"
                :value="key"
              >
                {{ key }}
              </option>
            </select>
          </div>
        </div>
        <img
          class="sm:h-full sm:w-full object-contain my-3 w-1/2 h-1/2"
          :src="imageToDisplay"
          alt="Bluefin"
        >
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
