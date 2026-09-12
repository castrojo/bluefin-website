import type { PresentationProfile } from '../config/experience-manifest'
import type { SoundtrackTrack } from '../data/wolves-soundtrack'
import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import { wallpapers } from '../components/wolves/wallpapers-list'
import WolvesComicReader from '../components/wolves/WolvesComicReader.vue'
import { CINEMATIC_SEGMENTS } from '../config/wolves-cinematic'
import { bazziteArtworkWallpapers, ublueArtworkWallpapers } from '../data/artwork-wallpapers'
import { backCatalogueCharacters } from '../data/back-catalogue-characters'
import { wolvesComicHeroShots } from '../data/wolves-comic-hero-shots'
import { DIRECTORS_CUT_FINALE_START } from '../data/wolves-directors-cut-slides'
import { ghostsInTheMistOpeningSlide } from '../data/wolves-gallery-featured'
import { TRACK_ZERO_SLIDE_MINIMUM_HOLD_SECONDS } from '../data/wolves-slide-preload'
import {
  TRACK_ZERO_BEAT_TIMES,
  TRACK_ZERO_SECTIONS,
  TRACK_ZERO_TEMPO_PICKUPS,
} from '../data/wolves-track-zero-beats'
import {
  hikari2SlideId,
  hikari2TrackZeroWindow,
  hikariSlideId,
  hikariTrackZeroWindow,
  jonoBaconSlideId,
  jonoBaconTrackZeroWindow,
  jorgeBluefinSlideId,
  jorgeBluefinTrackZeroWindow,
  kyleSlideId,
  kyleTrackZeroWindow,
  lauraSlideId,
  lauraTrackZeroWindow,
  marinaMooreSlideId,
  marinaMooreTrackZeroWindow,
  rezaContributorSlideId,
  rezaContributorTrackZeroWindow,
  shermanM2CompositeSlideId,
  shermanM2CompositeTrackZeroWindow,
  topheeSlideId,
  topheeTrackZeroWindow,
  trackZeroFastFinalePhotoIds,
} from '../data/wolves-track-zero-slides'
import { WOLVES_DIRECTORS_CUT_PROFILE_ID, WOLVES_STANDARD_PROFILE_ID } from '../stores/cinematic'
import { isShowcaseSlide, slideAspectFromNaturalSize } from '../utils/slide-showcase'

const source = {
  provider: 'youtube',
  playlistId: '123',
  playlistUrl: 'https://www.youtube.com/playlist?list=123',
  musicUrl: 'https://music.youtube.com/playlist?list=123',
  spotifyUri: null,
}

const coverTrack: SoundtrackTrack = {
  id: 'track0',
  title: 'Cover Track',
  artist: 'Artist 0',
  artwork: 'wolves-artwork/track0.jpg',
  youtubeVideoId: '0',
}

const galleryPhotos = [
  { id: 'photo-a', server: '1', secret: 'a', title: 'Photo A' },
  { id: 'photo-b', server: '2', secret: 'b', title: 'Photo B' },
  { id: 'photo-c', server: '3', secret: 'c', title: 'Photo C' },
]

function mockGalleryData(tracks = [coverTrack], flickrResponse = new Response(JSON.stringify(galleryPhotos))) {
  vi.stubGlobal('fetch', vi.fn((url: string) => {
    if (url.includes('wolves-playlist.json')) {
      return Promise.resolve(new Response(JSON.stringify({ source, tracks })))
    }
    if (url.includes('flickr-photos.json')) {
      return Promise.resolve(flickrResponse.clone())
    }
    return Promise.resolve(new Response(JSON.stringify({})))
  }))
}

function galleryCaption(wrapper: ReturnType<typeof mount>) {
  return wrapper.get('.flickr-caption').text()
}

function galleryCrossfadeDuration(wrapper: ReturnType<typeof mount>) {
  const duration = wrapper.get('.flickr-gallery-wrapper').attributes('data-crossfade-ms')
  expect(duration).toBeDefined()
  return Number(duration)
}

function activeTimelineImage(wrapper: ReturnType<typeof mount>) {
  const activeLayer = wrapper.findAll('.flickr-photo-layer')
    .find(layer => (layer.attributes('style') ?? '').includes('z-index: 2'))
  const img = activeLayer?.find('.flickr-img')
  return img?.exists() ? img.attributes('src') : undefined
}

/**
 * Drive the transport clock forward. The component only swaps the visible
 * slide once the incoming image has decoded (the decode gate), which is
 * asynchronous — so flushing is part of advancing, not an optional extra.
 */
async function advanceTo(wrapper: ReturnType<typeof mount>, playlistCurrentTime: number) {
  await wrapper.setProps({ playlistCurrentTime })
  await flushPromises()
}

