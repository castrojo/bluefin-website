import { load as loadYaml } from 'js-yaml'
import { loadLoreProjectIndex, validateLoreProjectReferences } from './wolves-projects'

export type LoreKind
  = | 'chatlog'
    | 'character-sheet'
    | 'field-report'
    | 'location-dossier'
    | 'guardian-bond'
    | 'news'
    | 'source'
    | 'quote'

export type GuardianSpecialization = 'controller' | 'operator' | 'reconciler'
export type GuardianClass = 'titan' | 'warlock' | 'hunter'

export interface LoreFrontmatter {
  kind?: LoreKind | 'transmission'
  title?: string
  timestamp?: string
  attribution?: string
  context?: string
  channel?: string
  classification?: string
  sender?: string
  recipient?: string
  location?: string
  subject?: string
  subject_kind?: 'person' | 'dinosaur' | 'location' | 'record'
  affiliation?: string
  aliases?: readonly string[]
  titles?: readonly string[]
  projects?: readonly string[]
  species?: string
  epic_name?: string
  guardian?: {
    public_designation?: 'Guardian'
    internal_designation?: 'Maintainer'
    specializations?: readonly GuardianSpecialization[]
    class?: GuardianClass
    super?: string
  }
  relations?: {
    dinosaur?: string
    riders?: readonly string[]
    guardian?: string
  }
  _editor_prompt?: string
}

export interface LoreRecord {
  id: string
  chapterId: string
  relativePath: string
  metadata: Readonly<LoreFrontmatter>
  body: string
  kind: LoreKind
  diagnostics: readonly string[]
}

export interface DerivedLoreTelemetry {
  resourceName: string
  namespace: 'wolves-lore'
  controller: 'lore-indexer'
  archiveNode: string
  observedGeneration: 1
  phase: 'Indexed'
  recordFingerprint: `fnv1a:${string}`
}

function isMapping(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return false
  }
  const prototype = Object.getPrototypeOf(value)
  return prototype === Object.prototype || prototype === null
}

function stringField(metadata: Record<string, unknown>, field: string): string | undefined {
  const value = metadata[field]
  if (value === undefined) {
    return undefined
  }
  if (typeof value !== 'string') {
    throw new TypeError(`Lore front matter field "${field}" must be a string`)
  }
  return value
}

function stringArrayField(
  metadata: Record<string, unknown>,
  field: 'aliases' | 'titles' | 'projects',
): readonly string[] | undefined {
  const value = metadata[field]
  if (value === undefined) {
    return undefined
  }
  if (!Array.isArray(value) || value.some(item => typeof item !== 'string')) {
    throw new TypeError(`Lore front matter field "${field}" must be an array of strings`)
  }
  return Object.freeze([...value])
}

function parseGuardian(value: unknown): LoreFrontmatter['guardian'] {
  if (value === undefined) {
    return undefined
  }
  if (!isMapping(value)) {
    throw new TypeError('Lore front matter field "guardian" must be a mapping')
  }

  const publicDesignation = value.public_designation
  const internalDesignation = value.internal_designation
  const specializations = value.specializations
  const guardianClass = value.class
  const guardianSuper = value.super
  if (publicDesignation !== undefined && publicDesignation !== 'Guardian') {
    throw new TypeError('Lore front matter guardian.public_designation must be "Guardian"')
  }
  if (internalDesignation !== undefined && internalDesignation !== 'Maintainer') {
    throw new TypeError('Lore front matter guardian.internal_designation must be "Maintainer"')
  }
  if (
    specializations !== undefined
    && (!Array.isArray(specializations)
      || specializations.some(item => item !== 'controller' && item !== 'operator' && item !== 'reconciler'))
  ) {
    throw new TypeError('Lore front matter guardian.specializations must be valid specializations')
  }
  if (guardianClass !== undefined && guardianClass !== 'titan' && guardianClass !== 'warlock' && guardianClass !== 'hunter') {
    throw new TypeError('Lore front matter guardian class must be titan, warlock, or hunter')
  }
  if (guardianSuper !== undefined && typeof guardianSuper !== 'string') {
    throw new TypeError('Lore front matter guardian.super must be a string')
  }

  return Object.freeze({
    public_designation: publicDesignation,
    internal_designation: internalDesignation,
    specializations: specializations === undefined ? undefined : Object.freeze([...specializations]),
    class: guardianClass,
    super: guardianSuper,
  })
}

