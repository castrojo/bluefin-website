<script setup lang="ts">
import type { DakotaVersions } from '../../composables'
import { computed, onMounted, ref } from 'vue'
import { getDakotaVersions } from '../../composables'

const props = defineProps<{
  keys?: string[]
}>()

const LABELS: Record<string, string> = {
  'kernel': 'Kernel',
  'gnome': 'GNOME',
  'freedesktop-sdk': 'Freedesktop SDK',
  'mesa': 'Mesa',
  'bootc': 'bootc',
  'nvidia': 'NVIDIA',
  'systemd': 'systemd',
  'podman': 'Podman',
  'pipewire': 'PipeWire',
  'flatpak': 'Flatpak',
  'baseline': 'x86-64',
}

const FEATURE_KEYS = new Set(['baseline'])

const versions = ref<DakotaVersions | null>(null)

onMounted(async () => {
  try {
    versions.value = await getDakotaVersions()
  }
  catch (e) {
    if (import.meta.env.DEV) {
      console.warn('[DakotaVersionChips] failed to load versions', e)
    }
  }
})

const chips = computed(() => {
  if (!versions.value || versions.value.status !== 'verified') {
    return []
  }
  return Object.entries(versions.value.packages)
    .filter(([key]) => !props.keys || props.keys.includes(key))
    .filter(([, v]) => v)
    .map(([key, value]) => ({ label: LABELS[key] ?? key, value, isFeature: FEATURE_KEYS.has(key) }))
})
</script>

<template>
  <div v-if="chips.length" class="version-chips">
    <span
      v-for="chip in chips"
      :key="chip.label"
      class="version-chip"
      :class="{ 'chip-feature': chip.isFeature }"
    >
      <span class="chip-label">{{ chip.label }}</span>
      <span class="chip-value">{{ chip.value }}</span>
    </span>
  </div>
</template>

<style scoped lang="scss">
.version-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 20px;
}

.version-chip {
  display: inline-flex;
  align-items: center;
  gap: 0;
  border: 1px solid var(--color-border-light);
  border-radius: 4px;
  overflow: hidden;
  font-size: 1.2rem;
  line-height: 1;
  background: rgba(var(--color-bg-rgb), 0.45);
  backdrop-filter: blur(8px);

  &.chip-feature {
    border-color: rgba(var(--color-green-rgb, 80, 200, 120), 0.5);

    .chip-label {
      color: var(--color-text);
    }

    .chip-value {
      background: rgba(80, 200, 120, 0.15);
      color: rgb(120, 220, 150);
    }
  }
}

.chip-label {
  background: transparent;
  color: var(--color-text);
  padding: 5px 8px;
  font-weight: 600;
  letter-spacing: 0.03em;
}

.chip-value {
  background: rgba(var(--color-blue-rgb), 0.2);
  color: var(--color-text-light);
  padding: 5px 8px;
  font-family: 'Courier New', monospace;
  font-weight: 700;
  font-size: 1.2rem;
}

@media (max-width: 500px) {
  .version-chips {
    gap: 6px;
  }

  .version-chip {
    font-size: 1.1rem;
  }

  .chip-label,
  .chip-value {
    padding: 4px 6px;
  }
}
</style>
