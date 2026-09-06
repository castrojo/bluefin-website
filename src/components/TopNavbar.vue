<script setup lang="ts">
import type { MessageSchema } from '../locales/schema'
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'

interface NavLink {
  name: string
  href: string
  external?: boolean
}

const { t } = useI18n<MessageSchema>({
  useScope: 'global'
})

const menuOpen = ref(false)

// Left side navigation
const leftNavLinks: NavLink[] = [
  {
    name: t('TopBar.Docs'),
    href: 'https://docs.projectbluefin.io/introduction'
  },
  { name: t('TopBar.AskBluefin'), href: 'https://ask.projectbluefin.io', external: true }
]

// Right side navigation
const rightNavLinks: NavLink[] = [
  { name: t('TopBar.Blog'), href: 'https://docs.projectbluefin.io/blog' },
  { name: t('TopBar.Changelog'), href: 'https://docs.projectbluefin.io/changelogs' },
  { name: t('TopBar.Reports'), href: 'https://docs.projectbluefin.io/reports' },
  {
    name: t('TopBar.Discussions'),
    href: 'https://github.com/ublue-os/bluefin/discussions',
    external: true
  },
  {
    name: t('TopBar.Feedback'),
    href: 'https://feedback.projectbluefin.io/',
    external: true
  },
  {
    name: t('TopBar.Store'),
    href: 'https://store.projectbluefin.io',
    external: true
  }
]

const mobileNavLinks = [...leftNavLinks, ...rightNavLinks]

function closeMenu() {
  menuOpen.value = false
}
</script>

<template>
  <nav class="docusaurus-navbar navbar navbar--fixed-top">
    <div class="navbar__inner">
      <div class="navbar__items">
        <a href="https://projectbluefin.io" class="navbar__brand">
          <img
            src="/brands/bluefin-wordmark.svg"
            alt="Bluefin"
            class="navbar__wordmark"
            loading="eager"
          >
        </a>
        <a
          v-for="link in leftNavLinks"
          :key="link.name"
          :href="link.href"
          class="navbar__item navbar__link"
          :class="{ 'navbar__link--active': link.name === t('TopBar.Docs') }"
          :target="link.external ? '_blank' : undefined"
          :rel="link.external ? 'noopener noreferrer' : undefined"
        >
          {{ link.name }}
        </a>
      </div>

      <div class="navbar__items navbar__items--right">
        <a
          v-for="link in rightNavLinks"
          :key="link.name"
          :href="link.href"
          class="navbar__item navbar__link"
          :target="link.external ? '_blank' : undefined"
          :rel="link.external ? 'noopener noreferrer' : undefined"
        >
          {{ link.name }}
        </a>
      </div>

      <button
        type="button"
        class="navbar__menu-toggle"
        :aria-expanded="menuOpen"
        aria-controls="navbar-mobile-menu"
        :aria-label="menuOpen ? 'Close navigation menu' : 'Open navigation menu'"
        @click="menuOpen = !menuOpen"
      >
        {{ menuOpen ? '✕' : '☰' }}
      </button>
    </div>

    <div
      v-if="menuOpen"
      id="navbar-mobile-menu"
      class="navbar__mobile-menu"
    >
      <a
        v-for="link in mobileNavLinks"
        :key="link.name"
        :href="link.href"
        class="navbar__mobile-link"
        :class="{ 'navbar__link--active': link.name === t('TopBar.Docs') }"
        :target="link.external ? '_blank' : undefined"
        :rel="link.external ? 'noopener noreferrer' : undefined"
        @click="closeMenu"
      >
        {{ link.name }}
      </a>
    </div>
  </nav>
</template>

<style scoped lang="scss">
// Docusaurus navbar styles - matching the docs site exactly
.docusaurus-navbar {
  // Infima CSS variables - matching Docusaurus defaults
  --ifm-navbar-background-color: #242526;
  --ifm-navbar-link-color: rgb(227, 227, 227);
  --ifm-navbar-link-hover-color: rgb(138, 151, 247);
  --ifm-navbar-height: 60px;
  --ifm-navbar-padding-horizontal: 16px;
  --ifm-navbar-padding-vertical: 14px;
  --ifm-navbar-item-height: 32px;
  --ifm-navbar-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.1);
  --ifm-transition-fast: 200ms;
  --ifm-transition-timing-default: cubic-bezier(0.4, 0, 0.2, 1);

  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: var(--ifm-navbar-height);
  background-color: var(--ifm-navbar-background-color);
  box-shadow: var(--ifm-navbar-shadow);
  z-index: 1000;

  // Use Docusaurus/Infima system font stack
  font-family:
    system-ui,
    -apple-system,
    Segoe UI,
    Roboto,
    Ubuntu,
    Cantarell,
    Noto Sans,
    sans-serif,
    Apple Color Emoji,
    Segoe UI Emoji,
    Segoe UI Symbol,
    Noto Color Emoji;

  // Better text rendering
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-rendering: optimizeLegibility;
}