function parseRelations(value: unknown): LoreFrontmatter['relations'] {
  if (value === undefined) {
    return undefined
  }
  if (!isMapping(value)) {
    throw new TypeError('Lore front matter field "relations" must be a mapping')
  }

  const dinosaur = value.dinosaur
  const riders = value.riders
  const guardian = value.guardian
  if (dinosaur !== undefined && typeof dinosaur !== 'string') {
    throw new TypeError('Lore front matter relations.dinosaur must be a string')
  }
  if (!Array.isArray(riders) && riders !== undefined) {
    throw new TypeError('Lore front matter relations.riders must be an array of strings')
  }
  if (Array.isArray(riders) && riders.some(item => typeof item !== 'string')) {
    throw new TypeError('Lore front matter relations.riders must be an array of strings')
  }
  if (guardian !== undefined && typeof guardian !== 'string') {
    throw new TypeError('Lore front matter relations.guardian must be a string')
  }

  return Object.freeze({
    dinosaur,
    riders: riders === undefined ? undefined : Object.freeze([...riders]),
    guardian,
  })
}

function parseFrontmatter(relativePath: string, raw: string): { metadata: LoreFrontmatter, body: string } {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)([\s\S]*)$/)
  if (!match) {
    if (raw.startsWith('---\n') || raw.startsWith('---\r\n')) {
      throw new TypeError('Lore front matter must close with "---"')
    }
    return { metadata: {}, body: raw }
  }

  const loaded = loadYaml(match[1], { filename: relativePath })
  if (!isMapping(loaded)) {
    throw new TypeError('Lore front matter must be a mapping')
  }

  const kind = loaded.kind
  if (
    kind !== undefined
    && kind !== 'transmission'
    && kind !== 'chatlog'
    && kind !== 'character-sheet'
    && kind !== 'field-report'
    && kind !== 'location-dossier'
    && kind !== 'guardian-bond'
    && kind !== 'news'
    && kind !== 'source'
    && kind !== 'quote'
  ) {
    throw new TypeError('Lore front matter field "kind" must be a valid lore kind')
  }

  const subjectKind = loaded.subject_kind
  if (
    subjectKind !== undefined
    && subjectKind !== 'person'
    && subjectKind !== 'dinosaur'
    && subjectKind !== 'location'
    && subjectKind !== 'record'
  ) {
    throw new TypeError('Lore front matter field "subject_kind" must be a valid subject kind')
  }

  return {
    metadata: {
      kind,
      title: stringField(loaded, 'title'),
      timestamp: stringField(loaded, 'timestamp') ?? stringField(loaded, 'date'),
      attribution: stringField(loaded, 'attribution'),
      context: stringField(loaded, 'context'),
      channel: stringField(loaded, 'channel'),
      classification: stringField(loaded, 'classification'),
      sender: stringField(loaded, 'sender'),
      recipient: stringField(loaded, 'recipient'),
      location: stringField(loaded, 'location'),
      subject: stringField(loaded, 'subject'),
      subject_kind: subjectKind,
      affiliation: stringField(loaded, 'affiliation'),
      aliases: stringArrayField(loaded, 'aliases'),
      titles: stringArrayField(loaded, 'titles'),
      projects: stringArrayField(loaded, 'projects'),
      species: stringField(loaded, 'species'),
      epic_name: stringField(loaded, 'epic_name'),
      guardian: parseGuardian(loaded.guardian),
      relations: parseRelations(loaded.relations),
      _editor_prompt: stringField(loaded, '_editor_prompt'),
    },
    body: match[2].replace(/^\r?\n/, ''),
  }
}

