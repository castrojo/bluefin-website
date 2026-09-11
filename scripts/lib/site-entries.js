import { resolve } from 'node:path'

/**
 * Declared HTML entries for the multi-page Vite application.
 *
 * Each entry specifies:
 * - name: the chunk/input key passed to rollupOptions.input
 * - html: the repository-relative path to the HTML entrypoint
 */
export const siteEntries = [
  { name: 'main', html: 'index.html' },
  { name: 'testing', html: 'public/testing.html' },
  { name: 'dakota', html: 'dakota/index.html' },
  { name: 'server', html: 'server/index.html' },
  { name: 'wolves', html: 'wolves/index.html' },
  { name: 'wolves/experience', html: 'wolves/experience/index.html' },
]

/**
 * Builds the rollupOptions.input dictionary mapping entry names to absolute file paths.
 *
 * @param {string} rootDir
 * @returns {Record<string, string>}
 */
export function createRollupInput(rootDir) {
  const input = {}
  for (const entry of siteEntries) {
    input[entry.name] = resolve(rootDir, entry.html)
  }
  return input
}

/**
 * Derives the set of directory paths that should redirect extension-less requests
 * to their trailing-slash form during development (e.g. `/wolves` -> `/wolves/`).
 *
 * A directory entry is structurally defined as any entry whose html file ends in `/index.html`
 * (excluding the root `index.html`), formatted as `/<directory-path>`.
 *
 * @returns {Set<string>}
 */
export function createDirectoryEntryPaths() {
  const paths = new Set()
  for (const entry of siteEntries) {
    if (entry.html !== 'index.html' && entry.html.endsWith('/index.html')) {
      const dirPath = `/${entry.html.slice(0, -'/index.html'.length)}`
      paths.add(dirPath)
    }
  }
  return paths
}
