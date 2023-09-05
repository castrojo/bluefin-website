import { useWindowSize } from '@vueuse/core'
import { computed } from 'vue'

const { width } = useWindowSize()

/**
 * Returns true, if the screen size is currently below 956px
 */
export const IS_TABLET = computed(() => {
  return width.value <= 956
})
