<script setup lang="ts">
// Privacy: all processing is client-side, no data transmitted
import type { Ref } from 'vue'
import type { MessageSchema } from '../locales/schema'
import {
  IconCheckCircle,
  IconDownload,
  IconGithubCircle
} from '@iconify-prerendered/vue-mdi'

import { load as loadYaml } from 'js-yaml'
import { marked } from 'marked'
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n<MessageSchema>({
  useScope: 'global'
})

// Version information interface
interface VersionInfo {
  status?: string
  base?: string
  gnome?: string
  kernel?: string
  mesa?: string
  nvidia?: string
  hwe?: string
}

interface StreamVersions {
  lts: VersionInfo
  stable: VersionInfo
}

// State for version information
const streamVersions = ref<StreamVersions | null>(null)

const imageName: Ref<{
  arch: string | undefined
  base: string | undefined
  gpu: string | undefined
  stream: string | undefined
  kernel: string | undefined
  imagesrc: string | undefined
}> = ref({
  arch: undefined,
  base: 'bluefin',
  gpu: undefined,
  stream: undefined,
  kernel: undefined,
  imagesrc: undefined
})

const selectedRelease = ref<string | undefined>(undefined)
const showArchitectureStep = ref(false)
const showKernelStep = ref(false)
const showGpuStep = ref(false)
const showDownload = ref(false)

// Release definitions with their characteristics
const releases = [
  {
    id: 'lts',
    title: t('TryBluefin.Lts.Title'),
    subtitle: t('TryBluefin.Lts.Subtitle'),
    description: t('TryBluefin.Lts.Description'),
    image: './characters/achillobator.webp',
    supportedArch: ['x86', 'arm'],
    recommended: false,
    disabled: true
  },
  {
    id: 'stable',
    title: t('TryBluefin.Stable.Title'),
    subtitle: t('TryBluefin.Stable.Subtitle'),
    description: t('TryBluefin.Stable.Description'),
    image: './characters/leaping.webp',
    supportedArch: ['x86'],
    recommended: true,
    disabled: false
  }
]

function getFormattedImageName() {
  let final_name = imageName.value.base

  if (imageName.value.gpu === 'nvidia') {
    if (imageName.value.stream === 'lts') {
      final_name += '-gdx'
    }
    else {
      final_name += '-nvidia-open'
    }
  }

  final_name += `-${imageName.value.stream}`

  // Add HWE suffix for LTS streams with hardware enablement
  // Skip HWE for GDX (LTS + Nvidia) as bluefin-gdx-lts-hwe-x86_64.iso does not exist
  if (
    imageName.value.stream === 'lts'
    && imageName.value.kernel === 'hwe'
    && imageName.value.gpu !== 'nvidia'
  ) {
    final_name += '-hwe'
  }

  switch (imageName.value.arch) {
    case 'x86':
      final_name += '-x86_64'
      break
    case 'arm':
      final_name += '-aarch64'
      break
  }

  return final_name
}

function selectRelease(releaseId: string) {
  selectedRelease.value = releaseId
  imageName.value.stream = releaseId
  imageName.value.imagesrc = releases.find(r => r.id === releaseId)?.image
  showArchitectureStep.value = true
  showKernelStep.value = false
  showGpuStep.value = false
  showDownload.value = false
}

function selectArchitecture(arch: string) {
  imageName.value.arch = arch

  // Apply ARM restrictions like in original component
  if (arch === 'arm' && imageName.value.stream !== 'lts') {
    imageName.value.stream = 'lts'
    selectedRelease.value = 'lts'
    imageName.value.imagesrc = './characters/achillobator.webp'
  }

  showKernelStep.value = false
  showDownload.value = false

  // ARM64 has no GPU variants — skip GPU step and proceed directly to download
  if (arch === 'arm') {
    imageName.value.gpu = undefined
    showGpuStep.value = false
    showDownload.value = true
  }
  else {
    showGpuStep.value = true
  }
}

function selectKernel(kernel: string) {
  imageName.value.kernel = kernel
  showGpuStep.value = false
  showDownload.value = true
}

