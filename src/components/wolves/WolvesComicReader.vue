<!--
WolvesComicReader — soundtrack-synced slideshow
==============================================
Drives two different shows from one component:

  - The Wolves presentation (`wolvesExperience` true, trackIndex 0) uses
    `trackZeroSlides`: the standard cut's `timelineSlides`, whose Track 0
    schedule is pinned to authored windows in
    `src/data/wolves-track-zero-slides.ts`, or — under the
    `wolves-directors-cut` presentation profile — the frantic, lock-free
    schedule from `src/data/wolves-directors-cut-slides.ts`.
  - Every other album in `public/experiences/catalogue.json` uses
    `mixedPhotos`, and later Wolves tracks use `laterTrackPhotos`.

There is no PDF and no canvas despite the historical name; `loadComicPdf()`
is a no-op kept only for the download link.
-->
<script setup lang="ts">
import type { PresentationProfile } from '@/config/experience-manifest'
import type { SoundtrackTrack, WolvesSoundtrackManifest } from '@/data/wolves-soundtrack'

import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { bazziteArtworkWallpapers, ublueArtworkWallpapers } from '@/data/artwork-wallpapers'
import { backCatalogueCharacters } from '@/data/back-catalogue-characters'
import { classifyCuratedSlide, isCncfSlide, orderBackCatalogueSlides } from '@/data/back-catalogue-order'
import { formatGalleryCaption, getGalleryCaptionLabel } from '@/data/gallery-captions'
import { wolvesComicHeroShots } from '@/data/wolves-comic-hero-shots'
import { buildDirectorsCutTrackZeroSlides } from '@/data/wolves-directors-cut-slides'
import { ghostsInTheMistOpeningSlide } from '@/data/wolves-gallery-featured'
import { shuffleWolvesGalleryPhotos } from '@/data/wolves-gallery-shuffle'
import { MAX_LOOKAHEAD_SLIDES, PRELOAD_WINDOW_SECONDS } from '@/data/wolves-slide-preload'
import { loadWolvesSoundtrack } from '@/data/wolves-soundtrack'
import {
  TRACK_ZERO_SECTIONS,
  TRACK_ZERO_TEMPO_PICKUPS,
  trackZeroBeatCuts,
  trackZeroBeatCutsWithPickup,
  trackZeroEvenBeatCuts,
} from '@/data/wolves-track-zero-beats'
import { TRACK_ZERO_PRESENTATION_SECTIONS } from '@/data/wolves-track-zero-manifest'
import {
  bluefinGroupSlides,
  jonoBaconSlideId,
  jonoBaconTrackZeroWindow,
  lauraSlideId,
  lauraTrackZeroWindow,
  marinaMooreSlideId,
  marinaMooreTrackZeroWindow,
  pinBluefinMicroraptorSlide,
  pinTrackZeroHeroSlides,
  pinTrackZeroPostHeroOpening,
  rezaContributorSlideId,
  rezaContributorTrackZeroWindow,
  splitTrackZeroFastFinaleSlides,
  topheeSlideId,
  topheeTrackZeroWindow,
} from '@/data/wolves-track-zero-slides'
import { WOLVES_DIRECTORS_CUT_PROFILE_ID } from '@/stores/cinematic'
import { isShowcaseSlide, slideAspectFromNaturalSize } from '@/utils/slide-showcase'
import { wallpapers } from './wallpapers-list'

const props = withDefaults(defineProps<{
  trackIndex?: number
  /**
   * Identity of the playlist track backing this segment (a `youtubeVideoId`, or
   * a manifest track `id`). `trackIndex` is a *segment* index. Today the seven
   * segments line up 1:1 with the seven authored playlist tracks — but that
   * alignment has been silently broken before: an automated change deleted the
   * `end-of-you` segment and every later segment then read the previous song's
   * BPM, phrase length, and crossfade. Resolving by identity keeps that metadata
   * attached to the song actually playing, whatever the list does next.
   * Ordering and branching still use `trackIndex`.
   */
  trackId?: string
  /**
   * Segment the runtime is currently crossfading *into*, or undefined when no
   * handoff is in flight. Published one crossfade window ahead of the boundary,
   * which is the only warning the gallery gets that its whole photo list is
   * about to be replaced. See `preloadPendingTrackOpening()`.
   */
  pendingTrackIndex?: number
  playlistCurrentTime?: number
  experienceId?: string
  wolvesExperience?: boolean
  /**
   * Which authored show is playing. Both Wolves profiles run the Track 0
   * beat-synced gallery, but the Director's Cut runs its own frantic schedule
   * (`buildDirectorsCutTrackZeroSlides`) instead of the standard cut's authored
   * lock windows. Absent or `'generic'` means a back-catalogue album.
   */
  presentationProfile?: PresentationProfile
}>(), {
  experienceId: 'seven-days-to-the-wolves',
  wolvesExperience: true,
})

const trackZeroReservedForLaterIds = new Set([
  'wolves/people/interview-clyde-seepersad-linux-foundation.webp',
])

const isWolvesExperience = computed(() => props.wolvesExperience)
const isDirectorsCut = computed(() => props.presentationProfile === WOLVES_DIRECTORS_CUT_PROFILE_ID)

/**
 * Slide crossfades run without backdrop blur everywhere except the primary
 * song. Blurring a surface that is repainting a full-size image on every slide
 * change is what produced the hitch: profiling the 3:27-3:35 window measured
 * 66-83 ms frames with the blur and compositor-paced frames without it.
 *
 * The *standard* show's Track 0 is deliberately excluded. Its blur is authored
 * treatment, it is the one segment whose look is locked, and it does not run
 * the same rapid gallery crossfade the later tracks and the catalogue do.
 *
 * The Director's Cut is the opposite case: its Track 0 runs a lock-free,
 * measured-beat montage faster than any later track, so it takes the
 * static-background treatment with them. Only the profile decides this;
 * standard Track 0 and generic albums keep exactly the behaviour they had.
 */
const usesFastCrossfade = computed(() =>
  !isWolvesExperience.value || props.trackIndex !== 0 || isDirectorsCut.value)

// PDF source ───────────────────────────────────────────────────────────────
const pdfUrl = `${import.meta.env.BASE_URL}color-with-bluefin.pdf`

// Module-level singletons (survive component re-mounts on same page)

// State ────────────────────────────────────────────────────────────────────
const page = ref(1) // 1-based
const pdfLoading = ref(false)
const pdfError = ref('')
const isExperimental = ref(true)

// Base path for public assets
const baseUrl = import.meta.env.BASE_URL

const shuffledWallpapers = ref<any[]>(shuffleWallpapers([...wallpapers]))
const duskIsNight = ref(false)
let duskTimer: ReturnType<typeof setInterval> | null = null

const trackZeroFlickrPhotoIds = new Set(
  wallpapers.flatMap((wallpaper) => {
    const photoId = wallpaper.name?.startsWith('wolves/people/') && wallpaper.name.match(/\d{8,}/)?.[0]
    return photoId ? [photoId] : []
  }),
)
// CNCF feed photos whose Track 0 copy lives under a curated caption filename
// (no digits for the id match above to catch); they still play in Track 0, so
// they stay excluded from the later-track remote rotations.
const curatedTrackZeroFeedPhotoIds = [
  '55164385253', // James Strong - This Man does not give applications root to his computers.
  '55164226136', // We dine like Lords of Old!
] as const
for (const id of curatedTrackZeroFeedPhotoIds) {
  trackZeroFlickrPhotoIds.add(id)
}
const flickrPhotos = ref<{ id: string, server: string, secret: string, title: string }[]>([])
const laterTrackPhotos = ref<any[]>([])
const shuffledLaterTrackPhotos = ref<any[]>([])
const manifest = ref<WolvesSoundtrackManifest | null>(null)
const shownLaterTrackPhotoIds = new Set<string>()

const activeBuffer = ref<'A' | 'B'>('A')
const photoA = ref<any>(null)
const photoB = ref<any>(null)
const opacityA = ref(1)
const opacityB = ref(0)
const slideAIndex = ref(-1)
const slideBIndex = ref(-1)
const crossfadeActive = ref(false)
let crossfadeTimer: ReturnType<typeof setTimeout> | null = null
/**
 * Bumped on every segment boundary so the slide watcher re-runs against the
 * incoming track's list even when the display index happens to be unchanged.
 * Without it a boundary could leave the outgoing song's slide on stage.
 */
const trackChangeSerial = ref(0)

const activePhoto = computed(() => {
  return activeBuffer.value === 'A' ? photoA.value : photoB.value
})

/**
 * Measured slide aspects (`naturalWidth / naturalHeight`), keyed by photo id.
 * Filled by the slide preloader and by the rendered `<img>` load events;
 * either source alone leaves a gap — the cold-start slide is never preloaded,
 * and nothing renders until the preload decodes.
 *
 * Keyed by id, not URL: `handleImageError` rewrites a failing Flickr src
 * through several sizes, so the rendered URL can diverge from the preloaded
 * one. Keying by id also means a slide change never has to reset anything —
 * each photo carries its own measurement, so a stale aspect can never leak
 * onto the incoming slide. String+number entries only — trivial next to the
 * decoded bitmaps the preloader deliberately avoids retaining.
 */
const measuredSlideAspects = reactive(new Map<string, number>())

function recordSlideAspect(photoId: string | undefined, naturalWidth: number, naturalHeight: number) {
  const aspect = slideAspectFromNaturalSize(naturalWidth, naturalHeight)
  if (photoId && aspect !== null) {
    measuredSlideAspects.set(photoId, aspect)
  }
}

function handleSlideImgLoad(photo: any, event: Event) {
  const img = event.target as HTMLImageElement | null
  if (img?.naturalWidth) {
    recordSlideAspect(photo?.id, img.naturalWidth, img.naturalHeight)
  }
}

const activeSlideAspect = computed(() => {
  const photo = activePhoto.value
  if (!photo) {
    return null
  }
  return measuredSlideAspects.get(photo.id) ?? null
})

/**
 * True while the slide on stage qualifies for the showcase treatment: the
 * frosted viewport surface is dropped so the artwork behind the portal shows
 * through around the image. Gated on gallery mode so the cover/back-cover
 * pages keep their authored surface.
 */
const showcaseSlideActive = computed(() => {
  const galleryActive = (props.trackIndex ?? 0) > 0 || (props.trackIndex === 0 && isExperimental.value)
  if (!galleryActive) {
    return false
  }
  return isShowcaseSlide(activePhoto.value?.kind, activeSlideAspect.value)
})