export function parseLoreRecord(
  id: string,
  chapterId: string,
  relativePath: string,
  raw: string,
): LoreRecord {
  const { metadata: authoredMetadata, body } = parseFrontmatter(relativePath, raw)
  const metadata = Object.fromEntries(Object.entries(authoredMetadata).filter(([, value]) => value !== undefined)) as LoreFrontmatter
  const kind = authoredMetadata.kind === 'transmission' ? 'chatlog' : authoredMetadata.kind
  const diagnostics = [
    ...(authoredMetadata.kind === undefined ? ['frontmatter is missing kind'] : []),
    ...(authoredMetadata.title === undefined ? ['frontmatter is missing title'] : []),
    ...(authoredMetadata.timestamp === undefined ? ['frontmatter is missing timestamp'] : []),
    ...(kind === 'quote' && !authoredMetadata.attribution?.trim()
      ? ['frontmatter is missing attribution for quote identity']
      : []),
    ...(authoredMetadata.kind === 'transmission'
      ? ['kind "transmission" is a staged alias for "chatlog"']
      : []),
  ]

  return {
    id,
    chapterId,
    relativePath,
    metadata: Object.freeze(metadata),
    body,
    kind: kind ?? 'chatlog',
    diagnostics: Object.freeze(diagnostics),
  }
}

function fnv1a(value: string): string {
  let hash = 0x811C9DC5
  for (let index = 0; index < value.length; index++) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 0x01000193)
  }
  return (hash >>> 0).toString(16).padStart(8, '0')
}

export function deriveLoreTelemetry(record: LoreRecord): DerivedLoreTelemetry {
  const fingerprint = fnv1a([record.id, record.relativePath, record.kind].join('\0'))

  return {
    resourceName: `lore-${fingerprint}`,
    namespace: 'wolves-lore',
    controller: 'lore-indexer',
    archiveNode: `archive-${fingerprint.slice(-6)}`,
    observedGeneration: 1,
    phase: 'Indexed',
    recordFingerprint: `fnv1a:${fingerprint}`,
  }
}

function isSubjectProfileReference(reference: string | undefined): reference is string {
  return reference !== undefined && /^subjectprofile\/[^/]+$/.test(reference)
}

function findSubjectRecord(records: readonly LoreRecord[], reference: string): LoreRecord | undefined {
  return records.find(record => record.id === reference || record.metadata.subject === reference)
}

export function validateGuardianBonds(records: readonly LoreRecord[]): void {
  for (const bond of records) {
    if (bond.kind !== 'guardian-bond') {
      continue
    }

    const guardianReference = bond.metadata.relations?.guardian
    const dinosaurReference = bond.metadata.relations?.dinosaur
    if (!isSubjectProfileReference(guardianReference)) {
      throw new TypeError(`${bond.id} has invalid guardian reference "${guardianReference ?? 'missing'}"`)
    }
    if (!isSubjectProfileReference(dinosaurReference)) {
      throw new TypeError(`${bond.id} has invalid dinosaur reference "${dinosaurReference ?? 'missing'}"`)
    }

    const guardian = findSubjectRecord(records, guardianReference)
    if (guardian === undefined) {
      throw new TypeError(`${bond.id} references missing guardian "${guardianReference}"`)
    }
    if (guardian.metadata.relations?.dinosaur !== dinosaurReference) {
      throw new TypeError(`${bond.id} does not match guardian "${guardianReference}" dinosaur reference`)
    }

    const dinosaur = findSubjectRecord(records, dinosaurReference)
    if (dinosaur === undefined) {
      throw new TypeError(`${bond.id} references missing dinosaur "${dinosaurReference}"`)
    }
    if (!dinosaur.metadata.relations?.riders?.includes(bond.id)) {
      throw new TypeError(`${bond.id} is missing from dinosaur riders`)
    }
  }
}

interface LoreManifestEntry {
  id: string
  chapterId: string
  relativePath: string
}