function selectGpu(gpu: string) {
  imageName.value.gpu = gpu

  // For LTS stream: if Nvidia selected, skip kernel question and go to download
  // If non-Nvidia selected, show kernel question
  if (imageName.value.stream === 'lts') {
    if (gpu === 'nvidia') {
      // Skip kernel question for Nvidia users - they get GDX which doesn't have HWE option
      imageName.value.kernel = 'regular' // Default for GDX
      showKernelStep.value = false
      showDownload.value = true
    }
    else {
      // Show kernel question for non-Nvidia users
      showKernelStep.value = true
      showDownload.value = false
    }
  }
  else {
    // For non-LTS streams, go straight to download
    imageName.value.kernel = 'regular' // Default for non-LTS
    showKernelStep.value = false
    showDownload.value = true
  }
}

const getSelectedRelease = computed(() => {
  return releases.find(r => r.id === selectedRelease.value)
})

const getSupportedArchitectures = computed(() => {
  const release = getSelectedRelease.value
  if (!release) {
    return []
  }

  return release.supportedArch.map(arch => ({
    id: arch,
    label:
      arch === 'x86'
        ? t('TryBluefin.Architecture.x86')
        : t('TryBluefin.Architecture.arm'),
    available: true
  }))
})

const BLUEFIN_DOWNLOAD_URL = 'https://download.projectbluefin.io/%TEMPLATE%'

function reset() {
  selectedRelease.value = undefined
  imageName.value.stream = undefined
  imageName.value.arch = undefined
  imageName.value.kernel = undefined
  imageName.value.gpu = undefined
  imageName.value.imagesrc = undefined
  showArchitectureStep.value = false
  showKernelStep.value = false
  showGpuStep.value = false
  showDownload.value = false
}

// Load version information from YAML file
async function loadVersions() {
  try {
    const response = await fetch('/stream-versions.yml')
    const yamlText = await response.text()
    streamVersions.value = loadYaml(yamlText) as StreamVersions
  }
  catch (error) {
    console.warn('Failed to load stream versions:', error)
  }
}

// Load versions on component mount
onMounted(() => {
  loadVersions()
})
</script>