const currentTrack = computed<SoundtrackTrack | null>(() => {
  if (!manifest.value) {
    return null
  }
  // Resolve the Wolves show's metadata by identity, never by position: the
  // cinematic omits playlist track 4 ("End of You"), so segment 4 is Soulbound
  // and segment 5 is Last Ride of the Day. Indexing read the previous song's
  // tempo for both, pacing the 174 BPM finale on a 124 BPM grid.
  //
  // The lookup is confined to the Wolves experience because the other albums in
  // public/experiences/catalogue.json share youtube ids with unrelated entries
  // further down this same playlist; for them the Wolves soundtrack manifest is
  // unrelated and must not be used to pace album slides.
  if (!isWolvesExperience.value) {
    return null
  }
  if (props.trackId) {
    const identified = manifest.value.tracks.find(
      track => track.youtubeVideoId === props.trackId || track.id === props.trackId,
    )
    if (identified) {
      return identified
    }
  }
  if (props.trackIndex === undefined) {
    return null
  }
  return manifest.value.tracks[props.trackIndex] || null

const currentBeat = computed(() => {
  const bpm = currentTrack.value?.bpm
  if (!bpm || props.playlistCurrentTime === undefined) {
    return 0
  }
  return Math.floor(props.playlistCurrentTime * (bpm / 60))
})

// Evaluated to keep the computed active for vitest assertions without TS6133 unused error
void currentBeat.value

interface TimelineSlide {
  id: string
  isLocal: boolean
  path: string
  title: string
  type: 'single' | 'daynight'
  dayName?: string
  nightName?: string
  startTime: number
  duration: number
  endTime: number
  fit?: 'cover' | 'contain'
  description?: string
  theaterTitleOnly?: boolean
}

const timelineSlides = computed<TimelineSlide[]>(() => {
  const localShowcase = wallpapers.filter((wp) => {
    const isPeople = wp.name?.includes('/people/') || wp.dayName?.includes('/people/') || wp.nightName?.includes('/people/')
    return !isPeople && !wp.name?.endsWith('.gif')
  }).map(wp => ({
    id: wp.name || wp.dayName || wp.nightName || '',
    isLocal: true,
    path: wp.name,
    title: wp.title,
    type: wp.type,
    dayName: wp.dayName,
    nightName: wp.nightName,
    fit: wp.fit,
    description: wp.description,
    theaterTitleOnly: wp.theaterTitleOnly,
  }))

  const localPeople = wallpapers.filter((wp) => {
    const isPeople = wp.name?.includes('/people/') || wp.dayName?.includes('/people/') || wp.nightName?.includes('/people/')
    const id = wp.name ?? wp.dayName ?? wp.nightName ?? ''
    return isPeople && !trackZeroReservedForLaterIds.has(id)
  }).map(wp => ({
    id: wp.name || wp.dayName || wp.nightName || '',
    isLocal: true,
    path: wp.name,
    title: wp.title,
    type: wp.type,
    dayName: wp.dayName,
    nightName: wp.nightName,
    fit: wp.fit,
    description: wp.description,
    theaterTitleOnly: wp.theaterTitleOnly,
  }))

  const daynightShowcase = localShowcase.filter(wp => wp.type === 'daynight')
  const normalShowcase = localShowcase.filter(wp => wp.type !== 'daynight')

  const andyAdvisorTarget = 'wolves/people/Bluefin Advisor Andy Randall.jpg'
  const andyAdvisorIndex = localPeople.findIndex(wp => wp.id === andyAdvisorTarget)
  let andyAdvisorPhoto: any = null
  if (andyAdvisorIndex !== -1) {
    andyAdvisorPhoto = localPeople.splice(andyAdvisorIndex, 1)[0]
  }

  const rezaTarget = rezaContributorSlideId
  const rezaIndex = localPeople.findIndex(wp => wp.id === rezaTarget)
  let rezaPhoto: any = null
  if (rezaIndex !== -1) {
    rezaPhoto = localPeople.splice(rezaIndex, 1)[0]
  }

  const pivotalTarget = 'wolves/people/kubecon-54927705495.webp'
  const targetIndex = localPeople.findIndex(wp => wp.id === pivotalTarget)
  let pivotalPhoto: any = null
  if (targetIndex !== -1) {
    pivotalPhoto = localPeople.splice(targetIndex, 1)[0]
  }

  const bkTarget = 'wolves/people/bketelsen.webp'
  const bkTargetIndex = localPeople.findIndex(wp => wp.id === bkTarget)
  let bkPhoto: any = null
  if (bkTargetIndex !== -1) {
    bkPhoto = localPeople.splice(bkTargetIndex, 1)[0]
  }

  const heartTarget = 'wolves/people/kubecon-55168460993.webp'
  const heartTargetIndex = localPeople.findIndex(wp => wp.id === heartTarget)
  let heartPhoto: any = null
  if (heartTargetIndex !== -1) {
    heartPhoto = localPeople.splice(heartTargetIndex, 1)[0]
  }

  // Howl lock: DN 013 opens the build-up right on the "Howl!" accent
  // (buildStart, beat 681), locked with the "Falling back to
  // humans/trying-their-best:v1 slowly" status flip at the same beat.
  const howlTarget = 'wolves/people/kubecon-55177109118.webp'
  const howlTargetIndex = localPeople.findIndex(wp => wp.id === howlTarget)
  let howlPhoto: any = null
  if (howlTargetIndex !== -1) {
    howlPhoto = localPeople.splice(howlTargetIndex, 1)[0]
  }

  const finaleTarget = 'wolves/people/kubecon-55164466314.webp'
  const finaleTargetIndex = localPeople.findIndex(wp => wp.id === finaleTarget)
  let finalePhoto: any = null
  if (finaleTargetIndex !== -1) {
    finalePhoto = localPeople.splice(finaleTargetIndex, 1)[0]
  }

  const shuffledDaynight = deterministicShuffle(daynightShowcase, 101)
  // The Microraptor lock keeps its slide at a fixed slot even as the pool drifts.
  const shuffledNormalShowcase = pinBluefinMicroraptorSlide(deterministicShuffle(normalShowcase, 202))
  const { regularSlides, finaleSlides } = splitTrackZeroFastFinaleSlides(localPeople)
  // Locked post-hero opening (Kirkland -> Walters -> Bryce -> CNCF Projects ->
  // 0R0A9083 -> 052) is pinned to the head of the People pool; because the hero
  // locks are extracted by id below, these are the first slides that actually
  // play after Reza's window closes.
  const shuffledPeople = pinTrackZeroPostHeroOpening(
    pinTrackZeroHeroSlides(deterministicShuffle(regularSlides, 303)),
  )

  const result: TimelineSlide[] = []
  let currentTime = 0

  // 1. Ambient Intro [0, ~42] -> Day/Night wallpapers on long measured holds
  // (32-beat opening hold, 24-beat holds after; cuts land on measured beats).
  const dnPool = shuffledDaynight.slice(0, 5)
  const sec1Cuts = trackZeroBeatCuts(currentTime, TRACK_ZERO_PRESENTATION_SECTIONS.ambientIntro.endTime, dnPool.length, TRACK_ZERO_PRESENTATION_SECTIONS.ambientIntro.beatGroups)
  dnPool.forEach((item, index) => {
    const endTime = sec1Cuts[index]
    result.push({
      ...item,
      path: item.path || '',
      startTime: currentTime,
      duration: endTime - currentTime,
      endTime
    })
    currentTime = endTime
  })

  // 2. Heavy Driving Verse 1 [~42, ~127] -> 22 normal showcase wallpapers;
  // 16-beat holds while the verse settles in, tightening to 8-beat phrases.
  const normalPool1 = shuffledNormalShowcase.slice(0, 22)
  const sec2Cuts = trackZeroBeatCuts(currentTime, TRACK_ZERO_PRESENTATION_SECTIONS.drivingVerse.endTime, normalPool1.length, TRACK_ZERO_PRESENTATION_SECTIONS.drivingVerse.beatGroups)
  normalPool1.forEach((item, index) => {
    const endTime = sec2Cuts[index]
    result.push({
      ...item,
      path: item.path || '',
      startTime: currentTime,
      duration: endTime - currentTime,
      endTime
    })
    currentTime = endTime
  })

  // 3. Heavy Chorus 1 / Verse 2 / Chorus 2 [~127, ~229] -> leftover showcase + people wallpapers
  const normalPool2 = shuffledNormalShowcase.slice(22, 39)
  // Hero locks run jono -> marina -> Bluefin group -> laura -> tophee -> reza.
  // The slice must cover every hero index or a locked portrait is silently
  // dropped and every following locked window starts early.
  const peoplePool1 = andyAdvisorPhoto
    ? [...shuffledPeople.slice(0, 7), andyAdvisorPhoto, ...shuffledPeople.slice(7, 15)]
    : shuffledPeople.slice(0, 16)
  const jonoPhoto = peoplePool1.find(item => item.id === jonoBaconSlideId)
  const marinaPhoto = peoplePool1.find(item => item.id === marinaMooreSlideId)
  const lauraPhoto = peoplePool1.find(item => item.id === lauraSlideId)
  const topheePhoto = peoplePool1.find(item => item.id === topheeSlideId)
  // The Bluefin group (Sherman + m2 composite, NOT John Bazzite, hikari) locks as one back-to-back run;
  // it only engages when every member survived into the Track 0 people pool.
  const bluefinGroupPhotos = bluefinGroupSlides.map(slide => ({
    slide,
    photo: peoplePool1.find(item => item.id === slide.id),
  }))
  const hasBluefinGroupLock = Boolean(marinaPhoto)
    && bluefinGroupPhotos.every(entry => entry.photo !== undefined)
  const lockedHeroSlideIds = new Set([
    jonoBaconSlideId,
    ...(marinaPhoto ? [marinaMooreSlideId] : []),
    ...(hasBluefinGroupLock ? bluefinGroupSlides.map(slide => slide.id) : []),
    ...(lauraPhoto ? [lauraSlideId] : []),
    ...(topheePhoto ? [topheeSlideId] : []),
  ])
  const remainingPeoplePool1 = peoplePool1.filter(item =>
    !lockedHeroSlideIds.has(item.id),
  )

  if (!jonoPhoto) {
    const sec3Items = [...normalPool2, ...peoplePool1]
    const sec3Cuts = trackZeroBeatCuts(currentTime, TRACK_ZERO_PRESENTATION_SECTIONS.contributorChorus.endTime, sec3Items.length, TRACK_ZERO_PRESENTATION_SECTIONS.contributorChorus.beatGroups)
    sec3Items.forEach((item, index) => {
      const endTime = sec3Cuts[index]
      result.push({
        ...item,
        path: item.path || '',
        startTime: currentTime,
        duration: endTime - currentTime,
        endTime
      })
      currentTime = endTime
    })
  }
  else {
    // Chorus fill on 8-beat phrases; the final cut clamps to the Jono lock start.
    const beforeJonoCuts = trackZeroBeatCutsWithPickup(
      currentTime,
      TRACK_ZERO_TEMPO_PICKUPS.chorus,
      jonoBaconTrackZeroWindow.startTime,
      normalPool2.length,
      8,
      4,
    )
    normalPool2.forEach((item, index) => {
      const endTime = beforeJonoCuts[index]
      result.push({
        ...item,
        path: item.path || '',
        startTime: currentTime,
        duration: endTime - currentTime,
        endTime
      })
      currentTime = endTime
    })

    result.push({
      ...jonoPhoto,
      path: jonoPhoto.path || '',
      startTime: currentTime,
      duration: jonoBaconTrackZeroWindow.endTime - jonoBaconTrackZeroWindow.startTime,
      endTime: jonoBaconTrackZeroWindow.endTime
    })
    currentTime = jonoBaconTrackZeroWindow.endTime

    if (marinaPhoto) {
      result.push({
        ...marinaPhoto,
        path: marinaPhoto.path || '',
        startTime: currentTime,
        duration: marinaMooreTrackZeroWindow.endTime - marinaMooreTrackZeroWindow.startTime,
        endTime: marinaMooreTrackZeroWindow.endTime,
      })
      currentTime = marinaMooreTrackZeroWindow.endTime
    }

    if (hasBluefinGroupLock) {
      for (const { slide, photo } of bluefinGroupPhotos) {
        result.push({
          ...photo!,
          path: photo!.path || '',
          startTime: currentTime,
          duration: slide.window.endTime - slide.window.startTime,
          endTime: slide.window.endTime,
        })
        currentTime = slide.window.endTime
      }
    }

    if (lauraPhoto) {
      result.push({
        ...lauraPhoto,
        path: lauraPhoto.path || '',
        startTime: currentTime,
        duration: lauraTrackZeroWindow.endTime - lauraTrackZeroWindow.startTime,
        endTime: lauraTrackZeroWindow.endTime,
      })
      currentTime = lauraTrackZeroWindow.endTime
    }

    if (topheePhoto) {
      result.push({
        ...topheePhoto,
        path: topheePhoto.path || '',
        startTime: currentTime,
        duration: topheeTrackZeroWindow.endTime - currentTime,
        endTime: topheeTrackZeroWindow.endTime,
      })
      currentTime = topheeTrackZeroWindow.endTime
    }

    // Reza is anchored to his own locked window rather than to whatever the
    // running clock happens to be, so the HAMI title above him stays aligned
    // even if an earlier hero slide is missing from the pool.
    if (rezaPhoto) {
      result.push({
        ...rezaPhoto,
        path: rezaPhoto.path || '',
        startTime: rezaContributorTrackZeroWindow.startTime,
        duration: rezaContributorTrackZeroWindow.endTime - rezaContributorTrackZeroWindow.startTime,
        endTime: rezaContributorTrackZeroWindow.endTime,
      })
      currentTime = rezaContributorTrackZeroWindow.endTime
    }

    // Post-hero people ride the measured 136 BPM region on 10-beat holds,
    // tightening to 8-beat as the second chorus closes into the bridge.
    const afterJonoCuts = trackZeroBeatCuts(currentTime, TRACK_ZERO_PRESENTATION_SECTIONS.contributorChorus.endTime, remainingPeoplePool1.length, TRACK_ZERO_PRESENTATION_SECTIONS.contributorChorus.beatGroups)
    remainingPeoplePool1.forEach((item, index) => {
      const endTime = afterJonoCuts[index]
      result.push({
        ...item,
        path: item.path || '',
        startTime: currentTime,
        duration: endTime - currentTime,
        endTime
      })
      currentTime = endTime
    })
  }

  // 4. Chanting Bridge [~229, ~277] -> 24 people wallpapers; 6-beat holds
  // tightening to 4-beat as the chant gathers.
  const bridgeCuts = trackZeroBeatCutsWithPickup(
    currentTime,
    TRACK_ZERO_PRESENTATION_SECTIONS.chantingBridge.pickupTime,
    TRACK_ZERO_PRESENTATION_SECTIONS.chantingBridge.endTime,
    24,
    ...TRACK_ZERO_PRESENTATION_SECTIONS.chantingBridge.beatGroups,
  )
  // The measured pickup created two 1.74-second cuts around 4:05. Preserve
  // this bridge image through the 4:08 narrative scene cut; the show only
  // accelerates into its fast barrage at the authored 5:55 pickup.
  const bridgeHiccupCutIndex = bridgeCuts.findIndex(cut => Math.abs(cut - 245.830) < 0.001)
  const peoplePool2 = shuffledPeople.slice(15, 39)
    .filter((_, index) => index !== bridgeHiccupCutIndex)
  const sec4Cuts = bridgeCuts.filter((_, index) => index !== bridgeHiccupCutIndex)
  peoplePool2.forEach((item, index) => {
    const endTime = sec4Cuts[index]
    result.push({
      ...item,
      path: item.path || '',
      startTime: currentTime,
      duration: endTime - currentTime,
      endTime
    })
    currentTime = endTime
  })

  // 5. Heavy Build-Up [~277, ~345] -> people wallpapers; 8-beat phrase holds
  // as the tempo returns to 152 BPM, tightening to 4-beat toward the climax.
  // The howl lock adds one slide up front, so the build pool takes one fewer
  // from the shuffle to keep the measured cut grid (and the 321s heart
  // window at index 19) unchanged; the traded slide rejoins in the barrage.
  const buildPoolEnd = howlPhoto ? 72 : 73
  const peoplePool3 = shuffledPeople.slice(39, buildPoolEnd)
  if (howlPhoto) {
    // Index 0 starts DN 013 exactly on the buildStart beat -- the "Howl!".
    peoplePool3.splice(0, 0, howlPhoto)
  }
  if (heartPhoto) {
    // Index 19 places the heart photo on the slide window covering the
    // 321s owner anchor under the measured 4-beat cuts.
    peoplePool3.splice(19, 0, heartPhoto)
  }
  const sec5Cuts = trackZeroBeatCuts(currentTime, TRACK_ZERO_PRESENTATION_SECTIONS.heavyBuild.endTime, peoplePool3.length, TRACK_ZERO_PRESENTATION_SECTIONS.heavyBuild.beatGroups)
  peoplePool3.forEach((item, index) => {
    const endTime = sec5Cuts[index]
    result.push({
      ...item,
      path: item.path || '',
      startTime: currentTime,
      duration: endTime - currentTime,
      endTime
    })
    currentTime = endTime
  })

  // 6. Fast Solo Climax & Outro [~345, 423]

  if (pivotalPhoto) {
    const endTime = TRACK_ZERO_SECTIONS.pivotalEnd
    result.push({
      ...pivotalPhoto,
      path: pivotalPhoto.path || '',
      startTime: currentTime,
      duration: endTime - currentTime,
      endTime
    })
    currentTime = endTime
  }

  if (bkPhoto) {
    const endTime = TRACK_ZERO_SECTIONS.bkEnd
    result.push({
      ...bkPhoto,
      path: bkPhoto.path || '',
      startTime: currentTime,
      duration: endTime - currentTime,
      endTime
    })
    currentTime = endTime
  }

  // The barrage starts at the authored 5:55 pickup and accelerates on the
  // measured beat grid without cutting every beat. Keep the generic CNCF
  // filler photos out of this contributor-focused sequence.
  const barrageBase = [
    ...shuffledPeople.slice(buildPoolEnd),
    ...finaleSlides,
  ].filter((slide, index, slides) =>
    slide.id !== 'wolves/people/interview-clyde-seepersad-linux-foundation.webp'
    && !slide.id.startsWith('wolves/people/cncf-')
    && slides.findIndex(candidate => candidate.id === slide.id) === index)
  const peoplePool4 = deterministicShuffle(barrageBase, 404).slice(0, 30)
  const sec6Cuts = trackZeroEvenBeatCuts(
    currentTime,
    TRACK_ZERO_PRESENTATION_SECTIONS.finaleBarrage.endTime,
    peoplePool4.length,
  )
  peoplePool4.forEach((item, index) => {
    const endTime = sec6Cuts[index]
    result.push({
      ...item,
      path: item.path || '',
      startTime: currentTime,
      duration: endTime - currentTime,
      endTime
    })
    currentTime = endTime
  })

  // Finale hold rides the measured ring-out and fade to silence (~419.5s)
  // through the 423s handoff.
  if (finalePhoto) {
    result.push({
      ...finalePhoto,
      path: finalePhoto.path || '',
      startTime: currentTime,
      duration: 423 - currentTime,
      endTime: 423
    })
  }

  return result
})

/**
 * The Director's Cut runs the same measured beat grid and the same photo pools
 * as the standard cut, and none of its authored lock windows: no hero pins, no
 * post-hero run, no Reza hold, no thesis freezes, no reserved closing photo.
 * The cuts are shorter and tighten section by section, and the whole schedule
 * stops on `DIRECTORS_CUT_FINALE_START` so the Director finale owns the
 * remaining frame. See `src/data/wolves-directors-cut-slides.ts`.
 *
 * The standard show never reaches this branch — `timelineSlides` above is
 * untouched and still drives `wolves-standard`.
 */
const directorsCutTimelineSlides = computed<TimelineSlide[]>(() => {
  const toSlide = (wallpaper: (typeof wallpapers)[number]) => ({
    id: wallpaper.name || wallpaper.dayName || wallpaper.nightName || '',
    isLocal: true,
    path: wallpaper.name,
    title: wallpaper.title,
    type: wallpaper.type,
    dayName: wallpaper.dayName,
    nightName: wallpaper.nightName,
    fit: wallpaper.fit,
    description: wallpaper.description,
    theaterTitleOnly: wallpaper.theaterTitleOnly,
  })
  const isPeopleWallpaper = (wallpaper: (typeof wallpapers)[number]) =>
    Boolean(wallpaper.name?.includes('/people/') || wallpaper.dayName?.includes('/people/') || wallpaper.nightName?.includes('/people/'))

  const localSlides = wallpapers.filter(wallpaper => !wallpaper.name?.endsWith('.gif'))
  const peopleSlides = localSlides
    .filter(wallpaper => isPeopleWallpaper(wallpaper) && !trackZeroReservedForLaterIds.has(wallpaper.name ?? wallpaper.dayName ?? wallpaper.nightName ?? ''))
    .map(toSlide)
  const showcase = localSlides.filter(wallpaper => !isPeopleWallpaper(wallpaper))

  return buildDirectorsCutTrackZeroSlides<TimelineSlide>({
    dayNightSlides: showcase.filter(wallpaper => wallpaper.type === 'daynight').map(toSlide) as TimelineSlide[],
    showcaseSlides: showcase.filter(wallpaper => wallpaper.type !== 'daynight').map(toSlide) as TimelineSlide[],
    peopleSlides: peopleSlides as TimelineSlide[],
    cncfSlides: flickrPhotos.value.map(photo => ({
      id: photo.id,
      isLocal: false,
      path: `https://live.staticflickr.com/${photo.server}/${photo.id}_${photo.secret}_b.jpg`,
      title: photo.title,
      type: 'single' as const,
      kind: 'cncf' as const,
      rawPhoto: photo,
    })) as unknown as TimelineSlide[],
    duplicateCncfPhotoIds: trackZeroFlickrPhotoIds,
  })
})

/** The Track 0 schedule for whichever authored cut is playing. */
const trackZeroSlides = computed<TimelineSlide[]>(() =>
  isDirectorsCut.value ? directorsCutTimelineSlides.value : timelineSlides.value)

const trackZeroCarryForwardPhotos = computed(() => {
  const scheduledIds = new Set(trackZeroSlides.value.map(slide => slide.id))
  return wallpapers
    .filter(wallpaper => wallpaper.name?.includes('/people/'))
    .map(wallpaper => ({
      id: wallpaper.name ?? '',
      isLocal: true,
      path: wallpaper.name,
      title: wallpaper.title,
      type: wallpaper.type,
      dayName: wallpaper.dayName,
      nightName: wallpaper.nightName,
      fit: wallpaper.fit,
      description: wallpaper.description,
      kind: classifyCuratedSlide(wallpaper.name ?? '', wallpaper.title),
    }))
    .filter(photo => !scheduledIds.has(photo.id))
})

/**
 * The rest of the curated catalogue, for back-catalogue albums only: product
 * showcase, commissioned mascot art, the comic hero shots, the character art
 * the intro overlay does not carry, and the Universal Blue family artwork
 * (Bluefin monthly rotation + Bazzite Convergence).
 *
 * None of these could previously reach an album. `trackZeroCarryForwardPhotos`
 * filters to `/people/`, so showcase and mascot art were excluded, and the hero
 * shots were only ever wired into the intro overlay.
 *
 * Hero shots keep the authored order from `wolves-comic-hero-shots.ts`, where
 * no character or species repeats back-to-back — a property a shuffle cannot
 * reconstruct, because it has no idea which dinosaur is which. They resolve
 * from `public/characters/` rather than `img/wallpapers/`, so they are marked
 * remote and carry a fully-resolved path.
 */
const backCatalogueCuratedPhotos = computed(() => {
  const showcaseAndArt = wallpapers
    .filter(wallpaper => !wallpaper.name?.includes('/people/') && !wallpaper.name?.endsWith('.gif'))
    .map(wallpaper => ({
      id: wallpaper.name || wallpaper.dayName || wallpaper.nightName || '',
      isLocal: true,
      path: wallpaper.name,
      title: wallpaper.title,
      type: wallpaper.type,
      dayName: wallpaper.dayName,
      nightName: wallpaper.nightName,
      fit: wallpaper.fit,
      description: wallpaper.description,
      kind: classifyCuratedSlide(wallpaper.name || wallpaper.dayName || '', wallpaper.title),
    }))

  const heroShots = wolvesComicHeroShots.map(shot => ({
    id: shot.id,
    isLocal: false,
    path: `${baseUrl}characters/${shot.src.replace(/^characters\//, '')}`,
    title: shot.label,
    type: 'single' as const,
    dayName: undefined,
    nightName: undefined,
    kind: 'hero' as const,
  }))

  // Character art the intro overlay does NOT carry — back catalogue only,
  // never the Wolves presentation. Appended after the hero shots so
  // `orderCuratedSlides` keeps the combined hand-spread species order; the
  // data file documents why its first record is not a Deinonychus.
  const extraCharacters = backCatalogueCharacters.map(character => ({
    id: character.id,
    isLocal: false,
    path: `${baseUrl}${character.src}`,
    title: character.title,
    type: 'single' as const,
    dayName: undefined,
    nightName: undefined,
    kind: 'hero' as const,
  }))

  // First-party Universal Blue family artwork: the Bluefin monthly day/night
  // rotation and the two Bazzite Convergence wallpapers. These resolve from
  // `img/wallpapers/` like the generated list, but the generator only scans
  // the `wolves/` subtree, so they are registered explicitly in
  // `artwork-wallpapers.ts` — which is also what keeps the import an
  // allowlist. Aurora artwork is excluded there and pinned by a test.
  const familyArtwork = [...ublueArtworkWallpapers, ...bazziteArtworkWallpapers].map(wallpaper => ({
    id: wallpaper.name,
    isLocal: true,
    path: wallpaper.name,
    title: wallpaper.title,
    type: wallpaper.type,
    dayName: wallpaper.dayName,
    nightName: wallpaper.nightName,
    fit: wallpaper.fit,
    kind: wallpaper.kind,
  }))

  return [...showcaseAndArt, ...heroShots, ...extraCharacters, ...familyArtwork]
})

const activeTimelineSlide = computed(() => {
  if (!isWolvesExperience.value || props.trackIndex !== 0 || !isExperimental.value || trackZeroSlides.value.length === 0) {
    return null
  }
  const curTime = props.playlistCurrentTime ?? 0
  let index = trackZeroSlides.value.findIndex(s => curTime < s.endTime)
  if (index === -1) {
    index = trackZeroSlides.value.length - 1
  }
  return trackZeroSlides.value[index]
})

const laterTrackSlideHold = computed(() => {
  const trackIndex = props.trackIndex ?? 0
  if (trackIndex <= 0) {
    return null
  }

  // Generic album experiences do not load a soundtrack manifest and run on a
  // fixed, stable slide cadence that does not borrow Wolves tempo or jump when
  // manifest loads asynchronously.
  if (!isWolvesExperience.value) {
    return [7, 8, 10][trackIndex % 3]
  }

  const track = currentTrack.value
  if (track?.bpm && track.phraseBeats) {
    let beatGroup = track.phraseBeats
    let hold = beatGroup * 60 / track.bpm

    while (hold > 11.5) {
      beatGroup /= 2
      hold = beatGroup * 60 / track.bpm
    }
    while (hold < 5.5) {
      beatGroup *= 2
      hold = beatGroup * 60 / track.bpm
    }

    return hold
  }

  return [7, 8, 10][trackIndex % 3]
})

/**
 * The hold every non-timeline slide runs on. `activeFlickrIndex` and the
 * day/night fade must read the same value, or the wallpaper dissolves against
 * a window the deck is not actually using.
 */
const standardSlideHold = computed(() => laterTrackSlideHold.value ?? 7)

const currentSlideTransitionDuration = computed(() => {
  if ((props.trackIndex ?? 0) > 0) {
    const hold = laterTrackSlideHold.value ?? 7
    return Math.min(currentTrack.value?.fadeDuration ?? 1500, hold * 250)
  }
  const slide = activeTimelineSlide.value
  if (!slide) {
    return 1000
  }
  // Long ambient holds get long dissolves; beat-length slides get near-cuts.
  const crossfadeCap = slide.duration >= 8 ? 1600 : 800
  return Math.min(crossfadeCap, slide.duration * 300)
})

/**
 * The night half's dissolve across a day/night wallpaper's own window.
 *
 * Only the Track 0 timeline authors `startTime` and `duration`. The
 * back-catalogue pools are plain photo records, and `backCatalogueCuratedPhotos`
 * does not filter day/night art out — so the same wallpaper reaches an album
 * with neither field, `curTime - undefined` is NaN, and the binding emitted an
 * invalid `opacity: NaN` that the browser drops. The night half then stranded
 * at its stylesheet value instead of dissolving, and the wallpaper stopped
 * changing. Outside the authored timeline the slide's window is the same hold
 * the deck indexes on, so the fade is derived from that.
 */
function daynightNightOpacity(slide: any, slideIndex: number): number {
  if (!slide || slide.type !== 'daynight') {
    return 0
  }
  const duration = slide.duration ?? standardSlideHold.value
  const startTime = slide.startTime ?? Math.max(0, slideIndex) * standardSlideHold.value
  if (!(duration > 0)) {
    return 0
  }
  const elapsed = (props.playlistCurrentTime ?? 0) - startTime
  const ratio = elapsed / duration
  return Number.isFinite(ratio) ? Math.min(1.0, Math.max(0.0, ratio)) : 0
}

const daynightNightOpacityA = computed(() => daynightNightOpacity(photoA.value, slideAIndex.value))

const daynightNightOpacityB = computed(() => daynightNightOpacity(photoB.value, slideBIndex.value))

const activeTimelineSlideIndex = computed(() => {
  if (trackZeroSlides.value.length === 0) {
    return 0
  }
  const slide = activeTimelineSlide.value
  if (!slide) {
    return 0
  }
  return trackZeroSlides.value.indexOf(slide)
})

const mixedPhotos = computed(() => {
  // NOT DEAD CODE. This is the slideshow for the ten non-Wolves album
  // experiences in public/experiences/catalogue.json. `mixedPhotosToUse` only
  // swaps in `trackZeroSlides` when `wolvesExperience` is true, so this branch
  // still runs for every other album at trackIndex 0. Deleting it because the
  // Wolves path looks like a replacement breaks those albums silently — the
  // Wolves route keeps working, so a /wolves/ smoke test will not catch it.

  // Rebuild the per-experience shuffle when the lobby launches another album.
  void props.experienceId

  const remotePeople = flickrPhotos.value.map(p => ({
    id: p.id,
    isLocal: false,
    path: `https://live.staticflickr.com/${p.server}/${p.id}_${p.secret}_b.jpg`,
    title: p.title,
    type: 'single' as const,
    dayName: undefined,
    nightName: undefined,
    kind: 'cncf' as const,
    rawPhoto: p
  }))

  const trackIdx = props.trackIndex ?? 1

  if (trackIdx > 0) {
    return laterTrackPhotos.value
  }

  // The album's opening segment. Previously this pinned three showcase
  // screenshots to the front and interleaved the rest on a fixed 1:2 ratio,
  // which is a coded preference for product art over community photography.
  // The catalogue now draws one unweighted pool — CNCF leads because it
  // outnumbers everything else, not because anything here favours it — and
  // relies on `orderBackCatalogueSlides` for event diversity and spacing.
  return orderGalleryPool([
    ...trackZeroCarryForwardPhotos.value,
    ...backCatalogueCuratedPhotos.value,
    ...remotePeople,
  ])
})

const activeFlickrIndex = computed(() => {
  if (mixedPhotos.value.length === 0) {
    return 0
  }

  if (props.playlistCurrentTime === undefined) {
    return 0
  }
  const standardHold = standardSlideHold.value
  const hasFeaturedOpening = isWolvesExperience.value
    && props.trackIndex === ghostsInTheMistOpeningSlide.trackIndex
    && laterTrackPhotos.value[0]?.id === ghostsInTheMistOpeningSlide.photoId
  if (!hasFeaturedOpening) {
    return Math.floor(props.playlistCurrentTime / standardHold)
  }
  if (props.playlistCurrentTime < ghostsInTheMistOpeningSlide.holdSeconds) {
    return 0
  }
  return 1 + Math.floor((props.playlistCurrentTime - ghostsInTheMistOpeningSlide.holdSeconds) / standardHold)
})

const activeDisplayIndex = computed(() => {
  if (isWolvesExperience.value && props.trackIndex === 0 && isExperimental.value) {
    return activeTimelineSlideIndex.value
  }
  return activeFlickrIndex.value
})

// The Jorge Castro tribute quote plays in two sequential halves over the
// featured hold so the guardian plate stays compact.
const featuredOpeningQuotePart = computed(() => {
  const parts = ghostsInTheMistOpeningSlide.descriptionParts
  const partWindow = ghostsInTheMistOpeningSlide.holdSeconds / parts.length
  const elapsed = Math.max(0, props.playlistCurrentTime ?? 0)
  return parts[Math.min(parts.length - 1, Math.floor(elapsed / partWindow))]
})

const mixedPhotosToUse = computed(() => {
  if (isWolvesExperience.value && props.trackIndex === 0 && isExperimental.value) {
    return trackZeroSlides.value
  }
  return mixedPhotos.value
})

function beginCrossfade(duration: number) {
  if (crossfadeTimer) {
    clearTimeout(crossfadeTimer)
  }
  crossfadeActive.value = true
  crossfadeTimer = setTimeout(() => {
    crossfadeActive.value = false
    crossfadeTimer = null
  }, duration + 50)
}

// Keep the current buffer visible until the incoming image has loaded. Switching
// buffers before decode briefly exposed the wallpaper behind the gallery.
//
// Repeat preloads of the same URL are left to the browser's HTTP cache rather
// than a retained decoded-image map: holding decoded bitmaps for a gallery this
// size costs real memory across a thirty-minute unattended run, and measuring it
// against the movie-flow harness showed no improvement that could be told apart
// from run-to-run noise.
function preloadUrl(url: string, priority: 'high' | 'low'): Promise<number | null> {
  return new Promise((resolve) => {
    const image = new Image()
    image.fetchPriority = priority
    image.onload = () => {
      const aspect = slideAspectFromNaturalSize(image.naturalWidth, image.naturalHeight)
      void image.decode().catch(() => undefined).then(() => resolve(aspect))
    }
    image.onerror = () => resolve(null)
    image.src = url
  })
}

function preloadPhoto(photo: any, priority: 'high' | 'low' = 'low'): Promise<void> {
  const urls = photo?.type === 'daynight'
    ? [`${baseUrl}img/wallpapers/${photo.dayName}`, `${baseUrl}img/wallpapers/${photo.nightName}`]
    : [getFlickrPhotoUrl(photo)]
  return Promise.all(urls.map(url => preloadUrl(url, priority))).then((aspects) => {
    // Day/night halves share an aspect; take whichever half measured.
    const aspect = aspects.find(candidate => candidate !== null)
    if (photo?.id && aspect != null) {
      measuredSlideAspects.set(photo.id, aspect)
    }
  })
}

let slideChangeToken = 0

/**
 * URL of a track's authored opening slide, or null when its first slide is only
 * decided by the shuffle at snapshot time.
 *
 * `preloadUpcoming()` only ever looks *within* the current track's list, so
 * nothing warms the first slide of the next track. That slide is the one the
 * decode gate then blocks on at the boundary, and for Track 2 it is a remote
 * multi-megabyte hero photo — so Part II opened on Part I's last image until
 * the fetch landed. Track 2's opening is authored and therefore knowable ahead
 * of the boundary; the rest are covered by the transition overlay.
 */
function authoredOpeningUrlForTrack(trackIndex: number | undefined): string | null {
  if (!isWolvesExperience.value || trackIndex !== ghostsInTheMistOpeningSlide.trackIndex) {
    return null
  }
  const photo = flickrPhotos.value.find(candidate => candidate.id === ghostsInTheMistOpeningSlide.photoId)
  if (!photo) {
    return null
  }
  return `https://live.staticflickr.com/${photo.server}/${photo.id}_${photo.secret}_${ghostsInTheMistOpeningSlide.imageSizeSuffix}.jpg`
}

// The runtime publishes the incoming segment one crossfade window before the
// boundary (and immediately on a manual skip), which is the head start this
// needs. Fetching here leaves the bytes in the browser's HTTP cache, so the
// decode gate at the boundary resolves in decode time instead of fetch time.
watch(() => props.pendingTrackIndex, (pendingTrackIndex) => {
  if (pendingTrackIndex === undefined || pendingTrackIndex === props.trackIndex) {
    return
  }
  const url = authoredOpeningUrlForTrack(pendingTrackIndex)
  if (url) {
    void preloadUrl(url, 'high')
  }
}, { immediate: true })

// Preload depth and the shortest hold it can cover are one contract, so they
// live together in `wolves-slide-preload.ts` and the Director's Cut schedule
// test asserts its floor against the same constants this reader runs on.

watch([activeDisplayIndex, mixedPhotosToUse, trackChangeSerial], ([newVal]) => {
  const activePhotoObj = mixedPhotosToUse.value[newVal]
  if (!activePhotoObj) {
    return
  }
  const displayedIndex = activeBuffer.value === 'A' ? slideAIndex.value : slideBIndex.value
  if (activePhoto.value === activePhotoObj && displayedIndex === newVal) {
    // Already on stage (a boundary bump that resolved to the same slide object).
    return
  }
  if ((props.trackIndex ?? 0) > 0) {
    shownLaterTrackPhotoIds.add(activePhotoObj.id)
  }
  // Preload far enough ahead to cover a fetch and decode before the cue lands.
  // The depth is measured in seconds of upcoming slides, not in slides: the old
  // rule preloaded three slides only when the current one was under a second and
  // one otherwise, so a rapid roughly 1.6s-per-slide barrage got a single
  // slide of warning for a multi-megabyte photo. On a cold cache that is not
  // enough time, and the swap below waits for decode, so the previous slide
  // holds past its beat and the whole sequence walks off the music.
  //
  // This runs only after the slide that is going on screen *now* has been
  // fetched. A browser opens about six connections per host, so starting a dozen
  // lookahead fetches first puts the visible slide at the back of the queue and
  // makes the very stall the lookahead exists to prevent.
  function preloadUpcoming() {
    let coveredSeconds = 0
    for (let ahead = 1; ahead <= MAX_LOOKAHEAD_SLIDES; ahead++) {
      const nextIndex = (newVal + ahead) % mixedPhotosToUse.value.length
      const nextPhoto = mixedPhotosToUse.value[nextIndex]
      if (!nextPhoto) {
        continue
      }
      void preloadPhoto(nextPhoto)
      // Assume a short slide when a duration is not authored, so the window
      // over-covers rather than under-covers.
      coveredSeconds += (nextPhoto as { duration?: number }).duration ?? 2
      if (coveredSeconds >= PRELOAD_WINDOW_SECONDS) {
        break
      }
    }
  }

  const changeToken = ++slideChangeToken
  if (photoA.value === null && photoB.value === null) {
    photoA.value = activePhotoObj
    slideAIndex.value = newVal
    activeBuffer.value = 'A'
    opacityA.value = 1
    opacityB.value = 0
    crossfadeActive.value = false
    preloadUpcoming()
    return
  }

  void preloadPhoto(activePhotoObj, 'high').then(() => {
    if (changeToken !== slideChangeToken) {
      return
    }
    preloadUpcoming()

    // Swap only after the incoming image is decoded, so the wallpaper cannot
    // flash through an empty buffer during the crossfade.
    beginCrossfade(currentSlideTransitionDuration.value)
    if (activeBuffer.value === 'A') {
      photoB.value = activePhotoObj
      slideBIndex.value = newVal
      activeBuffer.value = 'B'
      opacityB.value = 1
      opacityA.value = 0
    }
    else {
      photoA.value = activePhotoObj
      slideAIndex.value = newVal
      activeBuffer.value = 'A'
      opacityA.value = 1
      opacityB.value = 0
    }
  })
}, { immediate: true })

watch(() => props.experienceId, () => {
  slideChangeToken++
  laterTrackPhotos.value = []
  shuffledLaterTrackPhotos.value = []
  shownLaterTrackPhotoIds.clear()
  photoA.value = null
  photoB.value = null
  slideAIndex.value = -1
  slideBIndex.value = -1
  activeBuffer.value = 'A'
  crossfadeActive.value = false
  if (props.trackIndex !== undefined && props.trackIndex > 0) {
    snapshotLaterTrackPhotos()
  }
})

watch(() => props.trackIndex, (trackIndex, previousTrackIndex) => {
  if (trackIndex !== undefined && trackIndex > 0) {
    snapshotLaterTrackPhotos()
  }
  if (previousTrackIndex !== undefined) {
    slideChangeToken++
    // Do NOT blank both buffers here. Emptying them made the slide watcher take
    // its cold-start branch, which assigns the incoming photo synchronously and
    // skips both the decode gate and the crossfade — a hard cut to an empty
    // frame that then popped in a multi-megabyte remote photo. Four of the five
    // boundaries hid it behind the transition overlay; Part I -> Part II, which
    // deliberately has no overlay, showed it to the room.
    //
    // The reset still happens, just on the buffer that is off stage: the
    // outgoing track's photo is cleared so it can never be reused, while the
    // visible frame holds until the incoming image has decoded and the normal
    // preload-then-crossfade path swaps it out.
    if (activeBuffer.value === 'A') {
      photoB.value = null
      slideBIndex.value = -1
    }
    else {
      photoA.value = null
      slideAIndex.value = -1
    }
    if (crossfadeTimer) {
      clearTimeout(crossfadeTimer)
      crossfadeTimer = null
    }
    crossfadeActive.value = false
    trackChangeSerial.value++
  }
}, { immediate: true })

watch(flickrPhotos, (photos) => {
  const trackIndex = props.trackIndex
  if (photos.length > 0 && trackIndex !== undefined && trackIndex > 0) {
    snapshotLaterTrackPhotos()
  }
})

function getFlickrPhotoUrl(photo: any) {
  if (!photo) {
    return ''
  }
  if (photo.isLocal) {
    if (photo.type === 'daynight') {
      return `${baseUrl}img/wallpapers/${duskIsNight.value ? photo.nightName : photo.dayName}`
    }
    return `${baseUrl}img/wallpapers/${photo.path}`
  }
  return photo.path
}

// Most wallpapers use object-fit: contain to avoid cropping, but a few
// unusually panoramic assets (see wideAspectStems in generate-wallpapers.js)
// letterbox badly under contain, so they opt into cover instead.
function photoObjectFit(photo: any) {
  return photo?.fit === 'cover' ? 'cover' : 'contain'
}

function photoObjectPosition(photo: any) {
  return isWolvesExperience.value && photo?.id === ghostsInTheMistOpeningSlide.photoId ? 'center top' : 'center'
}

/**
 * Caption text. The frozen Wolves show keeps its historical raw titles: the
 * derivation withholds a caption for titles that encode nothing, and 25 photos
 * in the Wolves later-track rotation carry camera-roll names (`A7V06139`,
 * `CRJ07242`). Suppressing those would take the `CNCF STREAM //` credit off the
 * screen with them, which is a change to the authored show, not to the
 * catalogue.
 */
function photoCaptionText(photo: any) {
  if (isWolvesExperience.value) {
    return photo?.title || 'Untitled slide'
  }
  return formatGalleryCaption(photo?.title)
}

function photoCaptionLabel(photo: any) {
  return getGalleryCaptionLabel(photo ?? {})
}

/**
 * The frozen Wolves show keeps its historical plain shuffle. Back-catalogue
 * albums get event-diverse CNCF ordering with the curated slides merged in at
 * uniformly random positions and spaced apart. See `back-catalogue-order.ts`.
 */
function orderGalleryPool(pool: any[]): any[] {
  if (isWolvesExperience.value) {
    return shuffleWolvesGalleryPhotos(pool)
  }
  return orderBackCatalogueSlides(
    pool.filter(photo => isCncfSlide(photo)),
    pool.filter(photo => !isCncfSlide(photo)),
  )
}

function snapshotLaterTrackPhotos() {
  const scheduledIds = new Set(trackZeroSlides.value.map(slide => slide.id))
  const remotePhotos = flickrPhotos.value
    .filter(photo => !trackZeroFlickrPhotoIds.has(photo.id) && !scheduledIds.has(photo.id))
    .map((photo) => {
      const isFeaturedOpening = isWolvesExperience.value && photo.id === ghostsInTheMistOpeningSlide.photoId
      return {
        id: photo.id,
        isLocal: false,
        path: `https://live.staticflickr.com/${photo.server}/${photo.id}_${photo.secret}_${isFeaturedOpening ? ghostsInTheMistOpeningSlide.imageSizeSuffix : 'b'}.jpg`,
        title: isFeaturedOpening ? ghostsInTheMistOpeningSlide.title : photo.title,
        description: isFeaturedOpening ? ghostsInTheMistOpeningSlide.descriptionParts.join('\n\n') : undefined,
        type: 'single' as const,
        dayName: undefined,
        nightName: undefined,
        kind: 'cncf' as const,
        rawPhoto: photo
      }
    })
  // Authored Wolves tracks use only the contributor-summit feed after the
  // one Jorge hero opening in Track 2. Generic catalogue albums mix the CNCF
  // stream with the whole curated catalogue: portraits and lore, product
  // showcase, mascot art, and the comic hero shots.
  const galleryCandidates = isWolvesExperience.value
    ? remotePhotos
    : [
        ...trackZeroCarryForwardPhotos.value,
        ...backCatalogueCuratedPhotos.value,
        ...remotePhotos,
      ]
  if (galleryCandidates.length === 0) {
    shuffledLaterTrackPhotos.value = []
    shownLaterTrackPhotoIds.clear()
    laterTrackPhotos.value = []
    return
  }

  const featuredOpening = isWolvesExperience.value
    ? galleryCandidates.find(photo => photo.id === ghostsInTheMistOpeningSlide.photoId)
    : undefined
  const shufflePool = isWolvesExperience.value
    ? galleryCandidates.filter(photo => photo.id !== ghostsInTheMistOpeningSlide.photoId)
    : galleryCandidates
  if (shuffledLaterTrackPhotos.value.length === 0) {
    shuffledLaterTrackPhotos.value = orderGalleryPool(shufflePool)
  }
  else {
    const knownIds = new Set(shuffledLaterTrackPhotos.value.map(photo => photo.id))
    const newPhotos = shufflePool.filter(photo => !knownIds.has(photo.id))
    if (newPhotos.length > 0) {
      shuffledLaterTrackPhotos.value.push(...orderGalleryPool(newPhotos))
    }
  }

  const displayedPhotoIds = new Set([photoA.value?.id, photoB.value?.id])
  const availablePhotos = shuffledLaterTrackPhotos.value
    .filter(photo => !shownLaterTrackPhotoIds.has(photo.id) && !displayedPhotoIds.has(photo.id))
  laterTrackPhotos.value = isWolvesExperience.value
    && props.trackIndex === ghostsInTheMistOpeningSlide.trackIndex
    && featuredOpening
    ? [featuredOpening, ...availablePhotos]
    : availablePhotos
}

function deterministicShuffle<T>(array: T[], seed = 42): T[] {
  const copy = [...array]
  let currentSeed = seed
  const random = () => {
    const x = Math.sin(currentSeed++) * 10000
    return x - Math.floor(x)
  }
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

function handleImageError(event: Event, photo: any) {
  const img = event.target as HTMLImageElement
  if (!photo) {
    return
  }

  if (img.src.includes('bluespeed-cluster.png')) {
    // Already fell back to local cluster wallpaper, stop recursion
    return
  }

  // If this is a remote Flickr photo and we tried _b.jpg, fallback to _z.jpg (guaranteed fallback)
  if (!photo.isLocal && img.src.includes('_b.jpg')) {
    img.src = img.src.replace('_b.jpg', '_z.jpg')
    return
  }

  // If _z.jpg also fails or if it's already on _z.jpg, fallback to medium size (no suffix)
  if (!photo.isLocal && img.src.includes('_z.jpg')) {
    img.src = img.src.replace('_z.jpg', '.jpg')
    return
  }

  // Final fallback to a guaranteed gorgeous local showcase screenshot to avoid "black screens"
  img.src = `${baseUrl}img/wallpapers/wolves/showcase/bluespeed-cluster.png`
}

// Template refs ────────────────────────────────────────────────────────────
const flipViewport = ref<HTMLElement | null>(null)

// Utilities ────────────────────────────────────────────────────────────────

function shuffleWallpapers(array: any[]): any[] {
  const itemsWithScores = array.map((item) => {
    const isPeople = item.name?.includes('/people/') || item.dayName?.includes('/people/') || item.nightName?.includes('/people/')
    const r = Math.random()
    // if people, score is in [0.45, 1.05] (tends toward end)
    // if showcase or story illustration, score is in [0.0, 0.6] (tends toward start)
    const score = isPeople ? 0.45 + r * 0.6 : r * 0.6
    return { item, score }
  })

  // Sort by the assigned score
  itemsWithScores.sort((a, b) => a.score - b.score)

  return itemsWithScores.map(x => x.item)
}

async function loadComicPdf() {
  pdfLoading.value = false
  pdfError.value = ''
}

// Lifecycle ────────────────────────────────────────────────────────────────
onMounted(async () => {
  loadComicPdf()
  duskTimer = setInterval(() => {
    duskIsNight.value = !duskIsNight.value
  }, 6000) // Toggle dusk day/night state every 6 seconds for a soothing cycle

  try {
    manifest.value = await loadWolvesSoundtrack()
  }
  catch (err) {
    console.error('[wolves] Failed to load wolves soundtrack manifest', err)
  }

  try {
    const response = await fetch(`${import.meta.env.BASE_URL}flickr-photos.json`)
    if (response.ok) {
      const rawPhotos = await response.json()
      flickrPhotos.value = Array.isArray(rawPhotos) ? rawPhotos : []
    }
  }
  catch (err) {
    console.error('[wolves] Failed to fetch Flickr photos list', err)
  }
})

onBeforeUnmount(() => {
  if (duskTimer) {
    clearInterval(duskTimer)
  }
  if (crossfadeTimer) {
    clearTimeout(crossfadeTimer)
  }
})
</script>

<template>
  <section
    id="comic-reader"
    class="comic-reader-section"
    :class="{ 'comic-reader-section--fast-crossfade': usesFastCrossfade }"
  >
    <div class="page-flip-comic-layout">
      <div
        ref="flipViewport"
        class="comic-viewport"
        :class="{ 'comic-viewport--showcase': showcaseSlideActive }"
      >
        <div class="comic-content-area">
          <!-- Live Gallery Mode (Tracks 1-6) -->
          <div
            v-if="(props.trackIndex && props.trackIndex > 0) || (props.trackIndex === 0 && isExperimental)"
            class="flickr-gallery-wrapper"
            :data-crossfade-ms="currentSlideTransitionDuration"
          >
            <!-- Layer A -->
            <div
              class="flickr-photo-layer"
              :style="{
                opacity: activeBuffer === 'A' ? 1 : 0,
                transition: crossfadeActive ? `opacity ${currentSlideTransitionDuration}ms linear` : 'none',
                zIndex: activeBuffer === 'A' ? 2 : 1,
              }"
            >
              <template v-if="photoA && photoA.type === 'daynight'">
                <div class="wallpaper-container daynight" style="width: 100%; height: 100%;">
                  <img
                    :src="`${baseUrl}img/wallpapers/${photoA.dayName}`"
                    class="flickr-img"
                    :style="{ objectFit: photoObjectFit(photoA) }"
                    alt="Bluefin Dusk - Day"
                    @load="handleSlideImgLoad(photoA, $event)"
                  >
                  <img
                    :src="`${baseUrl}img/wallpapers/${photoA.nightName}`"
                    class="flickr-img night-overlay"
                    :style="{ opacity: daynightNightOpacityA, objectFit: photoObjectFit(photoA) }"
                    alt="Bluefin Dusk - Night"
                  >
                </div>
              </template>
              <template v-else-if="photoA">
                <img
                  :src="getFlickrPhotoUrl(photoA)"
                  class="flickr-img"
                  :style="{ objectFit: photoObjectFit(photoA), objectPosition: photoObjectPosition(photoA) }"
                  :alt="photoA.title"
                  @error="(e) => handleImageError(e, photoA)"
                  @load="handleSlideImgLoad(photoA, $event)"
                >
              </template>
            </div>

            <!-- Layer B -->
            <div
              class="flickr-photo-layer"
              :style="{
                opacity: activeBuffer === 'B' ? 1 : 0,
                transition: crossfadeActive ? `opacity ${currentSlideTransitionDuration}ms linear` : 'none',
                zIndex: activeBuffer === 'B' ? 2 : 1,
              }"
            >
              <template v-if="photoB && photoB.type === 'daynight'">
                <div class="wallpaper-container daynight" style="width: 100%; height: 100%;">
                  <img
                    :src="`${baseUrl}img/wallpapers/${photoB.dayName}`"
                    class="flickr-img"
                    :style="{ objectFit: photoObjectFit(photoB) }"
                    alt="Bluefin Dusk - Day"
                    @load="handleSlideImgLoad(photoB, $event)"
                  >
                  <img
                    :src="`${baseUrl}img/wallpapers/${photoB.nightName}`"
                    class="flickr-img night-overlay"
                    :style="{ opacity: daynightNightOpacityB, objectFit: photoObjectFit(photoB) }"
                    alt="Bluefin Dusk - Night"
                  >
                </div>
              </template>
              <template v-else-if="photoB">
                <img
                  :src="getFlickrPhotoUrl(photoB)"
                  class="flickr-img"
                  :style="{ objectFit: photoObjectFit(photoB), objectPosition: photoObjectPosition(photoB) }"
                  :alt="photoB.title"
                  @error="(e) => handleImageError(e, photoB)"
                  @load="handleSlideImgLoad(photoB, $event)"
                >
              </template>
            </div>

            <!-- Sleek photo caption: slides with a description or an owner-authorized title-only
                 banner get the large fullscreen theater treatment instead of the compact pill. -->
            <div
              v-if="activePhoto && (activePhoto.description || activePhoto.theaterTitleOnly)"
              class="wallpaper-theater-caption"
              :class="{
                'is-title-only': activePhoto.theaterTitleOnly,
                'is-featured-opening': isWolvesExperience && activePhoto.id === ghostsInTheMistOpeningSlide.photoId,
              }"
            >
              <template v-if="isWolvesExperience && activePhoto.id === ghostsInTheMistOpeningSlide.photoId">
                <div class="theater-guardian-header" aria-hidden="true">
                  <div class="theater-guardian-horizon theater-guardian-horizon-left" />
                  <svg class="theater-guardian-crest" viewBox="0 0 100 100">
                    <polygon points="50,5 85,20 95,55 50,95 5,55 15,20" class="theater-guardian-crest-outer" />
                    <polygon points="50,12 78,25 87,52 50,85 13,52 22,25" class="theater-guardian-crest-inner" />
                    <path d="M35,45 L50,60 L65,45" class="theater-guardian-crest-chevron" />
                  </svg>
                  <div class="theater-guardian-horizon theater-guardian-horizon-right" />
                </div>
                <p class="theater-guardian-label">
                  TRUSTEE // GUARDIAN
                </p>
                <p class="theater-guardian-class">
                  {{ ghostsInTheMistOpeningSlide.guardianClass }}
                </p>
                <p class="theater-guardian-name">
                  {{ activePhoto.title }}
                </p>
                <p class="theater-guardian-title">
                  <template v-for="(token, tIdx) in ghostsInTheMistOpeningSlide.guardianTitle.split(' | ')" :key="tIdx">
                    <span v-if="tIdx > 0" class="theater-guardian-title-sep" aria-hidden="true">|</span>
                    {{ token }}
                  </template>
                </p>
              </template>
              <p v-else class="wallpaper-theater-caption-title">
                {{ activePhoto.title }}
              </p>
              <template v-if="activePhoto.description">
                <p
                  v-for="(paragraph, pIdx) in (isWolvesExperience && activePhoto.id === ghostsInTheMistOpeningSlide.photoId
                    ? featuredOpeningQuotePart
                    : activePhoto.description).split('\n\n')"
                  :key="pIdx"
                  class="wallpaper-theater-caption-body"
                >
                  {{ paragraph }}
                </p>
              </template>
            </div>
            <div v-else-if="activePhoto && photoCaptionText(activePhoto)" class="flickr-caption font-mono">
              <span class="caption-label text-cyan">
                {{ photoCaptionLabel(activePhoto) }}
              </span>
              {{ photoCaptionText(activePhoto) }}
            </div>
          </div>

          <template v-else>
            <!-- Page 1 (Cover Page) -->
            <div v-if="page === 1" class="wallpaper-viewport-wrapper">
              <div class="wallpaper-display-card animate-fade">
                <div class="wallpaper-container cover-container">
                  <img
                    :src="`${baseUrl}img/color-with-bluefin-cover.webp`"
                    class="wallpaper-img"
                    alt="Color with Bluefin Coloring Book Cover"
                    loading="eager"
                  >
                </div>
                <!-- Decorative caption with download link -->
                <div class="wallpaper-caption font-mono flex items-center gap-2">
                  <span class="caption-label text-cyan">BLUEFIN ARCHIVE //</span> Color with Bluefin
                  <span class="text-gray-500 mx-1">|</span>
                  <a
                    :href="pdfUrl"
                    download="color-with-bluefin.pdf"
                    class="text-cyan hover:text-white transition-colors"
                    title="Download full coloring book PDF (19MB)"
                  >
                    Download PDF (19MB)
                  </a>
                </div>
              </div>
            </div>

            <!-- Wallpaper Pages (Pages 2-15) -->
            <div v-if="page > 1" class="wallpaper-viewport-wrapper">
              <template v-for="(wp, idx) in shuffledWallpapers" :key="idx">
                <div v-if="page === idx + 2" class="wallpaper-display-card animate-fade">
                  <div v-if="wp.type === 'single'" class="wallpaper-container">
                    <img
                      :src="`${baseUrl}img/wallpapers/${wp.name}`"
                      class="wallpaper-img"
                      :style="{ objectFit: photoObjectFit(wp) }"
                      :alt="wp.title"
                    >
                  </div>
                  <div v-else-if="wp.type === 'daynight'" class="wallpaper-container daynight">
                    <img
                      :src="`${baseUrl}img/wallpapers/${wp.dayName}`"
                      class="wallpaper-img"
                      :style="{ objectFit: photoObjectFit(wp) }"
                      alt="Bluefin Dusk - Day"
                    >
                    <img
                      :src="`${baseUrl}img/wallpapers/${wp.nightName}`"
                      class="wallpaper-img night-overlay"
                      :class="{ 'is-night': duskIsNight }"
                      :style="{ objectFit: photoObjectFit(wp) }"
                      alt="Bluefin Dusk - Night"
                    >
                  </div>
                  <!-- Decorative caption: description-backed and owner-authorized title-only
                       slides use the large fullscreen theater treatment. -->
                  <div
                    v-if="wp.description || wp.theaterTitleOnly"
                    class="wallpaper-theater-caption"
                    :class="{ 'is-title-only': wp.theaterTitleOnly }"
                  >
                    <p class="wallpaper-theater-caption-title">
                      {{ wp.title }}
                    </p>
                    <template v-if="wp.description">
                      <p
                        v-for="(paragraph, pIdx) in wp.description.split('\n\n')"
                        :key="pIdx"
                        class="wallpaper-theater-caption-body"
                      >
                        {{ paragraph }}
                      </p>
                    </template>
                  </div>
                  <div v-else class="wallpaper-caption font-mono">
                    <span class="caption-label text-cyan">BLUEFIN ARCHIVE //</span> {{ wp.title || 'Untitled slide' }}
                  </div>
                </div>
              </template>
            </div>
          </template>
        </div>
      </div>

      <!-- Bottom control bar removed (fused into soundtrack widget) -->
    </div>
  </section>
