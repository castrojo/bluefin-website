<script setup lang="ts">
import type { MessageSchema } from '../../locales/schema'
import { marked } from 'marked'
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'

import { getDakotaVersions } from '../../composables'
import ProductVersionCard from '../common/ProductVersionCard.vue'
import SceneVisibilityChecker from '../common/SceneVisibilityChecker.vue'
import ImageChooser from '../ImageChooser.vue'

const { t } = useI18n<MessageSchema>({
  useScope: 'global'
})

const dakotaVersions = ref<Awaited<ReturnType<typeof getDakotaVersions>> | null>(null)

// Labels mirror DakotaVersionChips.vue so every surface names a package the same way.
const PACKAGE_LABELS: Record<string, string> = {
  kernel: 'Kernel',
  gnome: 'GNOME',
  mesa: 'Mesa',
  systemd: 'systemd',
  pipewire: 'PipeWire',
  bootc: 'bootc',
  nvidia: 'NVidia Driver'
}

// Kernel/init first, then graphics, then desktop. Every key here must be
// resolvable from the image SBOM — see scripts/update-dakota-versions.js.
const DAKOTA_KEYS = ['kernel', 'systemd', 'bootc', 'mesa', 'nvidia', 'gnome', 'pipewire']

async function loadVersions() {
  try {
    dakotaVersions.value = await getDakotaVersions()
  }
  catch (error) {
    if (import.meta.env.DEV) {
      console.warn('[SectionPicker] failed to load Dakota versions', error)
    }
  }
}

const dakotaRows = computed(() => {
  const v = dakotaVersions.value
  if (!v?.packages || v.status !== 'verified') {
    return []
  }
  const packages = v.packages
  return DAKOTA_KEYS
    .filter(key => packages[key])
    .map(key => ({ label: PACKAGE_LABELS[key] ?? key, value: packages[key] }))
})

const wolvesDownloads = computed(() => [
  {
    title: t('TryBluefin.Wolves.Cards.Dakota'),
    description: t('TryBluefin.Wolves.Cards.DakotaDescription'),
    href: '/dakota/',
    image: 'characters/dakota.webp',
    versionRows: dakotaRows.value
  },
  {
    title: t('TryBluefin.Wolves.Cards.Utah'),
    description: t('TryBluefin.Wolves.Cards.UtahDescription'),
    href: 'https://devconf.us',
    image: 'characters/utah.webp',
    versionRows: []
  },
  {
    title: t('TryBluefin.Wolves.Cards.Server'),
    description: t('TryBluefin.Wolves.Cards.ServerDescription'),
    href: '/server/',
    image: 'characters/alamosaurus.webp',
    versionRows: []
  }
])

onMounted(loadVersions)
</script>

<template>
  <section id="scene-picker" class="section-wrap">
    <div class="container">
      <div class="picker-header">
        <div class="picker-tag">
          <strong>{{ t("TryBluefin.Tag") }}</strong>
        </div>
        <h2>{{ t("TryBluefin.Title") }}</h2>
      </div>

      <div class="picker-card">
        <div class="card-content">
          <p v-html="marked.parse(t('TryBluefin.Description.Choice'))" />
          <p v-html="marked.parse(t('TryBluefin.Description.Updates'))" />
        </div>
      </div>

      <ImageChooser />

      <section class="wolves-downloads" aria-labelledby="wolves-downloads-title">
        <div class="wolves-download-header">
          <h3 id="wolves-downloads-title">
            {{ t('TryBluefin.Wolves.Title') }}
          </h3>
          <div
            class="wolves-download-description"
            v-html="marked.parse(t('TryBluefin.Wolves.Description'))"
          />
        </div>

        <div class="wolves-download-grid">
          <ProductVersionCard
            v-for="download in wolvesDownloads"
            :key="download.title"
            :title="download.title"
            :description="download.description"
            :image="download.image"
            :href="download.href"
            :version-rows="download.versionRows"
          />
        </div>
      </section>
    </div>
    <SceneVisibilityChecker name="#scene-picker" />
  </section>
</template>

<style scoped lang="scss">
@use '../../style/setup/fonts';

.picker-card {
  padding: 40px;
  background: rgba(255, 255, 255, 0.02);
  border-radius: 8px;
  border: 1px solid var(--color-border);
  margin-bottom: 40px;

  .card-content {
    p {
      font-size: 1.6rem;
      line-height: 1.6em;
      color: var(--color-text-light);
      margin: 0;
    }
  }
}

p :deep(a) {
  @include fonts.font(700);
  color: var(--color-blue-light);

  &:hover {
    text-decoration: none;
  }
}

.wolves-downloads {
  margin-top: 4rem;
}

.wolves-download-header {
  text-align: center;
  margin-bottom: 2rem;

  /* Matches #scene-picker .picker-tag strong — the section's established
     treatment for a labelled sub-block. */
  h3 {
    font-size: 2rem;
    font-weight: 400;
    text-transform: uppercase;
    color: var(--color-text-light);
    margin: 0 0 10px 0;
  }

  .wolves-download-description :deep(p) {
    margin: 0 auto;
    max-width: 70ch;

    & + p {
      margin-top: 1rem;
    }
  }
}

.wolves-download-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.5rem;
}

@media (max-width: 956px) {
  .wolves-download-grid {
    grid-template-columns: 1fr;
  }
}
</style>