.navbar__inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  max-width: 1440px;
  margin: 0 auto;
  padding: 0 16px;
  height: 100%;
}

.navbar__items {
  display: flex;
  align-items: center;
  gap: 0;
  height: 100%;
  flex-wrap: nowrap;
}

.navbar__brand {
  display: flex;
  align-items: center;
  gap: 8px;
  text-decoration: none;
  margin-right: 16px;
  height: var(--ifm-navbar-item-height);
  transition: opacity var(--ifm-transition-fast) var(--ifm-transition-timing-default);

  &:hover {
    opacity: 0.8;
  }

  &:focus-visible {
    outline: 2px solid var(--ifm-navbar-link-hover-color);
    outline-offset: 2px;
    border-radius: 4px;
  }
}

.navbar__logo {
  display: flex;
  align-items: center;
  height: 100%;

  img {
    height: 32px;
    width: auto;
    display: block;
    max-width: none;
  }
}

.navbar__wordmark {
  height: 32px;
  width: auto;
  display: block;
  max-width: none;
}

.navbar__title {
  font-size: 16px;
  font-weight: 700;
  color: var(--ifm-navbar-link-color);
  line-height: 1;
}

.text--truncate {
  overflow-wrap: anywhere;
}

.navbar__item {
  display: inline-flex;
  align-items: center;
}

.navbar__link {
  color: var(--ifm-navbar-link-color);
  text-decoration: none;
  font-size: 16px;
  font-weight: 500;
  padding: 4px 12px;
  line-height: 1.5;
  display: flex;
  align-items: center;
  height: 100%;
  transition: color var(--ifm-transition-fast) var(--ifm-transition-timing-default);

  &:hover {
    color: var(--ifm-navbar-link-hover-color);
  }

  &:focus-visible {
    outline: 2px solid var(--ifm-navbar-link-hover-color);
    outline-offset: 2px;
    border-radius: 4px;
  }

  &--active {
    color: rgb(138, 151, 247);
    font-weight: 500;
  }
}

.navbar__items--right {
  flex: 1;
  justify-content: flex-end;
}

.navbar__menu-toggle {
  display: none;
  align-items: center;
  justify-content: center;
  min-width: 40px;
  min-height: 40px;
  padding: 0;
  border: 1px solid rgba(255, 255, 255, 0.16);
  border-radius: 6px;
  background: transparent;
  color: var(--ifm-navbar-link-color);
  font-size: 24px;
  line-height: 1;
  cursor: pointer;
  transition:
    color var(--ifm-transition-fast) var(--ifm-transition-timing-default),
    border-color var(--ifm-transition-fast) var(--ifm-transition-timing-default),
    background-color var(--ifm-transition-fast) var(--ifm-transition-timing-default);

  &:hover {
    color: var(--ifm-navbar-link-hover-color);
    border-color: rgba(138, 151, 247, 0.5);
    background-color: rgba(255, 255, 255, 0.04);
  }

  &:focus-visible {
    outline: 2px solid var(--ifm-navbar-link-hover-color);
    outline-offset: 2px;
  }
}

.navbar__mobile-menu {
  display: none;
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  flex-direction: column;
  padding: 8px 16px 16px;
  background-color: var(--ifm-navbar-background-color);
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.18);
  max-height: calc(100vh - var(--ifm-navbar-height));
  overflow-y: auto;
}

.navbar__mobile-link {
  color: var(--ifm-navbar-link-color);
  text-decoration: none;
  font-size: 15px;
  font-weight: 500;
  line-height: 1.5;
  padding: 10px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  transition: color var(--ifm-transition-fast) var(--ifm-transition-timing-default);

  &:hover {
    color: var(--ifm-navbar-link-hover-color);
  }

  &:last-child {
    border-bottom: none;
  }
}

// Mobile responsive - matching Docusaurus breakpoints exactly
@media (max-width: 996px) {
  .docusaurus-navbar {
    --ifm-navbar-padding-horizontal: 8px;
  }

  .navbar__link {
    font-size: 14px;
    padding: 4px 8px;
  }

  .navbar__brand {
    margin-right: 8px;
  }
}

@media (max-width: 768px) {
  .navbar__inner {
    gap: 12px;
  }

  .navbar__items {
    flex: 1;
    min-width: 0;

    a:not(.navbar__brand) {
      display: none;
    }
  }

  .navbar__brand {
    margin-right: 0;
  }

  .navbar__items--right {
    display: none;
  }

  .navbar__menu-toggle {
    display: inline-flex;
    flex-shrink: 0;
  }

  .navbar__mobile-menu {
    display: flex;
  }
}
</style>
