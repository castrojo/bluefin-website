import { useWindowSize } from '@vueuse/core'
import { computed, onMounted, ref } from 'vue'

const { width } = useWindowSize()

/**
 * Returns true, if the screen size is currently below 956px
 */
export const IS_TABLET = computed(() => {
  return width.value <= 956
})

export interface DakotaVersions {
  checkedAt: string
  status: 'verified' | 'unavailable'
  sources: Array<{ id: string, image: string, imageDigest: string, sbomDigest: string }>
  isos?: Array<{ label: string, filename: string }>
  packages: Record<string, string>
}

let versionsPromise: Promise<DakotaVersions> | null = null

function fetchVersionsOnce(): Promise<DakotaVersions> {
  if (!versionsPromise) {
    versionsPromise = (async () => {
      const res = await fetch(`${import.meta.env.BASE_URL}dakota-versions.json`)
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`)
      }
      return res.json()
    })()
  }
  return versionsPromise
}

/**
 * Fetches dakota-versions.json once and caches the result.
 */
export async function getDakotaVersions(): Promise<DakotaVersions> {
  return fetchVersionsOnce()
}

/**
 * Fades in + slides up 150ms after mount. Used by ServerTitle and ServerDesc.
 */
export function useFadeInUp() {
  const isLoaded = ref(false)
  onMounted(() => {
    setTimeout(() => {
      isLoaded.value = true
    }, 150)
  })
  return { isLoaded }
}