</template>

<style scoped lang="scss">
.comic-toolbar {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
  width: 100%;
  max-width: 760px;
  margin-left: auto;
  margin-right: auto;

  @media (min-width: 600px) {
    flex-direction: row;
    align-items: center;
  }
}

.autoplay-toggle-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background-color: #10151f;
  border: 1px solid #272727;
  color: #bdbdbd;
  font-size: 0.85rem;
  font-weight: 700;
  padding: 8px 16px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    border-color: rgba(66, 133, 244, 0.4);
    color: #ffffff;
  }

  &.is-active {
    border-color: #27c93f;
    color: #27c93f;
    box-shadow: 0 0 10px rgba(39, 201, 63, 0.2);

    .indicator-dot {
      background-color: #27c93f;
      box-shadow: 0 0 8px #27c93f;
    }
  }

  .indicator-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background-color: #5d5d5d;
    transition: all 0.2s ease;
  }
}

.mode-selectors {
  display: flex;
  background-color: #10151f;
  padding: 4px;
  border-radius: 8px;
  border: 1px solid #272727;
  align-self: flex-start;

  button {
    background: none;
    border: none;
    color: #bdbdbd;
    font-size: 1.2rem;
    font-weight: 700;
    padding: 6px 12px;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s;

    &[aria-selected='true'] {
      background-color: var(--color-blue);
      color: #ffffff;
    }

    &[aria-selected='false']:hover {
      color: #ffffff;
    }
  }
}