describe('wolvesComicReader', () => {
  // jsdom never fires image.onload, so the component's decode gate would hold
  // every slide swap forever and time-based assertions would observe nothing.
  // Fire the load event automatically, the way a real browser does.
  class AutoImage {
    onload: (() => void) | null = null
    onerror: (() => void) | null = null
    fetchPriority = 'auto'
    private value = ''

    set src(next: string) {
      this.value = next
      queueMicrotask(() => this.onload?.())
    }

    get src() {
      return this.value
    }

    decode() {
      return Promise.resolve()
    }
  }

  beforeEach(() => {
    vi.stubGlobal('Image', AutoImage)
    mockGalleryData()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('renders the static cover before the soundtrack starts', () => {
    const wrapper = mount(WolvesComicReader)

    expect(wrapper.find('.cover-container img').attributes('src')).toContain('color-with-bluefin-cover.webp')
  })

  it('advances the generic album slideshow by playback time', async () => {
    const wrapper = mount(WolvesComicReader, {
      props: {
        trackIndex: 0,
        playlistCurrentTime: 0,
        experienceId: 'album-test',
        wolvesExperience: false,
      },
    })
    await flushPromises()

    expect(wrapper.classes()).toContain('comic-reader-section--fast-crossfade')
    const firstSlide = activeTimelineImage(wrapper)
    await wrapper.setProps({ playlistCurrentTime: 128 })
    await flushPromises()

    expect(activeTimelineImage(wrapper)).not.toBe(firstSlide)
  })

  it('disables backdrop filters on catalogue slideshow surfaces', () => {
    const source = readFileSync(resolve(process.cwd(), 'src/components/wolves/WolvesComicReader.vue'), 'utf8')

    expect(source).toMatch(
      /\.comic-reader-section--fast-crossfade[\s\S]*?\.comic-viewport[\s\S]*?backdrop-filter: none/,
    )
  })

  it('cuts Track 0 on measured beats at each authored tempo pickup', async () => {
    const wrapper = mount(WolvesComicReader, {
      props: {
        trackIndex: 0,
        playlistCurrentTime: 0,
      },
    })

    await flushPromises()

    const slides = (wrapper.vm as any).timelineSlides as Array<{ startTime: number, endTime: number }>
    for (const pickup of Object.values(TRACK_ZERO_TEMPO_PICKUPS)) {
      const measuredCut = TRACK_ZERO_BEAT_TIMES.reduce((nearest, beat) =>
        Math.abs(beat - pickup) < Math.abs(nearest - pickup) ? beat : nearest)
      const cutIndex = slides.findIndex(slide => Math.abs(slide.endTime - measuredCut) < 0.001)

      expect(cutIndex, `missing measured cut at ${pickup}s`).toBeGreaterThanOrEqual(0)
      expect(slides[cutIndex + 1]?.startTime).toBe(slides[cutIndex].endTime)
    }
  })

  it('holds the bridge slide across 4:05 until the 4:08 narrative cut', async () => {
    const wrapper = mount(WolvesComicReader, {
      props: {
        trackIndex: 0,
        playlistCurrentTime: 0,
      },
    })
    await flushPromises()

    const slides = (wrapper.vm as any).timelineSlides as Array<{ startTime: number, endTime: number }>
    const bridgeHold = slides.find(slide => slide.startTime < 245.830 && slide.endTime === 247.594)

    expect(bridgeHold).toBeDefined()
  })

  it('does not render manual page navigation', () => {
    const wrapper = mount(WolvesComicReader, {
      props: {
        trackIndex: 0,
        playlistCurrentTime: 180,
      },
    })

    expect(wrapper.find('button[aria-label="Previous page"]').exists()).toBe(false)
    expect(wrapper.find('button[aria-label="Next page"]').exists()).toBe(false)
  })

  it('enforces and codifies the alignment of jorge and bketelsen images during the thesis sequence', async () => {
    const wrapper = mount(WolvesComicReader, {
      props: {
        trackIndex: 0,
        playlistCurrentTime: 346, // "We've got your back." phase (Jorge Castro)
      },
    })

    // At 346s, the active slide should correspond to Jorge Castro (kubecon-54927705495.webp)
    expect(wrapper.find('.flickr-img').attributes('src')).toContain('kubecon-54927705495.webp')

    // Set time to 351s, the active slide should correspond to bketelsen.webp
    await wrapper.setProps({ playlistCurrentTime: 351 }) // "We are Universal Blue." phase
    await flushPromises()

    // Check that one of the buffered/visible layers contains bketelsen.webp
    const srcs = wrapper.findAll('.flickr-img').map(el => el.attributes('src') || '')
    expect(srcs.some(src => src.includes('bketelsen.webp'))).toBe(true)
  })

  it('enforces and codifies the alignment of the heart picture at 5:21', async () => {
    const wrapper = mount(WolvesComicReader, {
      props: {
        trackIndex: 0,
        playlistCurrentTime: 321, // Exactly 5:21 on Track 0
      },
    })
    await wrapper.vm.$nextTick()

    // At 321s (5:21), the active slide should correspond to the heart picture (kubecon-55168460993.webp)
    const srcs = wrapper.findAll('.flickr-img').map(el => el.attributes('src') || '')
    expect(srcs.some(src => src.includes('kubecon-55168460993.webp'))).toBe(true)
  })

  it('locks DN 013 to the Howl accent opening the build-up at 276.944s', async () => {
    const wrapper = mount(WolvesComicReader, {
      props: {
        trackIndex: 0,
        playlistCurrentTime: 277, // Just past the buildStart beat (the "Howl!")
      },
    })
    await wrapper.vm.$nextTick()

    const srcs = wrapper.findAll('.flickr-img').map(el => el.attributes('src') || '')
    expect(srcs.some(src => src.includes('kubecon-55177109118.webp'))).toBe(true)
  })

  it('holds the Maintainer Summit finale image after the paced barrage through Track 0 completion', async () => {
    const wrapper = mount(WolvesComicReader, {
      props: {
        trackIndex: 0,
        playlistCurrentTime: 414.801,
      },
    })

    expect(activeTimelineImage(wrapper)).toContain('kubecon-55164466314.webp')

    await wrapper.setProps({ playlistCurrentTime: 422.99 })
    expect(activeTimelineImage(wrapper)).toContain('kubecon-55164466314.webp')
  })

  it('no longer schedules Collapse in the Track 0 wallpaper rotation', () => {
    // bluefin-collapse-day/night.webp moved out of the live rotation and into
    // public/wolves-intro/ for exclusive use by the new Prologue segment.
    const collapse = wallpapers.find(wallpaper => wallpaper.name === 'bluefin-collapse')

    expect(collapse).toBeUndefined()
  })

  it('keeps the first 20 seconds of Track 0 unchanged since the Collapse removal', async () => {
    const wrapper = mount(WolvesComicReader, {
      props: {
        trackIndex: 0,
        playlistCurrentTime: 0,
      },
    })

    expect(activeTimelineImage(wrapper)).toContain('bluefin-prey-day.webp')

    await advanceTo(wrapper, 8.4)
    expect(activeTimelineImage(wrapper)).toContain('bluefin-prey-day.webp')

    await advanceTo(wrapper, 14.99)
    expect(activeTimelineImage(wrapper)).toContain('bluefin-tenacious-day.webp')

    await advanceTo(wrapper, 16.8)
    expect(activeTimelineImage(wrapper)).toContain('bluefin-tenacious-day.webp')

    await advanceTo(wrapper, 19.99)
    expect(activeTimelineImage(wrapper)).toContain('bluefin-tenacious-day.webp')
  })

  it('keeps the authored Jono Bacon, Marina Moore, and Bluefin group Track 0 sequence', async () => {
    const jonoPath = 'wolves/people/interview-jono-bacon-cult-psychology-kubernetes.webp'
    const marinaPath = 'wolves/people/kubecon-55168684055.webp'
    const shermanM2Path = 'wolves/people/sherman-m2.webp'
    const kylePath = 'wolves/people/NOT John Bazzite.jpg'
    const hikariPath = 'wolves/people/hikari.JPG'
    const hikari2Path = 'wolves/people/hikari2.JPG'
    const jorgePath = 'wolves/people/jorge-bluefin.webp'
    const wrapper = mount(WolvesComicReader, {
      props: {
        trackIndex: 0,
        playlistCurrentTime: 167.8,
      },
    })

    expect(activeTimelineImage(wrapper)).toContain(jonoPath)

    await advanceTo(wrapper, jonoBaconTrackZeroWindow.endTime - 0.001)
    expect(activeTimelineImage(wrapper)).toContain(jonoPath)

    await advanceTo(wrapper, marinaMooreTrackZeroWindow.startTime)
    expect(activeTimelineImage(wrapper)).toContain(marinaPath)
    expect(galleryCaption(wrapper)).toContain('Marina Moore')

    await advanceTo(wrapper, marinaMooreTrackZeroWindow.endTime - 0.001)
    expect(activeTimelineImage(wrapper)).toContain(marinaPath)

    await advanceTo(wrapper, shermanM2CompositeTrackZeroWindow.startTime)
    expect(activeTimelineImage(wrapper)).toContain(shermanM2Path)

    await advanceTo(wrapper, 180.038)
    expect(activeTimelineImage(wrapper)).toContain(shermanM2Path)

    await advanceTo(wrapper, 180.039)
    expect(activeTimelineImage(wrapper)).toContain(shermanM2Path)

    await advanceTo(wrapper, shermanM2CompositeTrackZeroWindow.endTime - 0.001)
    expect(activeTimelineImage(wrapper)).toContain(shermanM2Path)

    await advanceTo(wrapper, kyleTrackZeroWindow.startTime)
    expect(activeTimelineImage(wrapper)).toContain(kylePath)

    await advanceTo(wrapper, kyleTrackZeroWindow.endTime - 0.001)
    expect(activeTimelineImage(wrapper)).toContain(kylePath)

    await advanceTo(wrapper, hikariTrackZeroWindow.startTime)
    expect(activeTimelineImage(wrapper)).toContain(hikariPath)

    await advanceTo(wrapper, hikariTrackZeroWindow.endTime - 0.001)
    expect(activeTimelineImage(wrapper)).toContain(hikariPath)

    await advanceTo(wrapper, hikari2TrackZeroWindow.startTime)
    expect(activeTimelineImage(wrapper)).toContain(hikari2Path)

    await advanceTo(wrapper, hikari2TrackZeroWindow.endTime - 0.001)
    expect(activeTimelineImage(wrapper)).toContain(hikari2Path)

    await advanceTo(wrapper, jorgeBluefinTrackZeroWindow.startTime)
    expect(activeTimelineImage(wrapper)).toContain(jorgePath)

    await advanceTo(wrapper, jorgeBluefinTrackZeroWindow.endTime - 0.001)
    expect(activeTimelineImage(wrapper)).toContain(jorgePath)

    await advanceTo(wrapper, jorgeBluefinTrackZeroWindow.endTime)
    expect(activeTimelineImage(wrapper)).not.toContain(jorgePath)
  })

  it('ignores Track 0 BPM metadata and keeps authored Hikari windows', async () => {
    mockGalleryData([{
      ...coverTrack,
      bpm: 300,
      phraseBeats: 1,
      fadeDuration: 100,
    }])
    const wrapper = mount(WolvesComicReader, {
      props: {
        trackIndex: 0,
        playlistCurrentTime: hikariTrackZeroWindow.startTime,
      },
    })
    await flushPromises()

    expect(activeTimelineImage(wrapper)).toContain('wolves/people/hikari.JPG')
    expect(galleryCrossfadeDuration(wrapper)).toBeCloseTo(612, 5)

    await advanceTo(wrapper, hikariTrackZeroWindow.endTime - 0.001)
    expect(activeTimelineImage(wrapper)).toContain('wolves/people/hikari.JPG')

    await advanceTo(wrapper, hikari2TrackZeroWindow.startTime)
    expect(activeTimelineImage(wrapper)).toContain('wolves/people/hikari2.JPG')
    expect(galleryCrossfadeDuration(wrapper)).toBeCloseTo(612, 5)
  })

  it('changes the slideshow on the 4:08 scene cut', async () => {
    const wrapper = mount(WolvesComicReader, {
      props: {
        trackIndex: 0,
        playlistCurrentTime: 247.592,
      },
    })

    const beforeCut = activeTimelineImage(wrapper)
    expect(beforeCut).toBeTruthy()

    await advanceTo(wrapper, 247.596)

    expect(activeTimelineImage(wrapper)).not.toBe(beforeCut)
  })

  it('renders Jono Bacon’s Cult Psychology title as a theater banner', async () => {
    const wrapper = mount(WolvesComicReader, {
      props: {
        trackIndex: 0,
        playlistCurrentTime: 167.8,
      },
    })

    const banner = wrapper.get('.wallpaper-theater-caption.is-title-only')
    expect(banner.get('.wallpaper-theater-caption-title').text()).toBe('Jono Bacon, Stateshift — "The Cult Psychology of Kubernetes"')
    expect(wrapper.find('.flickr-caption').exists()).toBe(false)

    const archiveWrapper = mount(WolvesComicReader)
    const archiveSlides = (archiveWrapper.vm as any).shuffledWallpapers as Array<{ name?: string }>
    const jonoSlideIndex = archiveSlides.findIndex(slide => slide.name === 'wolves/people/interview-jono-bacon-cult-psychology-kubernetes.webp')
    ;(archiveWrapper.vm as any).page = jonoSlideIndex + 2
    await nextTick()

    expect(archiveWrapper.get('.wallpaper-theater-caption.is-title-only').text()).toContain('The Cult Psychology of Kubernetes')
  })

  it('keeps the music-authoritative Track 0 selection unique', async () => {
    const wrapper = mount(WolvesComicReader, {
      props: {
        trackIndex: 0,
        playlistCurrentTime: 0,
      },
    })
    const shownImages: string[] = []
    let previousImage = ''
    const reservedPaths = [...trackZeroFastFinalePhotoIds]
    const reservedFirstSeenAt = new Map<string, number>()
    const missingReservedPaths = reservedPaths.filter(path => !wallpapers.some(wallpaper =>
      wallpaper.name === path || wallpaper.dayName === path || wallpaper.nightName === path,
    ))

    const slides = (wrapper.vm as any).timelineSlides as Array<{ startTime: number, endTime: number }>
    for (const slide of slides) {
      await wrapper.setProps({ playlistCurrentTime: slide.startTime })
      const image = activeTimelineImage(wrapper) ?? ''
      if (image !== previousImage) {
        shownImages.push(image)
      }
      const reservedPath = reservedPaths.find(path => image.includes(path))
      if (reservedPath && !reservedFirstSeenAt.has(reservedPath)) {
        reservedFirstSeenAt.set(reservedPath, slide.startTime)
      }
      previousImage = image
    }

    expect(new Set(shownImages).size).toBe(shownImages.length)
    expect(new Set(shownImages).size).toBeLessThan(wallpapers.length + missingReservedPaths.length)
    expect(shownImages.some(image => image.includes('wolves/showcase/claw.gif'))).toBe(false)
    expect([...reservedFirstSeenAt.values()].every(time => time >= 359 && time < 408.2)).toBe(true)
  }, 15000)

  it('keeps every photo in a later-track shuffle available only once', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    mockGalleryData([
      coverTrack,
      {
        id: 'later-track-one',
        title: 'Later Track One',
        artist: 'Artist 1',
        artwork: 'wolves-artwork/later-track-one.jpg',
        youtubeVideoId: '1',
        bpm: 120,
        phraseBeats: 8,
      },
      {
        id: 'later-track-two',
        title: 'Later Track Two',
        artist: 'Artist 2',
        artwork: 'wolves-artwork/later-track-two.jpg',
        youtubeVideoId: '2',
        bpm: 120,
        phraseBeats: 8,
      },
    ])
    const wrapper = mount(WolvesComicReader, {
      props: { trackIndex: 0, playlistCurrentTime: 0 },
    })
    await flushPromises()
    await wrapper.setProps({ trackIndex: 1, playlistCurrentTime: 0 })
    await flushPromises()

    const firstTrackStart = galleryCaption(wrapper)
    expect(firstTrackStart).toContain('CNCF STREAM //')

    await advanceTo(wrapper, 10)
    const secondTrackOnePhoto = galleryCaption(wrapper)
    await advanceTo(wrapper, 0)
    expect(galleryCaption(wrapper)).toBe(firstTrackStart)

    await wrapper.setProps({ trackIndex: 2, playlistCurrentTime: 10 })
    await flushPromises()
    await advanceTo(wrapper, 0)
    expect(galleryCaption(wrapper)).not.toBe(firstTrackStart)
    expect(galleryCaption(wrapper)).not.toBe(secondTrackOnePhoto)
  })

  it('opens Ghosts In The Mist with the held MN047 Jorge tribute', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const [jorgeQuotePartOne, jorgeQuotePartTwo, jorgeQuotePartThree]
      = ghostsInTheMistOpeningSlide.descriptionParts.map(part => part.split('\n\n').map(paragraph => paragraph.trim()))
    mockGalleryData([
      coverTrack,
      {
        id: 'ghosts-in-the-mist',
        title: 'Ghosts In The Mist',
        artist: 'Unleash The Archers',
        artwork: 'wolves-artwork/ghosts.jpg',
        youtubeVideoId: '1',
        bpm: 100,
        phraseBeats: 32,
      },
    ], new Response(JSON.stringify([
      ...galleryPhotos,
      {
        id: '55164222671',
        server: '65535',
        secret: '32d7ace307',
        title: 'KC+CNC_EU_260322_MaintainerSummitBreakouts_MN_047',
      },
    ])))
    const wrapper = mount(WolvesComicReader, {
      props: { trackIndex: 1, playlistCurrentTime: 0 },
    })
    await flushPromises()

    expect(activeTimelineImage(wrapper)).toContain('55164222671_32d7ace307_c.jpg')
    expect(wrapper.find('.flickr-photo-layer[style*="z-index: 2"] .flickr-img').attributes('style')).toContain('object-position: center top')
    expect(wrapper.get('.theater-guardian-name').text()).toBe('Jorge Castro')
    expect(wrapper.get('.theater-guardian-class').text()).toBe('Harbinger Titan')
    expect(wrapper.get('.theater-guardian-title').text()).toContain('Upender of Antipatterns')
    expect(wrapper.get('.theater-guardian-title').text()).toContain('The First Disciple')
    expect(wrapper.findAll('.wallpaper-theater-caption-body').map(paragraph => paragraph.text())).toEqual(jorgeQuotePartOne)

    await wrapper.setProps({ playlistCurrentTime: 19.3 })
    expect(activeTimelineImage(wrapper)).toContain('55164222671_32d7ace307_c.jpg')
    expect(wrapper.findAll('.wallpaper-theater-caption-body').map(paragraph => paragraph.text())).toEqual(jorgeQuotePartTwo)

    await wrapper.setProps({ playlistCurrentTime: 32.3 })
    expect(activeTimelineImage(wrapper)).toContain('55164222671_32d7ace307_c.jpg')
    expect(wrapper.findAll('.wallpaper-theater-caption-body').map(paragraph => paragraph.text())).toEqual(jorgeQuotePartThree)

    await wrapper.setProps({ playlistCurrentTime: 48.399 })
    expect(activeTimelineImage(wrapper)).toContain('55164222671_32d7ace307_c.jpg')

    await wrapper.setProps({ playlistCurrentTime: 48.4 })
    const laterPhotos = (wrapper.vm as any).laterTrackPhotos as Array<{ id: string, isLocal: boolean }>
    expect(laterPhotos.every(photo => !photo.isLocal)).toBe(true)
  })

  it('keeps later-track contributor candidates unique', async () => {
    const photos = [
      { id: 'photo-a', server: '1', secret: 'a', title: 'Photo A' },
      { id: 'photo-b', server: '1', secret: 'b', title: 'Photo B' },
      { id: 'photo-c', server: '1', secret: 'c', title: 'Photo C' },
    ]
    mockGalleryData([
      coverTrack,
      {
        id: 'later-track',
        title: 'Later Track',
        artist: 'Artist',
        artwork: 'wolves-artwork/later-track.jpg',
        youtubeVideoId: '1',
        bpm: 120,
        phraseBeats: 8,
      },
    ], new Response(JSON.stringify(photos)))
    const wrapper = mount(WolvesComicReader, {
      props: { trackIndex: 1, playlistCurrentTime: 0 },
    })
    await flushPromises()

    const ids = ((wrapper.vm as any).shuffledLaterTrackPhotos as Array<{ id: string }>)
      .map(photo => photo.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('excludes Track 0 People Flickr photos from later tracks', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const trackZeroPhoto = wallpapers.find(wallpaper =>
      wallpaper.name?.startsWith('wolves/people/') && /\d{8,}/.test(wallpaper.name),
    )
    const trackZeroPhotoId = trackZeroPhoto?.name?.match(/\d{8,}/)?.[0]
    if (!trackZeroPhotoId) {
      throw new Error('Expected a Track 0 Flickr-backed People photo')
    }

    const photos = [
      {
        id: 'new-photo-0',
        server: '1',
        secret: '0',
        title: 'New photo 0',
      },
      {
        id: trackZeroPhotoId,
        server: '1',
        secret: 'duplicate',
        title: 'Track 0 duplicate',
      },
      ...Array.from({ length: 99 }, (_, index) => ({
        id: `new-photo-${index + 1}`,
        server: '1',
        secret: String(index + 1),
        title: `New photo ${index + 1}`,
      })),
    ]
    mockGalleryData([
      coverTrack,
      {
        id: 'later-track',
        title: 'Later Track',
        artist: 'Artist',
        artwork: 'wolves-artwork/later-track.jpg',
        youtubeVideoId: '1',
        bpm: 120,
        phraseBeats: 5,
      },
    ], new Response(JSON.stringify(photos)))
    const wrapper = mount(WolvesComicReader, {
      props: { trackIndex: 0, playlistCurrentTime: 0 },
    })
    await flushPromises()
    await wrapper.setProps({ trackIndex: 1, playlistCurrentTime: 0 })

    expect(galleryCaption(wrapper)).not.toContain('Track 0 duplicate')
  })

  it('does not carry Track 1 people into later authored Wolves tracks when Flickr is unavailable', async () => {
    mockGalleryData(
      [
        coverTrack,
        {
          id: 'later-track',
          title: 'Later Track',
          artist: 'Artist',
          artwork: 'wolves-artwork/later-track.jpg',
          youtubeVideoId: '1',
          bpm: 120,
          phraseBeats: 8,
        },
      ],
      new Response('Flickr unavailable', { status: 503 }),
    )
    const wrapper = mount(WolvesComicReader, {
      props: { trackIndex: 1, playlistCurrentTime: 0 },
    })
    await flushPromises()

    expect(wrapper.find('.flickr-caption').exists()).toBe(false)
  })

  // Blurring a surface that repaints a full-size image on every slide change is
  // what produced the hitch on Ghosts In The Mist onward. The standard show's
  // Track 0 is the one segment whose look is locked, so it keeps its authored
  // blur; the Director's Cut Track 0 runs a lock-free measured-beat montage and
  // takes the static-background treatment with the later tracks.
  describe('slide crossfade blur', () => {
    function crossfadeClass(trackIndex: number, wolvesExperience: boolean, presentationProfile?: PresentationProfile) {
      mockGalleryData()
      const wrapper = mount(WolvesComicReader, {
        props: { trackIndex, trackId: '1', playlistCurrentTime: 1, wolvesExperience, presentationProfile },
      })
      return wrapper.get('#comic-reader').classes()
    }

    it('keeps the authored blur on the primary song', () => {
      expect(crossfadeClass(0, true)).not.toContain('comic-reader-section--fast-crossfade')
      expect(crossfadeClass(0, true, WOLVES_STANDARD_PROFILE_ID)).not.toContain('comic-reader-section--fast-crossfade')
    })

    it('drops the blur from Ghosts In The Mist onward', () => {
      for (const trackIndex of [1, 2, 3, 4, 5, 6]) {
        expect(crossfadeClass(trackIndex, true)).toContain('comic-reader-section--fast-crossfade')
      }
    })

    it('drops the blur across every back-catalogue segment', () => {
      for (const trackIndex of [0, 1, 2]) {
        expect(crossfadeClass(trackIndex, false)).toContain('comic-reader-section--fast-crossfade')
        expect(crossfadeClass(trackIndex, false, 'generic')).toContain('comic-reader-section--fast-crossfade')
      }
    })

    // The blur was excluded from Track 0 because the standard cut does not run
    // a rapid gallery crossfade there. The Director's Cut does — its Track 0 is
    // the fastest schedule in the show — so the exclusion cannot be keyed to
    // `trackIndex !== 0` alone without putting blur work back on the slide
    // change path for the Director's montage.
    it('drops the blur on the director\'s cut Track 0', () => {
      expect(crossfadeClass(0, true, WOLVES_DIRECTORS_CUT_PROFILE_ID))
        .toContain('comic-reader-section--fast-crossfade')
    })

    it('leaves the director\'s cut later tracks and the standard show alone', () => {
      for (const trackIndex of [1, 2, 3]) {
        expect(crossfadeClass(trackIndex, true, WOLVES_DIRECTORS_CUT_PROFILE_ID))
          .toContain('comic-reader-section--fast-crossfade')
        expect(crossfadeClass(trackIndex, true, WOLVES_STANDARD_PROFILE_ID))
          .toContain('comic-reader-section--fast-crossfade')
      }
    })
  })

  // The caption derivation withholds a caption for titles that encode nothing,
  // and 25 photos in the Wolves later-track rotation carry camera-roll names.
  // Applying it to the frozen show would take the CNCF credit off screen with
  // them, so the derivation belongs to the back catalogue only.
  it('keeps raw photo titles and the CNCF credit in the frozen Wolves show', async () => {
    const cameraRollPhotos = [
      { id: 'photo-a', server: '1', secret: 'a', title: 'A7V06139' },
      { id: 'photo-b', server: '2', secret: 'b', title: 'CRJ07242' },
    ]
    mockGalleryData([coverTrack, {
      id: 'later-track-one',
      title: 'Later Track One',
      artist: 'Artist 1',
      artwork: 'wolves-artwork/later-track-one.jpg',
      youtubeVideoId: '1',
    }], new Response(JSON.stringify(cameraRollPhotos)))

    const wrapper = mount(WolvesComicReader, {
      props: { trackIndex: 1, trackId: '1', playlistCurrentTime: 1 },
    })
    await flushPromises()
    await nextTick()

    const caption = wrapper.find('.flickr-caption')
    expect(caption.exists()).toBe(true)
    expect(caption.text()).toContain('CNCF STREAM //')
    expect(caption.text()).toMatch(/A7V06139|CRJ07242/)
  })

  it('switches an active later track to Flickr when the cache finishes loading', async () => {
    // The later-track gallery shuffles with Math.random; pin it so the
    // per-track photo assertions below are deterministic.
    vi.spyOn(Math, 'random').mockReturnValue(0.9999)
    const tracks = [
      coverTrack,
      {
        id: 'later-track-one',
        title: 'Later Track One',
        artist: 'Artist 1',
        artwork: 'wolves-artwork/later-track-one.jpg',
        youtubeVideoId: '1',
      },
      {
        id: 'later-track-two',
        title: 'Later Track Two',
        artist: 'Artist 2',
        artwork: 'wolves-artwork/later-track-two.jpg',
        youtubeVideoId: '2',
      },
    ]
    let resolveFlickr!: (response: Response) => void
    const flickrResponse = new Promise<Response>((resolve) => {
      resolveFlickr = resolve
    })
    vi.stubGlobal('fetch', vi.fn((url: string) => {
      if (url.includes('wolves-playlist.json')) {
        return Promise.resolve(new Response(JSON.stringify({ source, tracks })))
      }
      if (url.includes('flickr-photos.json')) {
        return flickrResponse
      }
      return Promise.resolve(new Response(JSON.stringify({})))
    }))

    const wrapper = mount(WolvesComicReader, {
      props: { trackIndex: 1, playlistCurrentTime: 0 },
    })
    await flushPromises()

    // Authored Wolves tracks have no local fallback gallery: while the summit
    // feed is still loading there is nothing to show.
    expect(wrapper.find('.flickr-caption').exists()).toBe(false)

    resolveFlickr(new Response(JSON.stringify(galleryPhotos)))
    await flushPromises()
    expect(wrapper.find('.flickr-caption').exists()).toBe(true)
    expect(((wrapper.vm as any).laterTrackPhotos as Array<{ id: string }>).some(photo => photo.id === 'photo-a')).toBe(true)

    await wrapper.setProps({ trackIndex: 2, playlistCurrentTime: 0 })
    await flushPromises()
    expect(((wrapper.vm as any).laterTrackPhotos as Array<{ id: string }>).some(photo => photo.id === 'photo-b')).toBe(true)
  })

  it('doubles short BPM beat groups to a 10-second hold', async () => {
    mockGalleryData([
      coverTrack,
      {
        id: 'fast-phrases',
        title: 'Fast Phrases',
        artist: 'Artist',
        artwork: 'wolves-artwork/fast-phrases.jpg',
        youtubeVideoId: '1',
        bpm: 120,
        phraseBeats: 5,
        fadeDuration: 1500,
      },
    ])
    const wrapper = mount(WolvesComicReader, {
      props: { trackIndex: 1, playlistCurrentTime: 0 },
    })
    await flushPromises()

    const firstCaption = galleryCaption(wrapper)
    expect(firstCaption).toContain('//')
    await advanceTo(wrapper, 9.99)
    expect(galleryCaption(wrapper)).toBe(firstCaption)
    await advanceTo(wrapper, 10)
    expect(galleryCaption(wrapper)).not.toBe(firstCaption)
  })

  it('halves long BPM beat groups to a 6-second hold', async () => {
    mockGalleryData([
      coverTrack,
      {
        id: 'slow-phrases',
        title: 'Slow Phrases',
        artist: 'Artist',
        artwork: 'wolves-artwork/slow-phrases.jpg',
        youtubeVideoId: '2',
        bpm: 120,
        phraseBeats: 48,
        fadeDuration: 3000,
      },
    ])
    const slowWrapper = mount(WolvesComicReader, {
      props: { trackIndex: 1, playlistCurrentTime: 0 },
    })
    await flushPromises()

    const firstCaption = galleryCaption(slowWrapper)
    expect(firstCaption).toContain('//')
    await advanceTo(slowWrapper, 5.99)
    expect(galleryCaption(slowWrapper)).toBe(firstCaption)
    await advanceTo(slowWrapper, 6)
    expect(galleryCaption(slowWrapper)).not.toBe(firstCaption)
  })

  it('changes slides at the non-clamped boundary derived from BPM metadata', async () => {
    mockGalleryData([
      coverTrack,
      {
        id: 'metadata-paced',
        title: 'Metadata Paced',
        artist: 'Artist',
        artwork: 'wolves-artwork/metadata-paced.jpg',
        youtubeVideoId: '3',
        bpm: 100,
        phraseBeats: 12,
      },
    ])
    const wrapper = mount(WolvesComicReader, {
      props: { trackIndex: 1, playlistCurrentTime: 0 },
    })
    await flushPromises()

    const firstCaption = galleryCaption(wrapper)
    expect(firstCaption).toContain('//')
    await advanceTo(wrapper, 7.19)
    expect(galleryCaption(wrapper)).toBe(firstCaption)
    await advanceTo(wrapper, 7.2)
    expect(galleryCaption(wrapper)).not.toBe(firstCaption)
  })

  it.each([
    {
      id: 'fast-phrases',
      bpm: 120,
      phraseBeats: 5,
      fadeDuration: 1500,
      hold: 10,
    },
    {
      id: 'slow-phrases',
      bpm: 120,
      phraseBeats: 48,
      fadeDuration: 3000,
      hold: 6,
    },
    {
      id: 'metadata-paced',
      bpm: 100,
      phraseBeats: 12,
      fadeDuration: undefined,
      hold: 7.2,
    },
  ])('keeps the $id crossfade within one quarter of its BPM-derived hold', async ({ id, bpm, phraseBeats, fadeDuration, hold }) => {
    mockGalleryData([
      coverTrack,
      {
        id,
        title: id,
        artist: 'Artist',
        artwork: `wolves-artwork/${id}.jpg`,
        youtubeVideoId: '1',
        bpm,
        phraseBeats,
        fadeDuration,
      },
    ])
    const wrapper = mount(WolvesComicReader, {
      props: { trackIndex: 1, playlistCurrentTime: 0 },
    })
    await flushPromises()

    const firstCaption = galleryCaption(wrapper)
    expect(firstCaption).toContain('//')
    await advanceTo(wrapper, hold - 0.01)
    expect(galleryCaption(wrapper)).toBe(firstCaption)
    await advanceTo(wrapper, hold)
    expect(galleryCaption(wrapper)).not.toBe(firstCaption)
    const activeLayer = wrapper.findAll('.flickr-photo-layer')
      .find(layer => (layer.attributes('style') ?? '').includes('z-index: 2'))
    expect(activeLayer?.attributes('style')).toContain('transition: opacity')
    expect(galleryCrossfadeDuration(wrapper)).toBeLessThanOrEqual(hold * 1000 * 0.25)
  })

  it('uses the same permitted fallback cadence across equivalent mounts and subsequent slides without BPM metadata', async () => {
    mockGalleryData([
      coverTrack,
      {
        id: 'fallback-tempo',
        title: 'Fallback Tempo',
        artist: 'Artist',
        artwork: 'wolves-artwork/fallback-tempo.jpg',
        youtubeVideoId: '1',
      },
    ], new Response(JSON.stringify([
      { id: 'photo-a', server: '1', secret: 'a', title: 'Photo A' },
      { id: 'photo-b', server: '1', secret: 'b', title: 'Photo B' },
      { id: 'photo-c', server: '1', secret: 'c', title: 'Photo C' },
      { id: 'photo-d', server: '1', secret: 'd', title: 'Photo D' },
    ])))
    const firstRun = mount(WolvesComicReader, {
      props: { trackIndex: 1, playlistCurrentTime: 0 },
    })
    await flushPromises()

    const firstCaption = galleryCaption(firstRun)
    expect(firstCaption).toContain('//')

    async function findFallbackHold(wrapper: ReturnType<typeof mount>, initialCaption: string) {
      for (const hold of [7, 8, 10]) {
        await advanceTo(wrapper, hold - 0.01)
        const captionBeforeBoundary = galleryCaption(wrapper)
        await advanceTo(wrapper, hold)

        if (captionBeforeBoundary === initialCaption && galleryCaption(wrapper) !== initialCaption) {
          return hold
        }
      }

      return undefined
    }

    const firstRunHold = await findFallbackHold(firstRun, firstCaption)
    expect(firstRunHold).toBeDefined()
    expect([7, 8, 10]).toContain(firstRunHold)

    const secondRun = mount(WolvesComicReader, {
      props: { trackIndex: 1, playlistCurrentTime: 0 },
    })
    await flushPromises()
    const secondRunHold = await findFallbackHold(secondRun, galleryCaption(secondRun))
    expect(secondRunHold).toBe(firstRunHold)

    for (const slideNumber of [2, 3]) {
      await advanceTo(firstRun, firstRunHold! * slideNumber - 0.01)
      const captionBeforeBoundary = galleryCaption(firstRun)
      await advanceTo(firstRun, firstRunHold! * slideNumber)
      expect(galleryCaption(firstRun)).not.toBe(captionBeforeBoundary)
    }
  })

  it('flags unusually panoramic wallpapers to render with object-fit: cover instead of letterboxing', () => {
    // These specific assets are far wider than the ~16:9 ratio most wallpapers
    // use, so object-fit: contain (the default) letterboxes them badly. See
    // wideAspectStems in scripts/generate-wallpapers.js.
    const coverWallpapers = [
      wallpapers.find(wp => wp.name === 'wolves/wolves/bluefin-chicken.webp'),
      wallpapers.find(wp => wp.name === 'wolves/wolves/bluefin-huntress.webp'),
      wallpapers.find(wp => wp.name === 'bluefin-duality'),
      wallpapers.find(wp => wp.name === 'wolves/wolves/bluefin-lazy-days.webp'),
    ]
    for (const wallpaper of coverWallpapers) {
      expect(wallpaper, `expected a cover wallpaper`).toBeDefined()
      expect(wallpaper?.fit).toBe('cover')
    }

    // A representative normal-aspect wallpaper should keep the default (no
    // override), preserving the existing letterbox-avoidance behavior.
    const dusk = wallpapers.find(wp => wp.name === 'bluefin-dusk')
    expect(dusk).toBeDefined()
    expect(dusk?.fit).toBeUndefined()
  })

  it('includes authoritative artwork credits in local Bluefin artwork slide titles', () => {
    const expectedCredits = new Map([
      ['wolves/wolves/bluefin-chicken.webp', 'Bluefin created by Andy Frazer and Jacob Schnurr'],
      ['bluefin-duality', 'Duality (Day & Night) by Dr. Natalia Jagielska and Delphic Melody (M. Gopal)'],
      ['bluefin-dusk', 'Bluefin created by Andy Frazer and Jacob Schnurr'],
      ['wolves/wolves/bluefin-eyes.webp', 'Eyes by Dr. Natalia Jagielska and Delphic Melody (M. Gopal)'],
      ['wolves/wolves/bluefin-huntress.webp', 'Bluefin created by Andy Frazer and Jacob Schnurr'],
      ['wolves/wolves/bluefin-lazy-days.webp', 'Lazy Days by Jay Balamurugan'],
      ['bluefin-prey', 'Prey (Day & Night) by Dr. Natalia Jagielska and Delphic Melody (M. Gopal)'],
      ['bluefin-tenacious', 'Tenacious Pterosaur (Day & Night) by Dr. Natalia Jagielska and Delphic Melody (M. Gopal)'],
    ])

    for (const [name, title] of expectedCredits) {
      expect(wallpapers.find(wp => wp.name === name)?.title).toBe(title)
    }
  })

  it('renders title-only theater captions only for explicitly flagged wallpapers', async () => {
    const wallpapersWithDescription = wallpapers.filter(wp => wp.name.includes('wolves/people/') && wp.description)
    expect(wallpapersWithDescription.length, 'expected no wallpaper to carry a description after simplifying these interview captions').toBe(0)
    const jono = wallpapers.find(wp => wp.name === 'wolves/people/interview-jono-bacon-cult-psychology-kubernetes.webp')
    expect(jono?.theaterTitleOnly).toBe(true)

    // Track 0 (the opening/"guardian" video) is the only rotation that shows local People
    // wallpapers like these; later tracks only rotate remote Flickr photos.
    mockGalleryData([coverTrack])
    const wrapper = mount(WolvesComicReader, {
      props: { trackIndex: 0, playlistCurrentTime: 0 },
    })
    await flushPromises()

    await advanceTo(wrapper, 167.8)
    expect(wrapper.get('.wallpaper-theater-caption.is-title-only').findAll('.wallpaper-theater-caption-body')).toHaveLength(0)
    expect(wrapper.find('.flickr-caption').exists()).toBe(false)

    await advanceTo(wrapper, marinaMooreTrackZeroWindow.startTime)
    expect(wrapper.find('.wallpaper-theater-caption').exists()).toBe(false)
    expect(wrapper.find('.flickr-caption').exists()).toBe(true)
  })

  it('keeps the authored hero-slide metadata in generator input', () => {
    const generatorPath = resolve(process.cwd(), 'scripts/generate-wallpapers.js')
    const generator = readFileSync(generatorPath, 'utf8')

    expect(existsSync(resolve(process.cwd(), 'public/img/wallpapers/wolves/people/nova4ever.webp'))).toBe(true)
    expect(generator).toContain('\'interview-clyde-seepersad-linux-foundation\': \'Clyde Seepersad, Linux Foundation\'')
    expect(generator).toContain('\'nova4ever\': \'Jay Balamurugan\'')
    expect(generator).toContain('const bluefinGroupSlideNames = [')
    expect(generator).toContain('\'bluefin-chicken\': \'Bluefin created by Andy Frazer and Jacob Schnurr\'')
    expect(generator).toContain('\'bluefin-dusk\': \'Bluefin created by Andy Frazer and Jacob Schnurr\'')
    expect(generator).toContain('\'bluefin-huntress\': \'Bluefin created by Andy Frazer and Jacob Schnurr\'')
  })

  it('collapses byte-identical wallpaper files to a single manifest entry', () => {
    // Several shots exist on disk under both a stock feed filename and a
    // curated captioned filename; the generator must keep exactly one.
    const seen = new Map<string, string>()
    for (const wallpaper of wallpapers) {
      const names = wallpaper.type === 'daynight'
        ? [wallpaper.dayName, wallpaper.nightName]
        : [wallpaper.name]
      for (const name of names) {
        if (!name) {
          continue
        }
        const filePath = resolve(process.cwd(), 'public/img/wallpapers', name)
        const hash = createHash('md5').update(readFileSync(filePath)).digest('hex')
        const duplicateOf = seen.get(hash)
        expect(duplicateOf, `${name} is the same image as ${duplicateOf}`).toBeUndefined()
        seen.set(hash, name)
      }
    }
  }, 15000)

  it('uses the contributor-focused beat barrage from the 5:55 pickup', async () => {
    const feed = Array.from({ length: 200 }, (_, index) => ({
      id: `feed-${index}`,
      server: 's',
      secret: 'x',
      title: `Feed ${index}`,
    }))
    mockGalleryData([coverTrack], new Response(JSON.stringify(feed)))
    const wrapper = mount(WolvesComicReader, {
      props: { trackIndex: 0, playlistCurrentTime: 0 },
    })
    await flushPromises()

    const slides = (wrapper.vm as any).timelineSlides as Array<{
      id: string
      isLocal: boolean
      startTime: number
      endTime: number
      duration: number
    }>
    const barrageSlides = slides.filter(slide =>
      slide.startTime >= TRACK_ZERO_SECTIONS.bkEnd
      && slide.endTime <= TRACK_ZERO_SECTIONS.finaleStart)
    expect(barrageSlides).toHaveLength(30)
    expect(new Set(barrageSlides.map(slide => slide.id)).size).toBe(barrageSlides.length)
    expect(barrageSlides.every(slide => !slide.id.startsWith('wolves/people/cncf-'))).toBe(true)
    expect(barrageSlides[0]?.startTime).toBe(TRACK_ZERO_SECTIONS.bkEnd)
    const finaleSlide = slides.find(slide => slide.endTime === 423)
    expect(finaleSlide?.startTime).toBe(TRACK_ZERO_SECTIONS.finaleStart)

    // The later-track gallery retains its own remote photo pool.
    const laterWrapper = mount(WolvesComicReader, {
      props: { trackIndex: 1, playlistCurrentTime: 0 },
    })
    await flushPromises()
    const laterIds = new Set(
      ((laterWrapper.vm as any).laterTrackPhotos as Array<{ id: string }>).map(photo => photo.id),
    )
    expect(laterIds.size).toBeGreaterThan(0)
    expect(laterIds.size).toBeGreaterThan(0)
  })

  it('keeps Clyde out of the pre-legend barrage and out of the summit-only later-track gallery', async () => {
    // Later-track gallery policy (docs/reference/wolves-runtime.md): after the
    // Track 2 Jorge hero opening, Tracks 3-6 show only the curated Flickr
    // contributor-summit gallery — local people images never carry forward.
    mockGalleryData([coverTrack])
    const wrapper = mount(WolvesComicReader, {
      props: { trackIndex: 0, playlistCurrentTime: 0 },
    })
    await flushPromises()

    const clydeSlide = ((wrapper.vm as any).timelineSlides as Array<{ id: string, startTime: number }>)
      .find(slide => slide.id === 'wolves/people/interview-clyde-seepersad-linux-foundation.webp')
    expect(clydeSlide).toBeUndefined()
    await wrapper.setProps({ trackIndex: 1, playlistCurrentTime: 0 })
    await flushPromises()
    expect(((wrapper.vm as any).laterTrackPhotos as Array<{ id: string }>)
      .some(photo => photo.id === 'wolves/people/interview-clyde-seepersad-linux-foundation.webp')).toBe(false)
  })
})

describe('track 0 locked windows', () => {
  beforeEach(() => {
    mockGalleryData([coverTrack])
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  // Regression guard. Every slide below is authored to a fixed window in
  // wolves-track-zero-slides.ts because a title card in
  // wolves-track-zero-manifest.ts is scheduled against the same seconds. When a
  // slide is assembled with a running cursor instead of its window, or dropped
  // from a people pool entirely, the picture and its caption drift apart and
  // nothing throws. That is exactly how Tophee vanished and Reza ran 4.08s
  // early while every data-layer test stayed green.
  const lockedWindows = [
    ['jono bacon', jonoBaconSlideId, jonoBaconTrackZeroWindow],
    ['marina moore', marinaMooreSlideId, marinaMooreTrackZeroWindow],
    ['sherman m2', shermanM2CompositeSlideId, shermanM2CompositeTrackZeroWindow],
    ['kyle', kyleSlideId, kyleTrackZeroWindow],
    ['hikari', hikariSlideId, hikariTrackZeroWindow],
    ['hikari 2', hikari2SlideId, hikari2TrackZeroWindow],
    ['jorge bluefin', jorgeBluefinSlideId, jorgeBluefinTrackZeroWindow],
    ['laura', lauraSlideId, lauraTrackZeroWindow],
    ['tophee', topheeSlideId, topheeTrackZeroWindow],
    ['reza contributor', rezaContributorSlideId, rezaContributorTrackZeroWindow],
  ] as const

  it.each(lockedWindows)('places %s at its authored window', async (_name, id, window) => {
    const wrapper = mount(WolvesComicReader, {
      props: { trackIndex: 0, playlistCurrentTime: 0 },
    })
    await flushPromises()

    const slides = (wrapper.vm as any).timelineSlides as Array<{ id: string, startTime: number, endTime: number }>
    const matches = slides.filter(slide => slide.id === id)

    expect(matches, `${id} is missing from the track 0 schedule`).toHaveLength(1)
    expect(matches[0].startTime).toBeCloseTo(window.startTime, 2)
    expect(matches[0].endTime).toBeCloseTo(window.endTime, 2)
  })

  it('runs the locked people sequence back to back with no gap or overlap', async () => {
    const wrapper = mount(WolvesComicReader, {
      props: { trackIndex: 0, playlistCurrentTime: 0 },
    })
    await flushPromises()

    const slides = (wrapper.vm as any).timelineSlides as Array<{ id: string, startTime: number, endTime: number }>
    const ordered = lockedWindows.map(([, id]) =>
      slides.find(slide => slide.id === id)!)

    for (let index = 1; index < ordered.length; index += 1) {
      expect(ordered[index].startTime, `gap before ${ordered[index].id}`)
        .toBeCloseTo(ordered[index - 1].endTime, 2)
    }
  })
})

// ── Regression: resolve the playlist track by identity, not by position ────
//
// The seven segments line up 1:1 with the seven authored tracks in
// public/wolves-playlist.json. That alignment is an invariant, not a
// coincidence, and it has been broken silently before: an automated change
// deleted the `end-of-you` segment, after which every later segment read the
// previous song's tempo — pacing the finale, the fastest song in the show, on
// Soulbound's grid. The completeness test below is the guard that would have
// caught that deletion; identity resolution is what keeps the damage contained
// if it ever happens again.
describe('wolves segment-to-playlist track identity', () => {
  const playlist = JSON.parse(
    readFileSync(resolve(process.cwd(), 'public/wolves-playlist.json'), 'utf8'),
  ) as { tracks: SoundtrackTrack[] }

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('plays every authored track, in playlist order', () => {
    // A segment silently disappearing is the defect this block exists to catch,
    // so derive the expected set from the manifest instead of pinning a count —
    // a hard-coded length shrinks along with the deletion and proves nothing.
    //
    // `wolves-playlist.json` also carries the back catalogue, so the show's own
    // tracks have to be identified by a property rather than by position: every
    // authored segment after the opener carries an authored `fadeDuration`, and
    // no back-catalogue track does. The opener needs no fade *into* it.
    const authored = playlist.tracks.filter(
      (track, index) => index === 0 || track.fadeDuration !== undefined,
    )
    expect(authored.length).toBeGreaterThan(1)
    expect(CINEMATIC_SEGMENTS.map(segment => segment.youtubeId))
      .toEqual(authored.map(track => track.youtubeVideoId))
  })

  it.each([
    { segmentIndex: 4, title: 'End of You', bpm: 95, phraseBeats: 16, hold: 16 * 60 / 95, crossfadeMs: 800 },
    { segmentIndex: 5, title: 'Soulbound', bpm: 124, phraseBeats: 32, hold: 16 * 60 / 124, crossfadeMs: 1200 },
    { segmentIndex: 6, title: 'Last Ride of the Day', bpm: 174, phraseBeats: 64, hold: 32 * 60 / 174, crossfadeMs: 2500 },
  ])(
    'paces segment $segmentIndex with $title, the song actually playing',
    async ({ segmentIndex, title, bpm, phraseBeats, hold, crossfadeMs }) => {
      const segment = CINEMATIC_SEGMENTS[segmentIndex]
      mockGalleryData(playlist.tracks)

      const wrapper = mount(WolvesComicReader, {
        props: {
          trackIndex: segmentIndex,
          trackId: segment.youtubeId,
          playlistCurrentTime: 0,
        },
      })
      await flushPromises()

      const track = (wrapper.vm as any).currentTrack as SoundtrackTrack
      expect(track.title).toBe(title)
      expect(track.youtubeVideoId).toBe(segment.youtubeId)
      expect(track.bpm).toBe(bpm)
      expect(track.phraseBeats).toBe(phraseBeats)
      expect((wrapper.vm as any).laterTrackSlideHold as number).toBeCloseTo(hold, 4)
      expect(galleryCrossfadeDuration(wrapper)).toBe(crossfadeMs)
    },
  )

  it('keeps ordering and branching on the segment index, not the resolved track', async () => {
    mockGalleryData(playlist.tracks)
    const wrapper = mount(WolvesComicReader, {
      props: {
        trackIndex: 6,
        trackId: CINEMATIC_SEGMENTS[6].youtubeId,
        playlistCurrentTime: 0,
      },
    })
    await flushPromises()

    // trackIndex still drives the later-track branch (a Track 0 timeline would
    // have been assembled instead if identity had leaked into the branching).
    expect((wrapper.vm as any).mixedPhotosToUse).toBe((wrapper.vm as any).mixedPhotos)
    expect(wrapper.props('trackIndex')).toBe(6)
  })

  it('leaves the ten catalogue albums on index-addressed playlist metadata', async () => {
    const tracks: SoundtrackTrack[] = [
      coverTrack,
      {
        id: 'album-track-one',
        title: 'Album Track One',
        artist: 'Artist',
        artwork: 'wolves-artwork/album-one.jpg',
        youtubeVideoId: 'album-one',
        bpm: 120,
        phraseBeats: 32,
        fadeDuration: 1500,
      },
      {
        id: 'decoy',
        title: 'Decoy',
        artist: 'Artist',
        artwork: 'wolves-artwork/decoy.jpg',
        youtubeVideoId: 'decoy-id',
        bpm: 60,
        phraseBeats: 8,
        fadeDuration: 400,
      },
    ]
    mockGalleryData(tracks)

    // A catalogue album's segment youtubeId can also appear elsewhere in this
    // playlist, so identity resolution must not apply outside the Wolves show.
    const wrapper = mount(WolvesComicReader, {
      props: {
        trackIndex: 1,
        trackId: 'decoy-id',
        playlistCurrentTime: 0,
        experienceId: 'album-test',
        wolvesExperience: false,
      },
    })
    await flushPromises()

    expect(((wrapper.vm as any).currentTrack as SoundtrackTrack).id).toBe('album-track-one')
    expect((wrapper.vm as any).laterTrackSlideHold as number).toBeCloseTo(8, 4)
  })

  it('keeps the non-Wolves albums on the mixedPhotos slideshow at index 0', async () => {
    mockGalleryData()
    const wrapper = mount(WolvesComicReader, {
      props: {
        trackIndex: 0,
        trackId: 'LASru9j0oIc',
        playlistCurrentTime: 0,
        experienceId: 'album-test',
        wolvesExperience: false,
      },
    })
    await flushPromises()

    const vm = wrapper.vm as any
    expect(vm.mixedPhotos.length).toBeGreaterThan(0)
    expect(vm.mixedPhotosToUse).toBe(vm.mixedPhotos)
    expect(vm.mixedPhotosToUse).not.toBe(vm.timelineSlides)
  })

  it('spreads every back-catalogue-only character into the album pool exactly once', async () => {
    mockGalleryData()
    const wrapper = mount(WolvesComicReader, {
      props: {
        trackIndex: 0,
        trackId: 'LASru9j0oIc',
        playlistCurrentTime: 0,
        experienceId: 'album-test',
        wolvesExperience: false,
      },
    })
    await flushPromises()

    const pool = (wrapper.vm as any).mixedPhotos as Array<{ id: string, kind?: string, path?: string }>
    const heroIds = new Set<string>(wolvesComicHeroShots.map(shot => shot.id))
    for (const character of backCatalogueCharacters) {
      const slides = pool.filter(slide => slide.id === character.id)
      expect(slides, `${character.id} should appear exactly once`).toHaveLength(1)
      expect(slides[0]?.kind).toBe('hero')
      expect(slides[0]?.path?.endsWith(character.src)).toBe(true)
      // Ids are `characters/`-prefixed so they can never collide with the
      // hero-shot ids the pool de-duplicates against.
      expect(heroIds.has(character.id)).toBe(false)
    }
  })

  // Durable guard on the owner's boundary: these characters are back
  // catalogue only, NEVER the authored Wolves show. `wolvesComicHeroShots`
  // feeds both the intro overlay and the back catalogue, which is why these
  // records live in a separate export — if any of them ever leak into the
  // overlay cycle or the authored track pools (timeline slides, track-0
  // carry-forward, later-track gallery), this test must fail.
  it('never lets back-catalogue-only characters reach the Wolves presentation', async () => {
    const characterIds = new Set<string>(backCatalogueCharacters.map(character => character.id))
    const characterSrcs = new Set<string>(backCatalogueCharacters.map(character => character.src))

    // The frozen intro-overlay title-card cycle.
    const overlayIds = new Set<string>(wolvesComicHeroShots.map(shot => shot.id))
    const overlaySrcs = new Set<string>(wolvesComicHeroShots.map(shot => shot.src))
    for (const character of backCatalogueCharacters) {
      expect(overlayIds.has(character.id)).toBe(false)
      expect(overlaySrcs.has(character.src)).toBe(false)
    }

    // The authored Wolves track pools.
    mockGalleryData()
    const wrapper = mount(WolvesComicReader, {
      props: { trackIndex: 0, playlistCurrentTime: 0 },
    })
    await flushPromises()

    const vm = wrapper.vm as any
    const timelineIds = (vm.timelineSlides as Array<{ id: string }>).map(slide => slide.id)
    const carryForwardIds = (vm.trackZeroCarryForwardPhotos as Array<{ id: string }>).map(photo => photo.id)
    expect(timelineIds.filter(id => characterIds.has(id))).toEqual([])
    expect(carryForwardIds.filter(id => characterIds.has(id))).toEqual([])

    await wrapper.setProps({ trackIndex: 1 })
    await flushPromises()
    const laterTrackIds = (vm.laterTrackPhotos as Array<{ id: string }>).map(photo => photo.id)
    expect(laterTrackIds.filter(id => characterIds.has(id))).toEqual([])
    expect(characterSrcs.size).toBe(characterIds.size)
  })

  // The Universal Blue family artwork is registered by hand in
  // `artwork-wallpapers.ts` because the wallpaper generator only scans the
  // `wolves/` asset subtree. Walking the show clock to look for these is
  // roulette in an ~800-slide pool, so assert pool membership directly.
  it('registers the Universal Blue family artwork in the album pool only', async () => {
    mockGalleryData()
    const wrapper = mount(WolvesComicReader, {
      props: {
        trackIndex: 0,
        trackId: 'LASru9j0oIc',
        playlistCurrentTime: 0,
        experienceId: 'album-test',
        wolvesExperience: false,
      },
    })
    await flushPromises()

    const vm = wrapper.vm as any
    const pool = vm.mixedPhotos as Array<{ id: string, kind?: string, dayName?: string, nightName?: string }>
    const artwork = [...ublueArtworkWallpapers, ...bazziteArtworkWallpapers]

    expect(ublueArtworkWallpapers).toHaveLength(11)
    expect(bazziteArtworkWallpapers).toHaveLength(2)

    for (const record of artwork) {
      const slides = pool.filter(slide => slide.id === record.name)
      expect(slides, `${record.name} should appear exactly once`).toHaveLength(1)
      expect(slides[0]?.kind).toBe(record.kind)
    }

    // Never the authored Wolves show — same boundary as the character art.
    const artworkIds = new Set(artwork.map(record => record.name))
    const timeline = (vm.timelineSlides as Array<{ id: string }>).map(slide => slide.id)
    const carryForward = (vm.trackZeroCarryForwardPhotos as Array<{ id: string }>).map(photo => photo.id)
    expect(timeline.filter(id => artworkIds.has(id))).toEqual([])
    expect(carryForward.filter(id => artworkIds.has(id))).toEqual([])
  })
})

// ── Regression: no hard cut to an undecoded image at a segment boundary ────
//
// jsdom never fires image.onload, so the whole suite used to exercise the
// synchronous cold-start branch and see nothing wrong. These tests drive the
// image lifecycle by hand so the decode gate is observable.
describe('segment boundary slide continuity', () => {
  class ControlledImage {
    static pending: ControlledImage[] = []
    onload: (() => void) | null = null
    onerror: (() => void) | null = null
    fetchPriority = 'auto'
    private value = ''

    set src(next: string) {
      this.value = next
      ControlledImage.pending.push(this)
    }

    get src() {
      return this.value
    }

    decode() {
      return Promise.resolve()
    }
  }

  async function flushImageLoads() {
    for (let round = 0; round < 5; round += 1) {
      const pending = ControlledImage.pending
      ControlledImage.pending = []
      for (const image of pending) {
        image.onload?.()
      }
      await flushPromises()
      await nextTick()
    }
  }

  const laterTracks: SoundtrackTrack[] = [
    coverTrack,
    {
      id: 'part-one',
      title: 'Part One',
      artist: 'Artist',
      artwork: 'wolves-artwork/part-one.jpg',
      youtubeVideoId: 'part-one',
      bpm: 120,
      phraseBeats: 16,
      fadeDuration: 1500,
    },
    {
      id: 'part-two',
      title: 'Part Two',
      artist: 'Artist',
      artwork: 'wolves-artwork/part-two.jpg',
      youtubeVideoId: 'part-two',
      bpm: 100,
      phraseBeats: 16,
      fadeDuration: 1200,
    },
  ]

  const boundaryPhotos = Array.from({ length: 60 }, (_, index) => ({
    id: `boundary-${index}`,
    server: '1',
    secret: String(index),
    title: `Boundary ${index}`,
  }))

  beforeEach(() => {
    ControlledImage.pending = []
    vi.stubGlobal('Image', ControlledImage)
    mockGalleryData(laterTracks, new Response(JSON.stringify(boundaryPhotos)))
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('holds the outgoing slide across a segment boundary until the incoming image has decoded', async () => {
    const wrapper = mount(WolvesComicReader, {
      props: { trackIndex: 1, playlistCurrentTime: 0 },
    })
    await flushPromises()
    await flushImageLoads()

    const hold = (wrapper.vm as any).laterTrackSlideHold as number
    await wrapper.setProps({ playlistCurrentTime: hold })
    await flushImageLoads()

    const beforeBoundary = activeTimelineImage(wrapper)
    expect(beforeBoundary).toBeDefined()

    // Exactly what advanceSegment() does: next segment and a reset clock in one
    // reactive flush. Nothing may change on screen until the new image decodes.
    await wrapper.setProps({ trackIndex: 2, playlistCurrentTime: 0 })
    expect(activeTimelineImage(wrapper)).toBe(beforeBoundary)

    await flushImageLoads()
    const afterBoundary = activeTimelineImage(wrapper)
    expect(afterBoundary).toBeDefined()
    expect(afterBoundary).not.toBe(beforeBoundary)
  })

  it('crossfades across a segment boundary instead of cutting', async () => {
    const wrapper = mount(WolvesComicReader, {
      props: { trackIndex: 1, playlistCurrentTime: 0 },
    })
    await flushPromises()
    await flushImageLoads()

    const hold = (wrapper.vm as any).laterTrackSlideHold as number
    await wrapper.setProps({ playlistCurrentTime: hold })
    await flushImageLoads()

    await wrapper.setProps({ trackIndex: 2, playlistCurrentTime: 0 })
    await flushImageLoads()

    const activeLayer = wrapper.findAll('.flickr-photo-layer')
      .find(layer => (layer.attributes('style') ?? '').includes('z-index: 2'))
    expect(activeLayer?.attributes('style')).toContain('transition: opacity')
    expect((wrapper.vm as any).crossfadeActive).toBe(true)
  })

  it('never carries the outgoing segment photo into the incoming segment buffers', async () => {
    const wrapper = mount(WolvesComicReader, {
      props: { trackIndex: 1, playlistCurrentTime: 0 },
    })
    await flushPromises()
    await flushImageLoads()

    const hold = (wrapper.vm as any).laterTrackSlideHold as number
    await wrapper.setProps({ playlistCurrentTime: hold })
    await flushImageLoads()

    const vm = wrapper.vm as any
    const onStageId = (vm.activePhoto as { id: string }).id
    const offStageId = (vm.activeBuffer === 'A' ? vm.photoB : vm.photoA)?.id

    await wrapper.setProps({ trackIndex: 2, playlistCurrentTime: 0 })

    // The visible frame survives the boundary; the off-stage buffer is cleared
    // so the outgoing song's slide can never be swapped back in.
    expect((vm.activePhoto as { id: string }).id).toBe(onStageId)
    expect(vm.activeBuffer === 'A' ? vm.photoB : vm.photoA).toBeNull()
    expect(offStageId).toBeDefined()

    await flushImageLoads()
    expect((vm.activePhoto as { id: string }).id).not.toBe(onStageId)
    expect((vm.activePhoto as { id: string }).id).not.toBe(offStageId)
  })
})

// ── Regression: the next segment's authored opening is warmed before the cut ──
//
// preloadUpcoming() only looks inside the current track's photo list, so the
// first slide of the *next* track was never warmed. With the decode gate in
// place that meant Part II opened on Part I's final photo while a remote
// multi-megabyte hero plate downloaded — at the one boundary
// CinematicTransition.vue deliberately leaves uncovered.
describe('pending segment preload of the authored opening slide', () => {
  class RecordingImage {
    static requests: Array<{ src: string, fetchPriority: string }> = []
    static pending: RecordingImage[] = []
    onload: (() => void) | null = null
    onerror: (() => void) | null = null
    fetchPriority = 'auto'
    private value = ''

    set src(next: string) {
      this.value = next
      RecordingImage.requests.push({ src: next, fetchPriority: this.fetchPriority })
      RecordingImage.pending.push(this)
    }

    get src() {
      return this.value
    }

    decode() {
      return Promise.resolve()
    }
  }

  async function flushImageLoads() {
    for (let round = 0; round < 5; round += 1) {
      const pending = RecordingImage.pending
      RecordingImage.pending = []
      for (const image of pending) {
        image.onload?.()
      }
      await flushPromises()
      await nextTick()
    }
  }

  function requestedUrls() {
    return RecordingImage.requests.map(request => request.src)
  }

  const featuredPhoto = {
    id: ghostsInTheMistOpeningSlide.photoId,
    server: '65535',
    secret: '32d7ace307',
    title: 'KC+CNC_EU_260322_MaintainerSummitBreakouts_MN_047',
  }

  // Derived from the same authored record the component reads, so a change to
  // the featured size suffix cannot silently drift away from this expectation.
  const featuredOpeningUrl
    = `https://live.staticflickr.com/${featuredPhoto.server}/${featuredPhoto.id}_${featuredPhoto.secret}_${ghostsInTheMistOpeningSlide.imageSizeSuffix}.jpg`
  const featuredGenericUrl
    = `https://live.staticflickr.com/${featuredPhoto.server}/${featuredPhoto.id}_${featuredPhoto.secret}_b.jpg`

  const boundaryTracks: SoundtrackTrack[] = [
    coverTrack,
    {
      id: 'ghosts-in-the-mist',
      title: 'Ghosts In The Mist',
      artist: 'Unleash The Archers',
      artwork: 'wolves-artwork/ghosts.jpg',
      youtubeVideoId: '1',
      bpm: 100,
      phraseBeats: 32,
    },
    {
      id: 'part-three',
      title: 'Part Three',
      artist: 'Artist',
      artwork: 'wolves-artwork/part-three.jpg',
      youtubeVideoId: '2',
      bpm: 120,
      phraseBeats: 16,
    },
  ]

  const boundaryPhotos = [
    ...galleryPhotos,
    featuredPhoto,
    ...Array.from({ length: 20 }, (_, index) => ({
      id: `filler-${index}`,
      server: '1',
      secret: `f${index}`,
      title: `Filler ${index}`,
    })),
  ]

  beforeEach(() => {
    RecordingImage.requests = []
    RecordingImage.pending = []
    vi.stubGlobal('Image', RecordingImage)
    mockGalleryData(boundaryTracks, new Response(JSON.stringify(boundaryPhotos)))
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('fetches the featured track opening at high priority before the segment index changes', async () => {
    const wrapper = mount(WolvesComicReader, {
      props: { trackIndex: 0, playlistCurrentTime: 0 },
    })
    await flushPromises()
    await flushImageLoads()

    expect(requestedUrls()).not.toContain(featuredOpeningUrl)
    RecordingImage.requests = []

    await wrapper.setProps({ pendingTrackIndex: ghostsInTheMistOpeningSlide.trackIndex })
    await nextTick()
    await flushPromises()

    // The warm-up must happen while the outgoing segment is still on screen.
    expect(wrapper.props('trackIndex')).toBe(0)
    const featuredRequest = RecordingImage.requests.find(request => request.src === featuredOpeningUrl)
    expect(featuredRequest, 'authored opening slide was never requested').toBeDefined()
    expect(featuredRequest?.fetchPriority).toBe('high')
    // The featured plate is served at the authored size, not the generic one.
    expect(requestedUrls()).not.toContain(featuredGenericUrl)
  })

  it('preloads nothing when the pending segment is the current one', async () => {
    const wrapper = mount(WolvesComicReader, {
      props: { trackIndex: 0, playlistCurrentTime: 0 },
    })
    await flushPromises()
    await flushImageLoads()
    RecordingImage.requests = []

    await wrapper.setProps({ pendingTrackIndex: 0 })
    await nextTick()
    await flushPromises()

    expect(requestedUrls()).not.toContain(featuredOpeningUrl)
  })

  it('preloads nothing while no pending segment is published', async () => {
    const wrapper = mount(WolvesComicReader, {
      props: { trackIndex: 0, playlistCurrentTime: 0 },
    })
    await flushPromises()
    await flushImageLoads()

    // Move off undefined and back so the watcher genuinely fires with no
    // pending segment, rather than never running at all.
    await wrapper.setProps({ pendingTrackIndex: 2 })
    await nextTick()
    await flushPromises()
    RecordingImage.requests = []

    await wrapper.setProps({ pendingTrackIndex: undefined })
    await nextTick()
    await flushPromises()

    expect(requestedUrls()).not.toContain(featuredOpeningUrl)
  })

  it('preloads nothing for a pending segment with no authored opening slide', async () => {
    const wrapper = mount(WolvesComicReader, {
      props: { trackIndex: 0, playlistCurrentTime: 0 },
    })
    await flushPromises()
    await flushImageLoads()
    RecordingImage.requests = []

    // Track 2's first slide is decided by the shuffle, so there is nothing
    // knowable to warm; the transition overlay covers that boundary.
    await wrapper.setProps({ pendingTrackIndex: 2 })
    await nextTick()
    await flushPromises()

    expect(requestedUrls()).not.toContain(featuredOpeningUrl)
  })

  it('never warms the Wolves hero plate for a catalogue album', async () => {
    const wrapper = mount(WolvesComicReader, {
      props: {
        trackIndex: 0,
        playlistCurrentTime: 0,
        experienceId: 'album-test',
        wolvesExperience: false,
      },
    })
    await flushPromises()
    await flushImageLoads()
    RecordingImage.requests = []

    await wrapper.setProps({ pendingTrackIndex: ghostsInTheMistOpeningSlide.trackIndex })
    await nextTick()
    await flushPromises()

    // Ten other albums share this component; the featured size suffix belongs
    // to the Wolves presentation alone.
    expect(requestedUrls()).not.toContain(featuredOpeningUrl)
  })

  it('still decode-gates and crossfades into the warmed featured opening', async () => {
    const wrapper = mount(WolvesComicReader, {
      props: { trackIndex: 0, playlistCurrentTime: 0 },
    })
    await flushPromises()
    await flushImageLoads()

    await wrapper.setProps({ pendingTrackIndex: ghostsInTheMistOpeningSlide.trackIndex })
    await nextTick()
    await flushPromises()

    const beforeBoundary = activeTimelineImage(wrapper)
    expect(beforeBoundary).toBeDefined()

    await wrapper.setProps({
      trackIndex: ghostsInTheMistOpeningSlide.trackIndex,
      playlistCurrentTime: 0,
      pendingTrackIndex: undefined,
    })

    // Warming the next opening must not turn the boundary back into a hard cut.
    expect(activeTimelineImage(wrapper)).toBe(beforeBoundary)

    await flushImageLoads()
    expect(activeTimelineImage(wrapper)).toBe(featuredOpeningUrl)
    expect((wrapper.vm as any).crossfadeActive).toBe(true)
  })

  describe('director\'s cut track zero schedule', () => {
    async function mountCut(presentationProfile?: PresentationProfile) {
      const wrapper = mount(WolvesComicReader, {
        props: { trackIndex: 0, playlistCurrentTime: 0, presentationProfile },
      })
      await flushPromises()
      return wrapper
    }

    function scheduleOf(wrapper: Awaited<ReturnType<typeof mountCut>>, key: 'trackZeroSlides' | 'timelineSlides') {
      return (wrapper.vm as any)[key] as Array<{ id: string, startTime: number, duration: number, endTime: number }>
    }

    it('drives the standard show from the authored lock schedule, unchanged', async () => {
      const standard = await mountCut(WOLVES_STANDARD_PROFILE_ID)
      const noProfile = await mountCut()

      expect(scheduleOf(standard, 'trackZeroSlides')).toEqual(scheduleOf(standard, 'timelineSlides'))
      expect(scheduleOf(noProfile, 'trackZeroSlides')).toEqual(scheduleOf(noProfile, 'timelineSlides'))

      const jono = scheduleOf(standard, 'trackZeroSlides').find(slide => slide.id === jonoBaconSlideId)
      expect(jono?.startTime).toBe(jonoBaconTrackZeroWindow.startTime)
      expect(jono?.endTime).toBe(jonoBaconTrackZeroWindow.endTime)
    })

    it('leaves the standard schedule byte-identical while the director cut plays', async () => {
      const standard = await mountCut(WOLVES_STANDARD_PROFILE_ID)
      const director = await mountCut(WOLVES_DIRECTORS_CUT_PROFILE_ID)

      expect(scheduleOf(director, 'timelineSlides')).toEqual(scheduleOf(standard, 'timelineSlides'))
      expect(scheduleOf(director, 'trackZeroSlides')).not.toEqual(scheduleOf(standard, 'trackZeroSlides'))
    })

    it('runs its own lock-free schedule to the reserved finale anchor', async () => {
      const director = await mountCut(WOLVES_DIRECTORS_CUT_PROFILE_ID)
      const slides = scheduleOf(director, 'trackZeroSlides')

      expect(slides.length).toBeGreaterThan(scheduleOf(director, 'timelineSlides').length)
      expect(Math.min(...slides.map(slide => slide.duration)))
        .toBeGreaterThanOrEqual(TRACK_ZERO_SLIDE_MINIMUM_HOLD_SECONDS)
      expect(slides[0].startTime).toBe(0)
      expect(slides[slides.length - 1].endTime).toBe(DIRECTORS_CUT_FINALE_START)
      expect(new Set(slides.map(slide => slide.id)).size).toBe(slides.length)
      for (const slide of slides) {
        expect(TRACK_ZERO_BEAT_TIMES.some(beat => Math.abs(beat - slide.endTime) < 0.0005)).toBe(true)
      }
      // Every authored hero lock is gone: Jono no longer owns 167.8-171.88.
      // His portrait is still in the pool, so an absent slide would be a
      // drawn-pool regression, not a pass.
      const jono = slides.find(slide => slide.id === jonoBaconSlideId)
      expect(jono).toBeDefined()
      expect(jono?.startTime).not.toBe(jonoBaconTrackZeroWindow.startTime)
      // Reza's two-window hold cannot exist here whether or not his portrait is
      // drawn: nothing in the Director cut starts on his window or holds that long.
      const rezaHold = rezaContributorTrackZeroWindow.endTime - rezaContributorTrackZeroWindow.startTime
      expect(slides.some(slide => slide.startTime === rezaContributorTrackZeroWindow.startTime)).toBe(false)
      expect(slides.every(slide => slide.duration < rezaHold)).toBe(true)
    })

    it('starts on the first image and changes images throughout the quote edit', async () => {
      const director = await mountCut(WOLVES_DIRECTORS_CUT_PROFILE_ID)
      const slides = scheduleOf(director, 'trackZeroSlides')
      const firstImage = activeTimelineImage(director)

      expect(firstImage).toBeDefined()

      const checkpoints = [1, Math.floor(slides.length / 3), Math.floor((slides.length * 2) / 3)]
      const seenImages = new Set([firstImage])
      for (const index of checkpoints) {
        await advanceTo(director, slides[index]!.startTime + 0.01)
        await flushImageLoads()
        seenImages.add(activeTimelineImage(director))
      }

      expect(seenImages.size).toBe(checkpoints.length + 1)
    })

    it('shows nothing scheduled once the finale interval opens', async () => {
      const director = await mountCut(WOLVES_DIRECTORS_CUT_PROFILE_ID)
      const slides = scheduleOf(director, 'trackZeroSlides')

      for (const time of [DIRECTORS_CUT_FINALE_START, 380, TRACK_ZERO_SECTIONS.finaleStart, 422]) {
        expect(slides.some(slide => slide.startTime <= time && slide.endTime > time)).toBe(false)
      }
      // The standard show is still scheduled across that same stretch.
      const standard = scheduleOf(director, 'timelineSlides')
      expect(standard.some(slide => slide.startTime <= 380 && slide.endTime > 380)).toBe(true)
    })
  })
})

describe('showcase slide predicate', () => {
  it('always qualifies hero art regardless of measured aspect', () => {
    // The character art is square-to-landscape RGBA (measured 2026-08: ratios
    // 0.94-1.62, mostly exactly 1:1), so a measured-portrait rule alone would
    // miss the dinosaurs the showcase treatment exists for.
    expect(isShowcaseSlide('hero', null)).toBe(true)
    expect(isShowcaseSlide('hero', 1)).toBe(true)
    expect(isShowcaseSlide('hero', 1.62)).toBe(true)
  })

  it('qualifies photographs narrower than the 3:2 portal', () => {
    expect(isShowcaseSlide('cncf', 2 / 3)).toBe(true) // portrait
    expect(isShowcaseSlide('curated', 1)).toBe(true) // square
    expect(isShowcaseSlide('showcase', 4 / 3)).toBe(true) // pillarboxes at 3:2
    expect(isShowcaseSlide('mascot', 1.49)).toBe(true)
  })

  it('keeps the frosted surface for portal-filling or wider slides', () => {
    expect(isShowcaseSlide('cncf', 3 / 2)).toBe(false)
    expect(isShowcaseSlide('cncf', 16 / 9)).toBe(false)
    expect(isShowcaseSlide('curated', 2.39)).toBe(false)
  })

  it('keeps the frosted surface until a non-hero slide is measured', () => {
    expect(isShowcaseSlide('cncf', null)).toBe(false)
    expect(isShowcaseSlide(undefined, undefined)).toBe(false)
    expect(isShowcaseSlide('cncf', Number.NaN)).toBe(false)
    expect(isShowcaseSlide('cncf', 0)).toBe(false)
  })

  it('derives aspect only from usable natural sizes', () => {
    expect(slideAspectFromNaturalSize(3000, 2000)).toBeCloseTo(1.5)
    expect(slideAspectFromNaturalSize(0, 2000)).toBeNull()
    expect(slideAspectFromNaturalSize(3000, 0)).toBeNull()
  })
})

// The day/night wallpapers carry their fade on a timeline: the night half's
// opacity is (currentTime - slide.startTime) / slide.duration. Only Track 0
// builds slides with `startTime` and `duration`. The back-catalogue pools are
// plain photo records without them, and `backCatalogueCuratedPhotos` does not
// filter day/night art out — so the same wallpaper that fades correctly in the
// show reaches a catalogue album with `startTime === undefined`, and the fade
// evaluates to NaN. An NaN opacity is an invalid style the browser drops,
// which strands the night half at its stylesheet value instead of dissolving.
describe('day/night wallpapers outside the authored timeline', () => {
  it('never computes a NaN fade for a catalogue album slide', async () => {
    const wrapper = mount(WolvesComicReader, {
      props: {
        trackIndex: 0,
        playlistCurrentTime: 0,
        experienceId: 'album-daynight',
        wolvesExperience: false,
      },
    })
    await flushPromises()

    const vm = wrapper.vm as any
    const pool = vm.mixedPhotosToUse as Array<{ type?: string, startTime?: number }>
    const daynight = pool.filter(slide => slide?.type === 'daynight')

    expect(daynight.length, 'catalogue pool carries day/night wallpapers').toBeGreaterThan(0)
    for (const slide of daynight) {
      expect(slide.startTime, 'catalogue day/night slide has no authored startTime').toBeUndefined()
    }

    // Put one on the stage. The fade is only evaluated for the slide actually
    // in a buffer, so walking the clock alone can miss every day/night record
    // in an 800-slide pool and prove nothing.
    vm.photoA = daynight[0]
    await nextTick()

    for (const time of [0, 7, 14, 21, 28, 35, 42, 60, 90, 128]) {
      await wrapper.setProps({ playlistCurrentTime: time })
      await flushPromises()

      expect(
        Number.isFinite(vm.daynightNightOpacityA),
        `night-layer opacity is ${vm.daynightNightOpacityA} at ${time}s`,
      ).toBe(true)
    }
  })
})
