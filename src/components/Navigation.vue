<script setup lang='ts'>
import type { Component, WritableComputedRef } from 'vue'
import { inject, onMounted, ref, watch } from 'vue'
import { IconCodeBraces, IconControllerClassic, IconFaceManShimmer } from '@iconify-prerendered/vue-mdi'

interface Link {
  name: string
  icon?: Component
}

/**
 * TODO:
 *
 * 1. Track if users are currently above each section and correctly highlight the buttons
 * 2. Smoothly animate hover element
 */

function scrollTo(id: string) {
  const el = document.querySelector(id)

  el?.scrollIntoView({ behavior: 'smooth' })
}

const links: Record<string, Link> = {
  '#scene-users': { name: 'Users', icon: IconFaceManShimmer },
  '#scene-developers': { name: 'Developers', icon: IconCodeBraces },
  '#scene-gamers': { name: 'Gamers', icon: IconControllerClassic },
  '#scene-mission': { name: 'Mission' },
  '#scene-faq': { name: 'FAQ' },
}

const visibleSection = inject('visibleSection') as WritableComputedRef<string>
const offset = ref<number>(0)

onMounted(() => {
  watch(visibleSection, (section) => {
    if (!section)
      return

    const el = document.querySelector(`[data-section="${section}"]`)

    if (el)
      offset.value = Array.from(el.parentElement?.childNodes ?? []).indexOf(el)
  }, { immediate: true })
})
</script>

<template>
  <header id="navigation" class="app-navigation" role="navigation">
    <nav aria-label="Navigation">
      <ul>
        <li v-for="(link, key) in links" :key="key" :data-section="key">
          <a :href="key" :class="{ active: key === visibleSection }" @click.prevent="scrollTo(key)">
            <component :is="link.icon" v-if="link.icon" />
            {{ link.name }}
          </a>
        </li>

        <div :class="{ opacity: visibleSection === '' ? 0 : 1 }" class="bg" :style="{ left: `${(offset - 1) * 20}%` }" />
      </ul>
    </nav>
  </header>
</template>