.comic-viewport {
  position: relative;
  width: 100%;
  // 3:2 matches the dominant slide aspect (165 of 240 wallpapers), so most
  // slides fill the portal edge to edge instead of letterboxing.
  aspect-ratio: 3 / 2;
  min-height: 220px;
  max-width: 760px;
  max-height: min(74dvh, 760px);
  margin: 0 auto;
  // Translucent surface: when a slide still letterboxes, the bars reveal the
  // blurred wallpaper behind the portal instead of solid black. Showcase
  // slides (see below) drop this surface entirely.
  background-color: rgba(16, 21, 31, 0.55);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border: 1px solid rgba(var(--color-blue-rgb), 0.3);
  border-radius: 16px;
  overflow: hidden;
  display: flex;
  flex-direction: column;

  .comic-content-area {
    flex: 1;
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 220px;
    padding: 12px;
    overflow: hidden;
  }

  .nav-btn {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background-color: rgba(0, 0, 0, 0.7);
    border: 1px solid #272727;
    color: #ffffff;
    font-size: 1.6rem;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s;
    z-index: 10;

    &:hover {
      background-color: #000;
      color: var(--color-blue-light);
      border-color: var(--color-blue-light);
    }

    &.prev {
      left: 12px;
    }
    &.next {
      right: 12px;
    }
  }
}

