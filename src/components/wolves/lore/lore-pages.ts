// One page model for every Wolves lore surface.
//
// The lore column is a theater text display, not a document. It shows one
// complete page at a time, holds it for its reading cost, then replaces it.
// Nothing scrolls, nothing pans, and no page is split mid-thought unless it
// genuinely cannot fit on one page. The scheduler and the renderer both cost
// content with the functions below so a slot always matches what is shown.

import { splitReadableBeats } from './readable-beats'

/** Chat pages carry a speaker header, so they page smaller than prose. */
export const CHAT_PAGE_CHARACTERS = 120

/** Quotes, source fragments, and bulletins page as full prose blocks. */
export const PROSE_PAGE_CHARACTERS = 190

/**
 * Chrome each block costs on the page beyond its own text: the speaker label,
 * the block gap, and the rounding of its last line. Counted per block so a page
 * budget predicts rendered height instead of raw character count.
 */
export const BLOCK_OVERHEAD_CHARACTERS = 40

/** Floor for a page nobody in the back row should have to rush. */
export const PAGE_MINIMUM_SECONDS = 6

/** Theater reading pace, in words per second. */
const PAGE_WORDS_PER_SECOND = 3

/** Fixed cost of putting a page up and taking it down again. */
const PAGE_TRANSITION_SECONDS = 2.5

const SPEAKER_BREAK_PATTERN = /\n(?=(?:\*\*[^*]+\*\*|[A-Z0-9\-/]+(?:\s+[A-Z0-9\-/]+)*)(?:\s+\[[^\]]+\])?:|<[^>]+>)/gi
const SPEAKER_PREFIX_PATTERN = /^(?:\*\*[^*]+\*\*|[A-Z0-9\-/]+(?: [A-Z0-9\-/]+)*)(?: \[[^\]]+\])?:[ \t]*/i

/** Reading budget for one page: a fixed beat plus its word cost. */
export function estimatePageSeconds(page: string): number {
  const words = page.trim().split(/\s+/).filter(Boolean).length
  return Math.max(PAGE_MINIMUM_SECONDS, PAGE_TRANSITION_SECONDS + words / PAGE_WORDS_PER_SECOND)
}

/** Total hold cost of a page sequence. */
export function estimatePagesSeconds(pages: readonly string[]): number {
  return pages.reduce((total, page) => total + estimatePageSeconds(page), 0)
}

/**
 * Split an authored lore body into its paragraph and speaker blocks. Shared by
 * the transcript renderers and the scheduler so both count the same blocks.
 */
export function splitLoreBlocks(body: string): string[] {
  return body
    .replace(/\r\n/g, '\n')
    .replace(SPEAKER_BREAK_PATTERN, '\n\n')
    .split(/\n{2,}/)
    .map(block => block.trim())
    .filter(Boolean)
}

/**
 * Group authored blocks into pages without ever splitting a block, so markup
 * and speaker attribution stay intact. Returns block indices per page.
 */
export function groupBlockPages(
  blocks: readonly string[],
  maximumCharacters: number = PROSE_PAGE_CHARACTERS,
): number[][] {
  const pages: number[][] = []
  let page: number[] = []
  let length = 0

  for (const [index, block] of blocks.entries()) {
    const candidate = length + block.length + BLOCK_OVERHEAD_CHARACTERS
    if (page.length > 0 && candidate > maximumCharacters) {
      pages.push(page)
      page = [index]
      length = block.length + BLOCK_OVERHEAD_CHARACTERS
    }
    else {
      page.push(index)
      length = candidate
    }
  }

  if (page.length > 0) {
    pages.push(page)
  }

  return pages.length > 0 ? pages : [[]]
}

/**
 * Split any block that cannot fit a page on its own. A page never carries more
 * than one page worth of text, so nothing is clipped by the panel.
 */
export function splitOversizedBlocks(blocks: readonly string[]): string[] {
  return blocks.flatMap(block =>
    block.length + BLOCK_OVERHEAD_CHARACTERS <= PROSE_PAGE_CHARACTERS
      ? [block]
      : splitReadableBeats(block, PROSE_PAGE_CHARACTERS - BLOCK_OVERHEAD_CHARACTERS),
  )
}

/** Prose pages for a quote, bulletin, source fragment, or dossier body. */
export function loreProsePages(body: string): string[] {
  const blocks = splitOversizedBlocks(splitLoreBlocks(body))
  return groupBlockPages(blocks).map(page => page.map(index => blocks[index]!).join('\n\n'))
}

/** Chat pages: one sentence-bounded beat of one authored message per page. */
export function loreChatPages(body: string): string[] {
  return splitLoreBlocks(body).flatMap(block =>
    splitReadableBeats(block.replace(SPEAKER_PREFIX_PATTERN, '').trim(), CHAT_PAGE_CHARACTERS),
  )
}

/**
 * How many whole pages a slot can hold at a readable pace. A record never
 * shows a page it cannot hold, so no page ever flashes past the audience.
 */
export function affordablePageCount(pages: readonly string[], duration: number | undefined): number {
  if (!duration || duration <= 0) {
    return pages.length
  }

  let consumed = 0
  let affordable = 0
  for (const page of pages) {
    consumed += estimatePageSeconds(page)
    if (consumed > duration) {
      break
    }
    affordable++
  }

  return Math.max(1, affordable)
}

/**
 * Pick the page the player clock is currently inside. The last page a slot can
 * afford is held for the remainder of the slot so a record never blanks out
 * early and never replaces a page the audience has not had time to read.
 */
export function pickPageIndexForElapsed(
  pages: readonly string[],
  elapsed: number | undefined,
  duration?: number,
): number {
  const shown = pages.slice(0, affordablePageCount(pages, duration))
  if (shown.length <= 1) {
    return 0
  }

  let consumed = 0
  const position = Math.max(0, elapsed ?? 0)
  for (const [index, page] of shown.entries()) {
    consumed += estimatePageSeconds(page)
    if (position < consumed) {
      return index
    }
  }

  return shown.length - 1
}

/**
 * Select the authored blocks that belong on the currently held page. Every
 * prose lore view pages through its own blocks with this one function.
 */
export function pickBlockPage<T>(
  blocks: readonly T[],
  toText: (block: T) => string,
  elapsed: number | undefined,
  duration?: number,
  rebuild: (block: T, part: string) => T = (block, part) =>
    (typeof block === 'string' ? part as T : { ...block, text: part }),
): { index: number, pageCount: number, blocks: T[] } {
  const expanded = blocks.flatMap((block) => {
    const text = toText(block)
    if (text.length + BLOCK_OVERHEAD_CHARACTERS <= PROSE_PAGE_CHARACTERS) {
      return [block]
    }
    return splitReadableBeats(text, PROSE_PAGE_CHARACTERS - BLOCK_OVERHEAD_CHARACTERS)
      .map(part => rebuild(block, part))
  })
  const groups = groupBlockPages(expanded.map(toText))
  const pages = groups.map(group => group.map(index => toText(expanded[index]!)).join('\n\n'))
  const index = pickPageIndexForElapsed(pages, elapsed, duration)
  return {
    index,
    pageCount: pages.length,
    blocks: (groups[index] ?? []).map(blockIndex => expanded[blockIndex]!),
  }
}