const loreManifest = [
  { id: 'lorem-prologue-1', chapterId: 'prologue', relativePath: './lore/lorem-prologue-1.md' },
  { id: 'arthur-c-clarke-1', chapterId: 'prologue', relativePath: './lore/arthur-c-clarke-1.md' },
  { id: 'lorem-prologue-2', chapterId: 'prologue', relativePath: './lore/lorem-prologue-2.md' },
  { id: 'arthur-c-clarke-2', chapterId: 'prologue', relativePath: './lore/arthur-c-clarke-2.md' },
  { id: 'forbidden-factory', chapterId: 'prologue', relativePath: './lore/forbidden-factory.md' },
  { id: 'jordan-adrian', chapterId: 'prologue', relativePath: './lore/sidebar-comm-forbidden-factory-14.md' },
  { id: 'arthur-c-clarke-3', chapterId: 'prologue', relativePath: './lore/arthur-c-clarke-3.md' },
  { id: 'arthur-c-clarke-4', chapterId: 'prologue', relativePath: './lore/arthur-c-clarke-4.md' },
  { id: 'maintenance-window', chapterId: 'prologue', relativePath: './lore/maintenance-window.md' },
  { id: 'quote-childhoods-end-future', chapterId: 'pursuit', relativePath: './lore/quote-childhoods-end-future.md' },
  { id: 'lorem-pursuit-1', chapterId: 'pursuit', relativePath: './lore/lorem-pursuit-1.md' },
  { id: 'quote-natasha-woods', chapterId: 'pursuit', relativePath: './lore/quote-natasha-woods.md' },
  { id: 'do-not-reply', chapterId: 'pursuit', relativePath: './lore/do-not-reply.md' },
  { id: 'quote-berkus', chapterId: 'pursuit', relativePath: './lore/quote-berkus.md' },
  { id: 'childhoods-end-wager', chapterId: 'pursuit', relativePath: './lore/childhoods-end-wager.md' },
  { id: 'quote-unmarked-grave', chapterId: 'pursuit', relativePath: './lore/quote-unmarked-grave.md' },
  { id: 'quote-third-disciple', chapterId: 'pursuit', relativePath: './lore/quote-third-disciple.md' },
  { id: 'lorem-awakening-1', chapterId: 'awakening', relativePath: './lore/lorem-awakening-1.md' },
  { id: 'ishtar-gardener-and-winnower', chapterId: 'awakening', relativePath: './lore/ishtar-gardener-and-winnower.md' },
  { id: 'glorious-eggroll', chapterId: 'awakening', relativePath: './lore/glorious-eggroll.md' },
  { id: 'ishtar-flower-game', chapterId: 'awakening', relativePath: './lore/ishtar-flower-game.md' },
  { id: 'project-neptune', chapterId: 'awakening', relativePath: './lore/project-neptune.md' },
  { id: 'ishtar-first-knife', chapterId: 'awakening', relativePath: './lore/ishtar-first-knife.md' },
  { id: 'john-seager', chapterId: 'awakening', relativePath: './lore/john-seager.md' },
  { id: 'ishtar-the-wager', chapterId: 'awakening', relativePath: './lore/ishtar-the-wager.md' },
  { id: 'reckoning-of-the-three', chapterId: 'awakening', relativePath: './lore/reckoning-of-the-three.md' },
  { id: 'ishtar-patternfall', chapterId: 'awakening', relativePath: './lore/ishtar-patternfall.md' },
  { id: 'committee-report-personal-transmission', chapterId: 'awakening', relativePath: './lore/committee-report-personal-transmission.md' },
  { id: 'ishtar-cambrian-explosion', chapterId: 'awakening', relativePath: './lore/ishtar-cambrian-explosion.md' },
  { id: 'john-bazzite-interview', chapterId: 'awakening', relativePath: './lore/john-bazzite-interview.md' },
  { id: 'ishtar-final-shape', chapterId: 'awakening', relativePath: './lore/ishtar-final-shape.md' },
  { id: 'blue-universal-acquires-wayland-yutani', chapterId: 'awakening', relativePath: './lore/blue-universal-acquires-wayland-yutani.md' },
  { id: 'subjectprofile/kat-cosgrove', chapterId: 'awakening', relativePath: './lore/kat-cosgrove.md' },
  { id: 'subjectprofile/karl', chapterId: 'awakening', relativePath: './lore/karl.md' },
  { id: 'guardian-bond/kat-cosgrove-karl', chapterId: 'awakening', relativePath: './lore/kat-cosgrove-karl.md' },
  { id: 'subjectprofile/jeefy', chapterId: 'awakening', relativePath: './lore/jeefy.md' },
  { id: 'subjectprofile/mountaintop', chapterId: 'awakening', relativePath: './lore/mountaintop.md' },
  { id: 'guardian-bond/jeefy-mountaintop', chapterId: 'awakening', relativePath: './lore/jeefy-mountaintop.md' },
  { id: 'subjectprofile/natalie', chapterId: 'awakening', relativePath: './lore/natalie.md' },
  { id: 'subjectprofile/alamo', chapterId: 'awakening', relativePath: './lore/alamo.md' },
  { id: 'guardian-bond/natalie-alamo', chapterId: 'awakening', relativePath: './lore/natalie-alamo.md' },
  { id: 'subjectprofile/cortney-nickerson', chapterId: 'awakening', relativePath: './lore/cortney-nickerson.md' },
  { id: 'subjectprofile/kaslin-fields', chapterId: 'awakening', relativePath: './lore/kaslin-fields.md' },
  { id: 'subjectprofile/laura-santamaria', chapterId: 'awakening', relativePath: './lore/laura-santamaria.md' },
  { id: 'subjectprofile/christopher-blecker', chapterId: 'awakening', relativePath: './lore/christopher-blecker.md' },
  { id: 'laura-sherman-robert', chapterId: 'awakening', relativePath: './lore/laura-sherman-robert.md' },
  { id: 'natali-kat-mario', chapterId: 'awakening', relativePath: './lore/natali-kat-mario.md' },
  { id: 'fyra-fyre-redactions', chapterId: 'awakening', relativePath: './lore/fyra-fyre-redactions.md' },
  { id: 'jordan-andy-model', chapterId: 'awakening', relativePath: './lore/jordan-andy-model.md' },
  { id: 'preethi-lakshmi', chapterId: 'awakening', relativePath: './lore/preethi-lakshmi.md' },
  { id: 'andy-krook-kubesteller', chapterId: 'awakening', relativePath: './lore/andy-krook-kubesteller.md' },
  { id: 'openssf-reinforcements', chapterId: 'awakening', relativePath: './lore/openssf-reinforcements.md' },
  { id: 'ambers-garage-cloud-native-series', chapterId: 'awakening', relativePath: './lore/ambers-garage-cloud-native-series.md' },
  { id: 'katie-neomuna', chapterId: 'awakening', relativePath: './lore/katie-neomuna.md' },
  { id: 'rafael-bluefin', chapterId: 'awakening', relativePath: './lore/rafael-bluefin.md' },
  { id: 'subjectprofile/chris-aniszczyk', chapterId: 'awakening', relativePath: './lore/chris-aniszczyk.md' },
  // Director's Cut only: the nine-quote panel (Task 6). Never shown in the
  // standard timeline; see hiddenFromWolvesVideoArtifactIds in
  // wolves-narrative-timeline.ts and the Director timeline in
  // wolves-directors-cut-timeline.ts.
  { id: 'quote-sagan-extinction-forever', chapterId: 'directors-cut', relativePath: './lore/quote-sagan-extinction-forever.md' },
  { id: 'quote-sagan-pale-blue-dot', chapterId: 'directors-cut', relativePath: './lore/quote-sagan-pale-blue-dot.md' },
  { id: 'quote-clarke-dinosaurs-adapt', chapterId: 'directors-cut', relativePath: './lore/quote-clarke-dinosaurs-adapt.md' },
  { id: 'quote-clarke-unstable-combination', chapterId: 'directors-cut', relativePath: './lore/quote-clarke-unstable-combination.md' },
  { id: 'quote-asimov-knowledge-wisdom', chapterId: 'directors-cut', relativePath: './lore/quote-asimov-knowledge-wisdom.md' },
  { id: 'quote-gould-stewards-of-nothing', chapterId: 'directors-cut', relativePath: './lore/quote-gould-stewards-of-nothing.md' },
  { id: 'quote-gould-fight-to-save', chapterId: 'directors-cut', relativePath: './lore/quote-gould-fight-to-save.md' },
  { id: 'quote-goodall-every-individual-matters', chapterId: 'directors-cut', relativePath: './lore/quote-goodall-every-individual-matters.md' },
  { id: 'quote-goodall-nature-resilient', chapterId: 'directors-cut', relativePath: './lore/quote-goodall-nature-resilient.md' },
] as const satisfies readonly LoreManifestEntry[]

const loreFiles = import.meta.glob('./lore/*.md', { query: '?raw', import: 'default', eager: true }) as Record<string, string>

export function loadAllLoreRecords(): readonly LoreRecord[] {
  const records = loreManifest.map(({ id, chapterId, relativePath }) => {
    const raw = loreFiles[relativePath]
    if (raw === undefined) {
      throw new Error(`Missing staged lore file "${relativePath}"`)
    }
    return parseLoreRecord(id, chapterId, relativePath, raw)
  })
  validateLoreProjectReferences(records, loadLoreProjectIndex())
  return Object.freeze(records)
}