.pdf-page-canvas {
  display: block;
  width: auto;
  height: auto;
  max-width: 100%;
  max-height: 100%;
}

// Showcase slides — portrait photographs and the character hero art — cannot
// fill the 3:2 portal, so the frosted surface reads as a grey slab flanking
// the image. Drop the surface and let the stage artwork behind the portal
// show through; the border stays so the portal keeps its frame. Composes
// with `.comic-reader-section--fast-crossfade` below: both set
// `backdrop-filter: none`, so neither contradicts the other. Background and
// backdrop changes are paint-only — no layout shift when the class toggles.
.comic-viewport--showcase {
  background-color: transparent;
  backdrop-filter: none;
  -webkit-backdrop-filter: none;
}

.comic-status-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 48px 32px;
  text-align: center;
  color: #bdbdbd;
  font-size: 1.4rem;

  &.is-error {
    color: var(--color-blue-light);
  }

  .spinner {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    border: 3px solid rgba(var(--color-blue-rgb), 0.25);
    border-top-color: var(--color-blue);
    animation: comic-spinner-spin 0.8s linear infinite;
  }
}

@keyframes comic-spinner-spin {
  to {
    transform: rotate(360deg);
  }
}

.comic-caption-bar {
  background-color: rgba(0, 0, 0, 0.9);
  padding: 16px 24px;
  border-top: 1px solid #272727;
  text-align: center;
  font-size: 1.3rem;
  color: #ffffff;
  font-weight: 500;
  line-height: 1.5;
}

