<script setup lang="ts">
import { IconGithubCircle } from '@iconify-prerendered/vue-mdi'

const GITHUB_RELEASES_PAGE = 'https://github.com/projectbluefin/server/releases'
</script>

<template>
  <div class="release-widget">
    <div class="release-action">
      <div class="action-label">
        Install freedesktop-sdk Server Linux
      </div>
      <p>Choose the release asset for your hardware and follow the installation notes on GitHub.</p>
      <p>Version details will appear when Bluefin Server publishes a verifiable image SBOM.</p>
      <a class="release-link" :href="GITHUB_RELEASES_PAGE" target="_blank" rel="noopener noreferrer">
        <IconGithubCircle />
        View releases on GitHub
      </a>
    </div>
  </div>
</template>

<style scoped lang="scss">
.release-widget {
  width: 100%;
  border-radius: 10px;
  overflow: hidden;
  background: rgba(var(--color-bg-rgb), 0.55);
  backdrop-filter: blur(8px);
}

.release-action {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 16px 18px;
  background: rgba(var(--color-bg-rgb), 0.35);
}

.action-label {
  color: var(--color-text);
  font-size: 0.95rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  opacity: 0.65;
  text-transform: uppercase;
}

.release-action p {
  margin: 0;
  color: var(--color-text);
  font-size: 1.15rem;
  line-height: 1.5;
}

.release-link {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  margin-top: auto;
  padding: 10px 12px;
  border: 1px solid rgba(var(--color-blue-rgb), 0.5);
  border-radius: 7px;
  background: rgba(var(--color-blue-rgb), 0.9);
  color: white;
  font-size: 1.15rem;
  font-weight: 700;
  text-align: center;
  text-decoration: none;
  transition: background 0.15s;

  &:hover {
    background: rgba(var(--color-blue-rgb), 1);
  }

  svg {
    width: 1.5rem;
    height: 1.5rem;
    flex-shrink: 0;
  }
}
</style>