<template>
  <div class="image-chooser">
    <!-- Release Selection -->
    <template v-if="!selectedRelease">
      <div class="release-selection">
        <div class="release-grid">
          <div
            v-for="release in releases"
            :key="release.id"
            class="release-box"
            :class="{ recommended: release.recommended, disabled: release.disabled }"
            :aria-disabled="release.disabled"
            @click="!release.disabled && selectRelease(release.id)"
          >
            <div
              class="release-image"
              :style="{ backgroundImage: `url(${release.image})` }"
            >
              <!-- Badges positioned in top right corner -->
              <span v-if="release.recommended" class="recommended-badge">{{ t('TryBluefin.Label.Recommended') }}</span>
              <span v-if="release.disabled" class="unavailable-badge">Will return</span>

              <div class="release-overlay">
                <div class="release-content">
                  <div class="release-header">
                    <h3 class="release-title">
                      {{ release.title }}
                    </h3>
                    <span class="release-subtitle">{{ release.subtitle }}</span>
                  </div>
                  <p class="release-description">
                    {{ release.description }}
                  </p>

                  <!-- Version Information (only for verified streams) -->
                  <div
                    v-if="
                      streamVersions
                        && streamVersions[release.id as keyof StreamVersions]
                        && streamVersions[release.id as keyof StreamVersions].status === 'verified'
                    "
                    class="version-info"
                  >
                    <div v-if="streamVersions[release.id as keyof StreamVersions].base" class="version-item">
                      <span class="version-label">{{ t('TryBluefin.Label.Base') }}:</span>
                      <span class="version-value">{{
                        streamVersions[release.id as keyof StreamVersions].base
                      }}</span>
                    </div>
                    <div v-if="streamVersions[release.id as keyof StreamVersions].gnome" class="version-item">
                      <span class="version-label">{{ t('TryBluefin.Label.Gnome') }}:</span>
                      <span class="version-value">{{
                        streamVersions[release.id as keyof StreamVersions].gnome
                      }}</span>
                    </div>
                    <div v-if="streamVersions[release.id as keyof StreamVersions].kernel" class="version-item">
                      <span class="version-label">{{ t('TryBluefin.Label.Kernel') }}:</span>
                      <span class="version-value">{{
                        streamVersions[release.id as keyof StreamVersions].kernel
                      }}</span>
                    </div>
                    <div v-if="release.id === 'lts' && streamVersions[release.id as keyof StreamVersions].hwe" class="version-item">
                      <span class="version-label">{{ t('TryBluefin.Label.HWEKernel') }}:</span>
                      <span class="version-value">{{
                        streamVersions[release.id as keyof StreamVersions].hwe
                      }}</span>
                    </div>

                    <div v-if="streamVersions[release.id as keyof StreamVersions].mesa" class="version-item">
                      <span class="version-label">{{ t('TryBluefin.Label.Mesa') }}:</span>
                      <span class="version-value">{{
                        streamVersions[release.id as keyof StreamVersions].mesa
                      }}</span>
                    </div>
                    <div v-if="streamVersions[release.id as keyof StreamVersions].nvidia" class="version-item">
                      <span class="version-label">{{ t('TryBluefin.Label.Nvidia') }}:</span>
                      <span class="version-value">{{
                        streamVersions[release.id as keyof StreamVersions].nvidia
                      }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- Architecture Selection -->
    <div
      v-else-if="showArchitectureStep && !imageName.arch"
      class="step-selection"
    >
      <div class="step-header">
        <button class="back-button" @click="reset">
          {{ t('TryBluefin.Label.BackToReleases') }}
        </button>
        <h3>{{ t("TryBluefin.Architecture.Question") }}</h3>
      </div>
      <div class="options-grid">
        <button
          v-for="arch in getSupportedArchitectures"
          :key="arch.id"
          class="option-button"
          :disabled="!arch.available"
          @click="selectArchitecture(arch.id)"
        >
          {{ arch.label }}
        </button>
      </div>
    </div>

    <!-- Kernel Selection (only for LTS) -->
    <div v-else-if="showKernelStep && !imageName.kernel" class="step-selection">
      <div class="step-header">
        <button
          class="back-button"
          @click="
            () => {
              showGpuStep = true
              imageName.gpu = undefined
              showKernelStep = false
            }
          "
        >
          {{ t('TryBluefin.Label.Back') }}
        </button>
        <h3>{{ t("TryBluefin.Kernel.Question") }}</h3>
      </div>
      <div class="options-grid">
        <button class="option-button" @click="selectKernel('regular')">
          {{ t("TryBluefin.Kernel.Regular") }}
        </button>
        <button class="option-button" @click="selectKernel('hwe')">
          {{ t("TryBluefin.Kernel.HWE") }}
        </button>
      </div>
    </div>

    <!-- GPU Selection -->
    <div v-else-if="showGpuStep && !imageName.gpu" class="step-selection">
      <div class="step-header">
        <button
          class="back-button"
          @click="
            () => {
              showArchitectureStep = true
              imageName.arch = undefined
              showGpuStep = false
            }
          "
        >
          {{ t('TryBluefin.Label.Back') }}
        </button>
        <h3>{{ t("TryBluefin.Gpu.Question") }}</h3>
      </div>

      <div class="options-grid">
        <!-- AMD/Intel option -->
        <button
          class="option-button"
          @click="selectGpu('amd')"
        >
          {{ t("TryBluefin.Gpu.AMDIntel") }}
        </button>
        <!-- NVIDIA option -->
        <button
          class="option-button"
          @click="selectGpu('nvidia')"
        >
          {{ t("TryBluefin.Gpu.Nvidia") }}
        </button>
      </div>
    </div>

    <!-- Download Section -->
    <div v-else-if="showDownload" class="download-section">
      <div class="step-header">
        <button
          class="back-button"
          @click="
            () => {
              if (imageName.arch === 'arm') {
                showArchitectureStep = true
                imageName.arch = undefined
                imageName.gpu = undefined
                showDownload = false
              }
              else if (imageName.stream === 'lts' && imageName.gpu === 'amd') {
                showKernelStep = true
                imageName.kernel = undefined
                showDownload = false
              }
              else {
                showGpuStep = true
                imageName.gpu = undefined
                imageName.kernel = undefined
                showDownload = false
              }
            }
          "
        >
          {{ t('TryBluefin.Label.Back') }}
        </button>
        <h3>{{ t('TryBluefin.Selection.Ready') }}</h3>
      </div>

      <div class="download-summary">
        <div class="decision-summary">
          <h4>{{ t('TryBluefin.Selection.YourSelection') }}</h4>
          <div class="decision-items">
            <div class="decision-item">
              <span class="decision-label">{{ t('TryBluefin.Selection.Release.Title') }}:</span>
              <span class="decision-value">{{
                imageName.gpu === "nvidia" && imageName.stream === "lts"
                  ? "Bluefin GDX"
                  : getSelectedRelease?.title
              }}</span>
              <span class="decision-subtitle">{{
                getSelectedRelease?.subtitle
              }}</span>
            </div>
            <div class="decision-item">
              <span class="decision-label">{{ t('TryBluefin.Selection.Architecture.Title') }}:</span>
              <span class="decision-value">{{
                imageName.arch === "x86" ? "x86_64" : "ARM64"
              }}</span>
              <span class="decision-subtitle">{{
                imageName.arch === "x86"
                  ? t('TryBluefin.Selection.Architecture.X86Desc')
                  : t('TryBluefin.Selection.Architecture.ArmDesc')
              }}</span>
            </div>
            <div v-if="imageName.stream === 'lts'" class="decision-item">
              <span class="decision-label">{{ t('TryBluefin.Selection.Kernel.Title') }}:</span>
              <span class="decision-value">{{
                imageName.kernel === "hwe"
                  ? t('TryBluefin.Selection.Kernel.HWE')
                  : t('TryBluefin.Selection.Kernel.Regular')
              }}</span>
              <span class="decision-subtitle">{{
                imageName.kernel === "hwe"
                  ? t('TryBluefin.Selection.Kernel.HWEDesc')
                  : t('TryBluefin.Selection.Kernel.RegularDesc')
              }}</span>
            </div>
            <div class="decision-item">
              <span class="decision-label">{{ t('TryBluefin.Selection.Gpu.Title') }}:</span>
              <span class="decision-value">{{
                imageName.gpu === "amd" ? "AMD/Intel" : "Nvidia"
              }}</span>
              <span class="decision-subtitle">{{
                imageName.gpu === "amd"
                  ? t('TryBluefin.Selection.Gpu.AMDIntelDesc')
                  : t('TryBluefin.Selection.Gpu.NvidiaDesc')
              }}</span>
            </div>
          </div>
          <div class="generated-filename">
            <span class="filename-label">{{ t('TryBluefin.Download.IsoDescription') }}:</span>
            <span class="filename-value">{{ getFormattedImageName() }}.iso</span>
          </div>
        </div>
        <br>
        <br>
        <br>
        <div class="download-actions">
          <a
            class="download-button primary"
            :href="
              BLUEFIN_DOWNLOAD_URL.replace(
                '%TEMPLATE%',
                `${getFormattedImageName() ?? ''}.iso`,
              )
            "
          >
            {{ t("TryBluefin.Download.IsoDownload") }}
            <IconDownload class="download-icon" />
          </a>

          <div class="secondary-actions">
            <a
              class="btn"
              :title="t('TryBluefin.Download.Checksum')"
              :href="
                BLUEFIN_DOWNLOAD_URL.replace(
                  '%TEMPLATE%',
                  `${getFormattedImageName() ?? ''}.iso-CHECKSUM`,
                )
              "
            >
              <IconCheckCircle />
              {{ t('TryBluefin.Download.Checksum') }}
            </a>
            <a
              class="btn"
              :title="t('TryBluefin.Download.Registry')"
              href="https://github.com/orgs/ublue-os/packages?repo_name=bluefin"
              target="_blank"
            >
              <IconGithubCircle />
              {{ t('TryBluefin.Download.Registry') }}
            </a>
          </div>
        </div>
      </div>

      <div class="documentation-note">
        <p v-html="marked.parse(t('TryBluefin.Download.Documentation.Intro'))" />
        <p v-html="marked.parse(t('TryBluefin.Download.Documentation.Downloads'))" />
        <p v-html="marked.parse(t('TryBluefin.Download.Documentation.SecureBoot'))" />
      </div>

      <button class="start-over-button" @click="reset">
        {{ t('TryBluefin.Download.ChooseRelease') }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.image-chooser {
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  /* Ensure consistent height across all steps to prevent FAQ section from jumping */
  min-height: 500px;
}

/* Release Selection */
.release-selection {
  margin-bottom: 2rem;
  margin-top: 2rem;
}

.release-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.release-box {
  position: relative;
  height: 400px;
  border-radius: 12px;
  overflow: hidden;
  cursor: pointer;
  transition:
    transform 0.3s ease,
    box-shadow 0.3s ease;
  border: 3px solid transparent;
  background: #1f2937;
}

.release-box:hover {
  transform: translateY(-5px);
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
}

.release-box.disabled {
  cursor: not-allowed;
  filter: grayscale(1);
  opacity: 0.5;
}

.release-box.disabled:hover {
  transform: none;
  box-shadow: none;
}

.release-box.recommended {
  border-color: #4f9cf9;
  box-shadow: 0 0 20px rgba(79, 156, 249, 0.3);
}

.release-image {
  width: 100%;
  height: 100%;
  background-size: contain;
  background-position: center;
  background-repeat: no-repeat;
  padding: 1.5rem;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: center;
}

.release-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(to bottom, rgba(0, 0, 0, 0.2) 0%, rgba(0, 0, 0, 0.5) 40%, rgba(0, 0, 0, 0.9) 100%);
  display: flex;
  align-items: flex-end;
  padding: 1.5rem;
  color: white;
  border-radius: 12px;
}

.release-content {
  width: 100%;
}

.release-header {
  margin-bottom: 0.75rem;
}

.release-title {
  font-size: 2rem;
  font-weight: 700;
  margin: 0 0 0.25rem 0;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8);
}