.reader-controls {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  max-width: 760px;
  margin: 0 auto;
  padding: 0;
  gap: 8px 12px;
  flex-wrap: wrap;

  .ctrl-btn {
    background-color: #10151f;
    border: 1px solid #272727;
    color: #bdbdbd;
    font-size: 1.2rem;
    font-weight: 700;
    padding: 8px 16px;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s;

    &:hover:not(:disabled) {
      color: #ffffff;
      border-color: var(--color-blue-light);
    }

    &:disabled {
      opacity: 0.3;
      cursor: not-allowed;
    }
  }

  .kbd-hint {
    font-size: 1.1rem;
    color: #616161;
  }

  .jump-select-wrap {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 1.2rem;
    color: #bdbdbd;

    select {
      background-color: #10151f;
      border: 1px solid #272727;
      color: #ffffff;
      padding: 6px 12px;
      border-radius: 6px;
      font-size: 1.2rem;
      cursor: pointer;

      &:focus {
        outline: none;
        border-color: var(--color-blue-light);
      }
    }
  }
}

// Wallpaper Gallery Styling ──────────────────────────────────────────────────
.wallpaper-viewport-wrapper {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.wallpaper-display-card {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;

  &.scroll-mode {
    height: 100%;
    width: 100%;
  }
}

.wallpaper-container {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: transparent;
}

.wallpaper-img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  object-position: center;
  transition: opacity 3s linear;
  will-change: opacity;
  transform: translateZ(0);
  backface-visibility: hidden;
}

