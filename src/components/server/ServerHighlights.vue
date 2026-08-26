<script setup lang="ts">
import { IconServerNetwork } from '@iconify-prerendered/vue-mdi'
</script>

<template>
  <section class="section-wrap server-highlights">
    <div class="container">
      <div class="brand-grid">
        <!-- Row 1: freedesktop-sdk | NVIDIA -->
        <div class="brand-item">
          <div>
            <div class="icon-wrap">
              <IconServerNetwork />
            </div>
            <a class="brand-title" href="https://freedesktop-sdk.io" target="_blank" rel="noopener noreferrer">freedesktop-sdk Server Linux</a>
          </div>
          <p>Image-based — the OS never drifts. The OS manages itself. Forever.</p>
        </div>

        <div class="brand-item brand-nvidia">
          <div>
            <div class="icon-wrap">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="currentColor" d="M8.948 8.798v-1.43a6.7 6.7 0 0 1 .424-.018c3.922-.124 6.493 3.374 6.493 3.374s-2.774 3.851-5.75 3.851c-.398 0-.787-.062-1.158-.185v-4.346c1.528.185 1.837.857 2.747 2.385l2.04-1.714s-1.492-1.952-4-1.952a6.016 6.016 0 0 0-.796.035m0-4.735v2.138l.424-.027c5.45-.185 9.01 4.47 9.01 4.47s-4.08 4.964-8.33 4.964c-.37 0-.733-.035-1.095-.097v1.325c.3.035.61.062.91.062 3.957 0 6.82-2.023 9.593-4.408.459.371 2.34 1.263 2.73 1.652-2.633 2.208-8.772 3.984-12.253 3.984-.335 0-.653-.018-.971-.053v1.864H24V4.063zm0 10.326v1.131c-3.657-.654-4.673-4.46-4.673-4.46s1.758-1.944 4.673-2.262v1.237H8.94c-1.528-.186-2.73 1.245-2.73 1.245s.68 2.412 2.739 3.11M2.456 10.9s2.164-3.197 6.5-3.533V6.201C4.153 6.59 0 10.653 0 10.653s2.35 6.802 8.948 7.42v-1.237c-4.84-.6-6.492-5.936-6.492-5.936z" />
              </svg>
            </div>
            <a class="brand-title" href="https://github.com/NVIDIA/go-nvlib" target="_blank" rel="noopener noreferrer">NVIDIA Autodetection</a>
          </div>
          <p>GPU automatically detected at install. NVIDIA and AMD. Shared across your entire cluster for inference, transcoding, and compute.</p>
        </div>

        <!-- Row 2: KubeStellar | CNCF -->
        <div class="brand-item brand-kubestellar">
          <div>
            <div class="icon-wrap">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="none" aria-hidden="true">
                <circle cx="50" cy="50" r="46" stroke="currentColor" stroke-width="3" fill="none" />
                <polygon points="50,12 58,38 86,38 63,55 71,82 50,66 29,82 37,55 14,38 42,38" fill="currentColor" opacity="0.9" />
                <circle cx="50" cy="10" r="4" fill="currentColor" />
                <circle cx="88" cy="40" r="4" fill="currentColor" />
                <circle cx="74" cy="82" r="4" fill="currentColor" />
                <circle cx="26" cy="82" r="4" fill="currentColor" />
                <circle cx="12" cy="40" r="4" fill="currentColor" />
                <path d="M50 10 Q69 25 88 40" stroke="currentColor" stroke-width="1.5" fill="none" opacity="0.5" />
                <path d="M88 40 Q81 61 74 82" stroke="currentColor" stroke-width="1.5" fill="none" opacity="0.5" />
                <path d="M74 82 Q50 82 26 82" stroke="currentColor" stroke-width="1.5" fill="none" opacity="0.5" />
                <path d="M26 82 Q19 61 12 40" stroke="currentColor" stroke-width="1.5" fill="none" opacity="0.5" />
                <path d="M12 40 Q31 25 50 10" stroke="currentColor" stroke-width="1.5" fill="none" opacity="0.5" />
              </svg>
            </div>
            <a class="brand-title" href="https://kubestellar.io" target="_blank" rel="noopener noreferrer">KubeStellar Console UI</a>
          </div>
          <p>Your command center. Unified visibility and control across every node you own. Deploy workloads, investigate with AI, monitor everything — from one dashboard.</p>
        </div>

        <div class="brand-item brand-nvidia">
          <div>
            <div class="icon-wrap">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="5.52 5.02 388.71 388.96" aria-hidden="true">
                <path d="M66.5 333.2v-71.3H13v124.7h124.7v-53.4H66.5zm267.1-70.9v70.9h-70.9l-.3-.4v53.8H387V261.9h-53.8l.4.4zM66.5 136.9V66h70.8l.4.4V12.6H13v124.7h53.9l-.4-.4zM262.4 12.6V66h71.2v71.3H387V12.6H262.4z" fill="currentColor" opacity=".75" />
                <path fill="currentColor" d="M208.5 137.3h47.3L184.5 66h77.9V12.6H137.7v53.8l70.8 70.9zm18.4 160l-35.4-35.4h-47.2l59 59.1 12.2 12.2h-77.8v53.4h124.7v-53.8l-35.5-35.5zm106.7-106.6v24.4l-12.2-12.2-59-59v47.2l35.4 35.4 35.4 35.4H387V137.3h-53.4v53.4zm-267.1-6.6l71.2 71.2v-47.2l-70.8-70.8H13v124.6h53.5v-77.8z" />
              </svg>
            </div>
            <a class="brand-title" href="https://freedesktop-sdk.io" target="_blank" rel="noopener noreferrer">freedesktop-sdk for server foundations</a>
          </div>
          <p>Part of a community-vetted open source ecosystem for building reliable Linux foundations, available on the hardware in your closet.</p>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped lang="scss">
