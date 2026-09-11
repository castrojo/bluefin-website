import { describe, expect, it } from 'vitest'
import { wolvesRelease } from '../data/wolves-story'
import { getArtifactsForChapter, getChapterForPage, getNewArtifactIds } from '../utils/wolvesStory'

describe('wolves story manifest', () => {
  it('assigns every comic page to exactly one chapter', () => {
    expect(getChapterForPage(1)?.id).toBe('prologue')
    expect(getChapterForPage(15)?.id).toBe('awakening')
    expect(getChapterForPage(20)?.id).toBe('awakening')
    expect(getChapterForPage(21)?.id).toBe('awakening')
  })

  it('keeps archive artifacts in their chapter order', () => {
    expect(getArtifactsForChapter('prologue').map(artifact => artifact.id))
      .toEqual([
        'lorem-prologue-1',
        'arthur-c-clarke-1',
        'lorem-prologue-2',
        'arthur-c-clarke-2',
        'forbidden-factory',
        'jordan-adrian',
        'arthur-c-clarke-3',
        'arthur-c-clarke-4',
        'maintenance-window'
      ])
  })

  it('preserves the Jordan-Adrian dialogue as distinct metadata-backed lore', () => {
    const jordanAdrian = wolvesRelease.artifacts.find(artifact => artifact.id === 'jordan-adrian')

    expect(jordanAdrian).toMatchObject({
      channel: 'GNME-3//JORDAN//PRIVATE',
      publishedAt: '2326-07-09',
      title: 'Forbidden Factory',
    })
    expect(jordanAdrian?.body).toContain('They fight like demons.')
  })

  it('identifies artifacts added after a stored release', () => {
    expect(getNewArtifactIds('2026-07-11-r1')).toEqual([])
    expect(getNewArtifactIds('unknown-release')).toEqual(wolvesRelease.artifacts.map(artifact => artifact.id))
  })
})