.night-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: contain;
  opacity: 0;
  pointer-events: none;
  transition: opacity 150ms linear;
  will-change: opacity;
  transform: translateZ(0);
  backface-visibility: hidden;

  &.is-night {
    opacity: 1;
  }
}

.wallpaper-caption {
  position: absolute;
  bottom: 12px;
  left: 50%;
  transform: translateX(-50%);
  background-color: rgba(16, 21, 31, 0.85);
  border: 1px solid rgba(66, 133, 244, 0.3);
  color: #ffffff;
  padding: 6px 16px;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  z-index: 5;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  max-width: min(90%, 42rem);
  white-space: normal;
  overflow-wrap: anywhere;
  text-align: center;
  line-height: 1.4;

  .caption-label {
    font-weight: bold;
  }
}

/* Fullscreen "theater" caption for slides with a `description` (e.g. a real interview still),
   sized for a 10-foot living-room viewing distance instead of the standard small archive pill:
   large type, high contrast, and generous spacing so the title and quote read clearly from
   across a room rather than up close at a desk. */
.wallpaper-theater-caption {
  position: absolute;
  bottom: 6%;
  left: 50%;
  transform: translateX(-50%);
  width: min(90%, 60rem);
  max-height: 55%;
  overflow-y: auto;
  background-color: rgb(10 14 22 / 88%);
  border: 1px solid rgb(66 133 244 / 35%);
  border-radius: 1rem;
  padding: clamp(1.25rem, 1rem + 1.2vw, 2.25rem);
  color: #f5f5f5;
  z-index: 5;
  box-shadow: 0 8px 30px rgb(0 0 0 / 55%);
  backdrop-filter: blur(6px);
  text-shadow: 0 2px 8px rgb(0 0 0 / 70%);

  &.is-featured-opening {
    bottom: 2%;
    width: min(96%, 72rem);
    max-height: 60%;
    padding-block: clamp(0.7rem, 0.5rem + 0.5vw, 1rem);
    text-align: center;

    .wallpaper-theater-caption-body {
      margin-bottom: 0.6rem;
      font-size: clamp(1.15rem, 1rem + 0.5vw, 1.45rem);
      line-height: 1.4;
    }
  }

  &.is-title-only {
    bottom: 8%;
    width: min(94%, 76rem);
    max-height: 70%;
    padding: clamp(1.5rem, 1rem + 2vw, 3.5rem);
    text-align: center;

    .wallpaper-theater-caption-title {
      margin: 0;
      font-size: clamp(3rem, 1.8rem + 3.5vw, 5.5rem);
      font-weight: 900;
      line-height: 1;
      color: #e0f2fe;
    }
  }
}

