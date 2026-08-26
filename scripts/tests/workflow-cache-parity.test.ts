import { readdirSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { load } from 'js-yaml'
import { describe, expect, it } from 'vitest'

/**
 * `actions/cache` derives the cache *version* from the `path` list, not just
 * from `key`. A restore step whose path list differs from the save step's — in
 * content or in order — can never match the cache, and `restore-keys` is
 * version-scoped too, so the fallback does not save it either.
 *
 * With `fail-on-cache-miss: false` the miss is silent: the build proceeds with
 * whatever is committed and the weekly refresh keeps reporting success while
 * delivering nothing. Adding one path to the save step alone broke every
 * live-data feed exactly this way, and it was invisible to CI.
 */
const WORKFLOWS_DIR = resolve(process.cwd(), '.github/workflows')
const CACHE_KEY_PREFIX = 'website-live-data-'

interface CacheStep {
  file: string
  kind: 'save' | 'restore'
  paths: string[]
}

function collectLiveDataCacheSteps(): CacheStep[] {
  const steps: CacheStep[] = []

  for (const file of readdirSync(WORKFLOWS_DIR).filter(name => name.endsWith('.yml'))) {
    const workflow = load(readFileSync(join(WORKFLOWS_DIR, file), 'utf8')) as {
      jobs?: Record<string, { steps?: { uses?: string, with?: Record<string, string> }[] }>
    }

    for (const job of Object.values(workflow.jobs ?? {})) {
      for (const step of job.steps ?? []) {
        const uses = step.uses ?? ''
        const key = step.with?.key ?? ''
        if (!uses.includes('actions/cache') || !key.startsWith(CACHE_KEY_PREFIX)) {
          continue
        }
        steps.push({
          file,
          kind: uses.includes('/save@') ? 'save' : 'restore',
          paths: (step.with?.path ?? '').trim().split('\n').map(line => line.trim()).filter(Boolean),
        })
      }
    }
  }

  return steps
}

describe('live-data cache wiring', () => {
  const steps = collectLiveDataCacheSteps()

  it('has exactly one producer and at least one consumer', () => {
    expect(steps.filter(step => step.kind === 'save')).toHaveLength(1)
    expect(steps.filter(step => step.kind === 'restore').length).toBeGreaterThan(0)
  })

  it('uses an identical path list everywhere, order included', () => {
    const save = steps.find(step => step.kind === 'save')
    expect(save).toBeDefined()

    for (const step of steps) {
      expect(
        step.paths,
        `${step.file} (${step.kind}) must list the same cache paths, in the same order, as the save step`,
      ).toEqual(save!.paths)
    }
  })

  it('caches the back catalogue alongside the other generated feeds', () => {
    const save = steps.find(step => step.kind === 'save')!
    expect(save.paths).toContain('public/experiences')
    expect(save.paths).toContain('public/flickr-photos.json')
  })

  it('caches the SBOM audit alongside the other generated feeds', () => {
    const save = steps.find(step => step.kind === 'save')!
    expect(save.paths).toContain('.cache/website-live-data/sbom-audit.json')
  })
})
