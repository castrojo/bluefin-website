<script setup lang="ts">
import type { DakotaVersions } from '../../composables'
import {
  IconCheckCircleOutline,
  IconDownload,
} from '@iconify-prerendered/vue-mdi'
import { computed, onMounted, ref } from 'vue'
import { getDakotaVersions } from '../../composables'
import DakotaVersionChips from './DakotaVersionChips.vue'

interface DownloadEntry {
  label: string
  isoUrl: string
  isoFilename: string
  checksumUrl: string
}

const BASE = 'https://projectbluefin.dev'

const versions = ref<DakotaVersions | null>(null)

const cardImageStyle = computed(() => ({
  backgroundImage: `url(${import.meta.env.BASE_URL}characters/dakota.webp)`,
}))

// ponytail: static fallback keeps downloads working if JSON fetch fails
const FALLBACK_ISOS = [
  { label: 'Download ISO', filename: 'dakota-live-alpha4.iso' },
]

const entries = computed<DownloadEntry[]>(() => {
  const isos = versions.value?.isos ?? FALLBACK_ISOS
  return isos.map(iso => ({
    label: iso.label,
    isoUrl: `${BASE}/${iso.filename}`,
    isoFilename: iso.filename,
    checksumUrl: `${BASE}/${iso.filename}-CHECKSUM`,
  }))
})

const VERSION_LABELS: Record<string, string> = {
  'kernel': 'Kernel',
  'gnome': 'GNOME',
  'mesa': 'Mesa',
  'nvidia': 'NVIDIA',
  'freedesktop-sdk': 'Freedesktop SDK',
  'bootc': 'bootc',
}

const versionRows = computed(() => {
  if (!versions.value || versions.value.status !== 'verified') {
    return []
  }
  return Object.entries(versions.value.packages)
    .filter(([key]) => key in VERSION_LABELS)
    .map(([key, value]) => ({
      label: VERSION_LABELS[key],
      value,
    }))
})

onMounted(async () => {
  try {
    versions.value = await getDakotaVersions()
  }
  catch (e) {
    if (import.meta.env.DEV) {
      console.warn('[DakotaVersionCard] failed to load versions', e)
    }
  }
})
</script>

<template>
  <div class="dakota-version-card">
    <!-- Raptor card -->
    <div class="card-box">
      <div class="alpha-badge">
        <span class="alpha-badge-title">⚠️ Alpha.</span>
        <span class="alpha-badge-sub">Take appropriate precautions.</span>
      </div>
      <div
        class="card-image"
        :style="cardImageStyle"
      >
        <div class="card-overlay">
          <p class="card-description">
            The Final Form. Bluefin Perfected.
          </p>

          <div v-if="versionRows.length" class="version-info">
            <div
              v-for="row in versionRows"
              :key="row.label"
              class="version-row"
            >
              <span class="version-label">{{ row.label }}</span>
              <span class="version-value">{{ row.value }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Downloads (always visible below card) -->
    <div class="download-section">
      <DakotaVersionChips
        class="secondary-chips"
        :keys="['systemd', 'podman', 'pipewire', 'flatpak', 'baseline']"
      />
      <div class="download-entries">
        <div
          v-for="entry in entries"
          :key="entry.label"
          class="download-entry"
        >
          <div class="entry-buttons">
            <a
              class="btn filled entry-dl"
              :href="entry.isoUrl"
            >
              <IconDownload />
              {{ entry.label }}
            </a>
            <a
              class="btn entry-checksum"
              :href="entry.checksumUrl"
              title="Verify checksum"
            >
              <IconCheckCircleOutline />
              <span class="btn-label">Verify</span>
            </a>
          </div>
          <span class="entry-filename">{{ entry.isoFilename }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.dakota-version-card {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

/* ── Card ── */

.card-box {
  position: relative;
  height: 400px;
  border-radius: 12px;
  overflow: hidden;
  border: 2px solid rgba(var(--color-blue-rgb), 0.25);
  background: #1f2937;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.card-image {
  width: 100%;
  height: 100%;
  background-size: contain;
  background-position: center;
  background-repeat: no-repeat;
  position: relative;
}

.card-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(to bottom, rgba(0, 0, 0, 0.15) 0%, rgba(0, 0, 0, 0.4) 30%, rgba(0, 0, 0, 0.92) 100%);
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  padding: 1.5rem;
  color: var(--color-text-light);
  border-radius: 12px;
}

.card-description {
  font-size: 1.5rem;
  line-height: 1.4;
  opacity: 0.85;
  margin: 0 0 0.75rem 0;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8);
  text-align: center;
}

.version-info {
  margin-top: 0.75rem;
  padding-top: 0.75rem;
  border-top: 1px solid rgba(255, 255, 255, 0.2);
}

.version-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-bottom: 0.4rem;
  font-size: 1.55rem;

  &:last-child {
    margin-bottom: 0;
  }
}

.version-label {
  font-weight: 600;
  color: rgba(255, 255, 255, 0.8);
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8);
}

.version-value {
  font-family: 'Courier New', monospace;
  color: #93c5fd;
  font-weight: 500;
  background: rgba(0, 0, 0, 0.3);
  padding: 0.1rem 0.4rem;
  border-radius: 4px;
  font-size: 1.55rem;
}

.alpha-badge {
  position: absolute;
  top: 12px;
  right: 12px;
  z-index: 10;
  width: max-content;
  max-width: calc(100% - 24px);
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  justify-content: flex-end;
  align-items: baseline;
  column-gap: 0.3em;
  white-space: normal;
  font-size: 1.2rem;
  line-height: 1.3;
  color: var(--color-text-light);
  background: rgba(0, 0, 0, 0.55);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 6px;
  padding: 5px 10px;
  pointer-events: none;
  text-align: right;

  .alpha-badge-title {
    font-weight: 600;
  }

  .alpha-badge-sub {
    opacity: 0.9;
  }
}

/* ── Download Section ── */

.download-section {
  container-type: inline-size;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  background: rgba(31, 41, 55, 0.6);
  backdrop-filter: blur(8px);
  border: 2px solid rgba(var(--color-blue-rgb), 0.25);
  border-radius: 12px;
  padding: 1.25rem;
}

.secondary-chips {
  display: flex;
  justify-content: center;
  width: 100%;
}

.download-entries {
  display: flex;
  flex-direction: column;
  gap: 0;
  width: 100%;
  padding: 0 8px;
}

.download-entry {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px 0;
}

.download-entry + .download-entry {
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  padding-top: 16px;
}

.entry-buttons {
  display: flex;
  flex-direction: row;
  gap: 8px;
  width: 100%;
}

.entry-filename {
  font-size: 1.1rem;
  font-family: 'Courier New', monospace;
  color: var(--color-text);
  text-align: center;
}

.entry-dl {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-size: 1.3rem;
  flex: 1 1 0%;
  white-space: nowrap;

  &:hover {
    text-decoration: underline;
  }
}

.entry-checksum {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-size: 1.3rem;
  flex: 0 1 auto;
  max-width: 160px;
}

@container (max-width: 380px) {
  .btn-label {
    display: none;
  }
}

/* ── Responsive ── */

@media (max-width: 500px) {
  .card-description {
    font-size: 1.3rem;
  }

  .version-row {
    font-size: 1.35rem;
  }

  .version-value {
    font-size: 1.35rem;
  }

  .download-section {
    padding: 1rem;
  }
}
</style>