.wallpaper-theater-caption-title {
  margin: 0 0 0.75rem;
  font-size: clamp(1.8rem, 1.4rem + 1.4vw, 2.6rem);
  font-weight: 700;
  line-height: 1.25;
  color: #93c5fd;
}

.wallpaper-theater-caption-body {
  margin: 0 0 1rem;
  font-size: clamp(1.3rem, 1.1rem + 0.7vw, 1.7rem);
  line-height: 1.5;

  &:last-child {
    margin-bottom: 0;
  }
}

/* Guardian nameplate treatment for the featured Ghosts In The Mist opening slide, mirroring
   the intro video's guardian plates (crest, horizon lines, class label, gradient name) in the
   burnished silver trustee palette shared with Cortney Nickerson's intro plate. */
.theater-guardian-header {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  margin-bottom: 0.4rem;
}

.theater-guardian-horizon {
  flex: 1 1 auto;
  height: 2px;
  min-width: 2rem;
  background: linear-gradient(to right, transparent, #d1d5db 60%, #fff 100%);
  box-shadow: 0 0 8px rgb(226 232 240 / 55%);
}

.theater-guardian-horizon-right {
  background: linear-gradient(to left, transparent, #d1d5db 60%, #fff 100%);
}

.theater-guardian-crest {
  width: 2.5rem;
  height: 2.5rem;
  flex: 0 0 auto;
  filter: drop-shadow(0 0 6px rgb(226 232 240 / 65%));
}

.theater-guardian-crest-outer {
  fill: none;
  stroke: #d1d5db;
  stroke-width: 2;
}

.theater-guardian-crest-inner {
  fill: rgb(8 12 20 / 95%);
  stroke: #f5f5f5;
  stroke-width: 1;
}

.theater-guardian-crest-chevron {
  fill: none;
  stroke: #d1d5db;
  stroke-width: 4;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.theater-guardian-label {
  margin: 0;
  font-size: clamp(1.2rem, 1rem + 0.5vw, 1.6rem);
  letter-spacing: 0.35em;
  color: #e5e7eb;
}

.theater-guardian-class {
  margin: 0.3rem 0 0;
  font-size: clamp(1.4rem, 1.1rem + 0.7vw, 1.9rem);
  letter-spacing: 0.05em;
  color: #e2e8f0;
  text-transform: uppercase;
}

.theater-guardian-name {
  margin: 0.2rem 0 0;
  font-size: clamp(2.2rem, 1.7rem + 1.3vw, 3.2rem);
  font-weight: 700;
  line-height: 1.15;
  color: #f5f5f5;
  background: linear-gradient(to bottom, #fff 0%, #e2e8f0 60%, #a0aec0 100%);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  filter: drop-shadow(0 0 10px rgb(255 255 255 / 25%));
}

.theater-guardian-title {
  margin: 0.35rem 0 0.9rem;
  font-size: clamp(1.3rem, 1.1rem + 0.6vw, 1.7rem);
  color: #94a3b8;
}

.theater-guardian-title-sep {
  display: inline-block;
  margin: 0 0.4em;
  color: #38bdf8;
  font-weight: 400;
  text-shadow:
    0 0 6px rgba(56, 189, 248, 0.95),
    0 0 14px rgba(14, 165, 233, 0.7);
}

.animate-fade {
  animation: fadeIn 0.8s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

// Flickr Immersive Slideshow
.flickr-gallery-wrapper {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  background-color: transparent;
}

.flickr-photo-layer {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  will-change: opacity;
  transform: translateZ(0);
  backface-visibility: hidden;
}

.flickr-img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  object-position: center;
}

// Gallery slides crossfade full-size images. Backdrop filtering those surfaces
// forces a large repaint on every opacity transition and produces a visible
// hitch; the static translucent backgrounds preserve contrast without putting
// blur work on the slide-change path. The standard show's Track 0 keeps its
// authored blur; the Director's Cut Track 0 cuts far faster and does not.
.comic-reader-section--fast-crossfade {
  .comic-viewport,
  .flickr-caption,
  .wallpaper-theater-caption {
    backdrop-filter: none;
    -webkit-backdrop-filter: none;
  }
}

.flickr-caption {
  position: absolute;
  bottom: 12px;
  left: 50%;
  transform: translateX(-50%);
  background-color: rgba(16, 21, 31, 0.85);
  border: 1px solid rgba(66, 133, 244, 0.3);
  color: #ffffff;
  padding: 6px 16px;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  z-index: 5;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  max-width: 90%;
  overflow-wrap: anywhere;

  .caption-label {
    font-weight: bold;
  }
}

@keyframes fadeInBuffer {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes fadeOutBuffer {
  from {
    opacity: 1;
  }
  to {
    opacity: 0;
  }
}
</style>