@use '../../style/setup/mixins';

.server-highlights {
  min-height: auto;
  padding: 0;

  @include mixins.brand-deep-overrides;

  :deep(p a) {
    strong {
      font-weight: 700;
    }
  }

  .icon-wrap {
    svg {
      display: block;
      height: 24px;
      width: 24px;
      color: var(--color-text-light);
    }
  }

  // brand-item-row spans both columns, contains 3 equal boxes
  :deep(.brand-item-row) {
    grid-column: 1 / -1;
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;

    .brand-item {
      border: none !important;

      &:not(:last-child) {
        border-right: 1px solid var(--color-border-light) !important;
      }
    }
  }

  :deep(.brand-grid-lower) {
    margin-top: 24px;
  }

  :deep(.brand-extensible) {
    p {
      max-width: 60ch;
    }
  }

  .cncf-tier {
    display: flex;
    flex-direction: column;
    gap: 8px;

    & + .cncf-tier {
      margin-top: 14px;
    }
  }

  .cncf-logo-row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 10px 16px;
  }

  .cncf-logo-item {
    display: flex;
    align-items: center;
    gap: 7px;
    text-decoration: none;
    opacity: 0.8;
    transition: opacity 0.15s;

    &:hover {
      opacity: 1;
    }
  }

  .cncf-logo {
    display: block;
    height: 22px;
    width: auto;
    flex-shrink: 0;
  }

  .cncf-logo-label {
    font-size: 1.2rem;
    font-weight: 500;
    color: var(--color-text-light);
    white-space: nowrap;
  }

  .sysext-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 16px 24px;
    margin-top: 12px;
  }

  .sysext-group {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .sysext-group-label {
    font-size: 1rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.07em;

    &.graduated {
      color: var(--color-cncf-graduated);
    }
    &.incubating {
      color: var(--color-cncf-incubating);
    }
    &.sandbox {
      color: var(--color-cncf-sandbox);
    }
    &.other {
      color: var(--color-text);
      opacity: 0.45;
    }
  }

  .sysext-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }

  .sysext-chip {
    display: inline-block;
    padding: 3px 8px;
    border-radius: 4px;
    font-size: 1.1rem;
    font-weight: 600;
    font-family: 'Courier New', monospace;
    text-decoration: none;
    transition: opacity 0.15s;

    &:hover {
      opacity: 0.75;
    }

    &.graduated {
      background: rgba(var(--color-cncf-graduated-rgb), 0.12);
      color: var(--color-cncf-graduated);
      border: 1px solid rgba(var(--color-cncf-graduated-rgb), 0.3);
    }
    &.incubating {
      background: rgba(var(--color-cncf-incubating-rgb), 0.12);
      color: var(--color-cncf-incubating);
      border: 1px solid rgba(var(--color-cncf-incubating-rgb), 0.3);
    }
    &.sandbox {
      background: rgba(var(--color-cncf-sandbox-rgb), 0.12);
      color: var(--color-cncf-sandbox);
      border: 1px solid rgba(var(--color-cncf-sandbox-rgb), 0.3);
    }
    &.other {
      background: rgba(var(--color-text-rgb, 255 255 255), 0.05);
      color: var(--color-text);
      opacity: 0.55;
      border: 1px solid var(--color-border-light);

      &:hover {
        opacity: 0.85;
      }
    }
  }

  .nvidia-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-top: 8px;
  }

  .chip {
    display: inline-flex;
    align-items: center;
    border: 1px solid var(--color-border-light);
    border-radius: 3px;
    overflow: hidden;
    font-size: 1.05rem;
    line-height: 1;

    &.nvidia {
      border-color: rgba(118, 185, 0, 0.4);
    }
  }

  .chip-k {
    padding: 3px 5px;
    font-weight: 600;
    color: var(--color-text);
    letter-spacing: 0.02em;

    .nvidia & {
      color: rgba(118, 185, 0, 0.8);
    }
  }

  .chip-v {
    padding: 3px 5px;
    font-family: 'Courier New', monospace;
    font-weight: 700;

    .nvidia & {
      background: rgba(118, 185, 0, 0.15);
      color: #76b900;
    }
  }
}

@media (max-width: 640px) {
  .server-highlights {
    :deep(.brand-grid) {
      grid-template-columns: 1fr !important;
    }

    :deep(.brand-item-row) {
      grid-template-columns: 1fr !important;

      .brand-item {
        border-right: none !important;
      }
    }
  }
}
</style>