.release-subtitle {
  font-size: 1.5rem;
  opacity: 0.9;
  display: block;
  margin-bottom: 0.5rem;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8);
}

.recommended-badge {
  position: absolute;
  top: 1rem;
  right: 1rem;
  background: rgba(var(--color-blue-rgb), 0.9);
  color: white;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  font-size: 1.3rem;
  font-weight: 700;
  text-transform: uppercase;
  z-index: 10;
  backdrop-filter: blur(10px);
}

.unavailable-badge {
  position: absolute;
  top: 1rem;
  right: 1rem;
  z-index: 10;
  padding: 0.5rem 1rem;
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 6px;
  background: rgba(80, 80, 80, 0.9);
  color: rgba(255, 255, 255, 0.9);
  font-size: 1.3rem;
  font-weight: 700;
  text-transform: uppercase;
  backdrop-filter: blur(10px);
}

.release-description {
  font-size: 1.5rem;
  line-height: 1.4;
  opacity: 0.9;
  margin: 0 0 1rem 0;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8);
}

/* Version Information */
.version-info {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid rgba(255, 255, 255, 0.2);
  min-height: 150px;
}

.version-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
  font-size: 1.55rem;
}

.version-item:last-child {
  margin-bottom: 0;
}

.version-label {
  font-weight: 600;
  color: rgba(255, 255, 255, 0.8);
  min-width: 60px;
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

/* Step Selection */
.step-selection {
  max-width: 600px;
  margin: 0 auto;
}

.step-header {
  text-align: center;
  margin-bottom: 2rem;
}

.back-button {
  /* Style like "Discover" button (btn filled) */
  font-weight: 700;
  height: 36px;
  line-height: 36px;
  border: 2px solid var(--color-blue);
  background-color: var(--color-blue);
  color: var(--color-text-light);
  border-radius: 18px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 0 20px;
  font-size: 1.7rem;
  text-decoration: none;
  margin-bottom: 1rem;
  cursor: pointer;
  transition: all 0.3s ease;
  margin: 24px;
}

.back-button:hover {
  background-color: var(--color-blue);
  color: var(--color-text-light);
}

.step-header h3 {
  font-size: 2.3rem;
  font-weight: bold;
  margin: 0;
  color: white; /* Download the ISO text should be white - keeping this white */
}

.options-grid {
  display: grid;
  gap: 1rem;
}

.option-button {
  position: relative;
  padding: 1.5rem;
  border: 2px solid #374151;
  border-radius: 8px;
  background: #1f2937;
  color: white;
  font-size: 1.6rem; /* Increased from 1.1rem to be larger than average text */
  font-weight: 700; /* Made bold as requested */
  cursor: pointer;
  transition: all 0.3s ease;
}

.option-button:hover:not(:disabled) {
  border-color: #4f9cf9;
  background: rgba(79, 156, 249, 0.1);
}

.option-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Download Section */
.download-section {
  max-width: 800px;
  margin: 0 auto;
  /* Center the "Choose a different release" button */
  text-align: center;
}

.download-summary {
  border-radius: 12px;
  padding: 2rem;
  margin-bottom: 2rem;
  text-align: left; /* Override center alignment for content */
}

.decision-summary h4 {
  font-size: 1.5rem;
  font-weight: 700;
  color: white;
  margin: 0 0 1.5rem 0;
  text-align: center;
}

.decision-items {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.decision-item {
  padding: 1rem;
  border: 2px solid #374151;
  border-radius: 8px;
  background: #1f2937;
}

.decision-label {
  display: block;
  font-size: 1.7rem;
  font-weight: 600;
  color: #93c5fd;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 0.75rem;
}

.decision-value {
  display: block;
  font-size: 1.6rem;
  font-weight: 700;
  color: white;
  margin-bottom: 1rem;
}

.decision-subtitle {
  display: block;
  font-size: 1.6rem;
  color: #9ca3af;
  font-style: italic;
}

.generated-filename {
  padding: 1rem;
  background: rgba(79, 156, 249, 0.1);
  border: 1px solid rgba(79, 156, 249, 0.2);
  border-radius: 8px;
  text-align: center;
}

.filename-label {
  display: block;
  font-size: 1.75rem;
  font-weight: 600;
  color: #93c5fd;
  margin-bottom: 0.5rem;
}

.filename-value {
  display: block;
  font-family: 'Courier New', monospace;
  font-size: 1.65rem;
  font-weight: 600;
  color: white;
  background: rgba(0, 0, 0, 0.3);
  padding: 0.5rem 1rem;
  border-radius: 4px;
  word-break: break-all;
}

.download-actions {
  text-align: center;
}

.download-button {
  display: inline-flex;
  align-items: center;
  gap: 0.9rem; /* 20% increase from 0.75rem */
  height: 44px; /* 20% increase from 36px */
  line-height: 44px;
  border: 2px solid var(--color-blue);
  background-color: var(--color-blue);
  color: var(--color-text-light);
  border-radius: 22px; /* 20% increase from 18px */
  padding: 0 25px; /* 20% increase from 20px */
  font-size: 1.75rem; /* 20% increase from 1.4rem */
  font-weight: 700;
  text-decoration: none;
  transition: all 0.3s ease;
  margin-bottom: 1rem;
  cursor: pointer;
}

.download-button:hover {
  background-color: var(--color-blue);
  color: var(--color-text-light);
}

.download-icon {
  width: 1.5rem; /* 20% increase from 1.2rem */
  height: 1.5em;
}

.secondary-actions {
  display: flex;
  justify-content: center;
  gap: 1.5rem;
  flex-wrap: wrap;
}

.documentation-note {
  background: rgba(79, 156, 249, 0.1);
  border: 1px solid rgba(79, 156, 249, 0.2);
  border-radius: 8px;
  padding: 1.5rem;
  /* Increased spacing below documentation note (contains "ventoy is unsupported" text)
     to provie better visual separation from the "Choose different release" button below.
     Adjust this value to modify spacing between documentation and button. */
  margin-bottom: 3rem; /* Increased from 2rem to 3rem */
  color: white;
  text-align: left; /* Override center alignment for content */
}

.documentation-note :deep(a) {
  color: #93c5fd;
}

.start-over-button {
  /* Style like "Discover" button (btn filled) */
  font-weight: 700;
  height: 36px;
  line-height: 36px;
  border: 2px solid var(--color-blue);
  background-color: var(--color-blue);
  color: var(--color-text-light);
  border-radius: 18px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 0 20px;
  font-size: 1.7rem;
  text-decoration: none;
  margin: 0 auto;
  cursor: pointer;
  transition: all 0.3s ease;
}

.start-over-button:hover {
  background-color: var(--color-blue);
  color: var(--color-text-light);
}

/* Mobile responsiveness */
@media (max-width: 768px) {
  .release-grid {
    grid-template-columns: 1fr;
    gap: 1rem;
  }

  .release-box {
    height: 350px;
  }

  .decision-summary h4 {
    font-size: 1.25rem;
  }

  .decision-items {
    gap: 1rem;
  }

  .decision-item {
    padding: 0.75rem;
  }

  .decision-value {
    font-size: 1.1rem;
  }

  .generated-filename {
    padding: 0.75rem;
  }

  .filename-value {
    font-size: 1rem;
    padding: 0.4rem 0.8rem;
  }

  .secondary-actions {
    flex-direction: column;
    gap: 0.75rem;
  }
}
</style>
