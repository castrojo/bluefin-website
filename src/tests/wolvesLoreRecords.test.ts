import { describe, expect, it } from 'vitest'
import {
  DIRECTORS_CUT_QUOTE_EVIDENCE,
  findDirectorsCutQuoteEvidence,
} from '../data/wolves-directors-cut-quote-evidence'
import {
  deriveLoreTelemetry,
  loadAllLoreRecords,
  parseLoreRecord,
  validateGuardianBonds,
} from '../data/wolves-lore-records'
import { wolvesRelease } from '../data/wolves-story'

const loreSources = import.meta.glob('../data/lore/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>

function authoredBody(raw: string): string {
  const newline = raw.includes('\r\n') ? '\r\n' : '\n'
  const openingDelimiter = `---${newline}`
  const closingDelimiter = `${newline}---${newline}`
  const closingOffset = raw.indexOf(closingDelimiter, openingDelimiter.length)
  if (!raw.startsWith(openingDelimiter) || closingOffset === -1) {
    throw new Error('Expected lore source frontmatter')
  }

  const bodyOffset = closingOffset + closingDelimiter.length
  return raw.startsWith(newline, bodyOffset)
    ? raw.slice(bodyOffset + newline.length)
    : raw.slice(bodyOffset)
}

describe('wolves lore records', () => {
  it('normalizes the legacy transmission kind to chatlog with a diagnostic', () => {
    const record = parseLoreRecord('lorem-prologue-1', 'prologue', './lore/lorem-prologue-1.md', [
      '---',
      'kind: transmission',
      'title: The Artifact',
      '---',
      '',
      '**SENDER**: body',
    ].join('\n'))

    expect(record.kind).toBe('chatlog')
    expect(record.diagnostics).toContain('kind "transmission" is a staged alias for "chatlog"')
  })

  it('reports a missing kind during staged parsing without changing body text', () => {
    const record = parseLoreRecord('record', 'prologue', './lore/record.md', '---\ntitle: Record\n---\n\nBody')

    expect(record.diagnostics).toContain('frontmatter is missing kind')
    expect(record.diagnostics).toContain('frontmatter is missing timestamp')
    expect(record.body).toBe('Body')
  })

  it('does not expose a permanent legacy identity fallback after migration', () => {
    expect(parseLoreRecord).toHaveLength(4)
  })

  it('surfaces malformed YAML and non-mapping frontmatter', () => {
    expect(() => parseLoreRecord('invalid', 'prologue', './lore/invalid.md', '---\ntitle: [\n---\nbody'))
      .toThrow()
    expect(() => parseLoreRecord('unterminated', 'prologue', './lore/unterminated.md', '---\ntitle: ['))
      .toThrow('Lore front matter must close with "---"')
    expect(() => parseLoreRecord('list', 'prologue', './lore/list.md', '---\n- not\n- a mapping\n---\nbody'))
      .toThrow('Lore front matter must be a mapping')
  })

  it('rejects bare date scalar frontmatter', () => {
    expect(() => parseLoreRecord('date', 'prologue', './lore/date.md', '---\n2026-07-14\n---\nbody'))
      .toThrow('Lore front matter must be a mapping')
  })

  it('loads every migrated record with complete authored identity and no diagnostics', () => {
    const records = loadAllLoreRecords()
    const artifact = records.find(record => record.id === 'lorem-prologue-1')
    const laura = records.find(record => record.id === 'laura-sherman-robert')
    const openssf = records.find(record => record.id === 'openssf-reinforcements')

    expect(records).toHaveLength(65)
    expect(records.flatMap(record => record.diagnostics)).toEqual([])
    expect(artifact).toMatchObject({
      chapterId: 'prologue',
      relativePath: './lore/lorem-prologue-1.md',
      kind: 'chatlog',
      metadata: {
        title: 'The Artifact',
        timestamp: '2326-06-16',
        channel: 'EXPLORATION//TEAM-ALPHA',
      },
    })
    expect(openssf).toMatchObject({
      chapterId: 'awakening',
      relativePath: './lore/openssf-reinforcements.md',
      kind: 'chatlog',
      metadata: {
        title: 'AAIF-7 on the net, someone need guidance?',
        timestamp: '2326-08-01',
        projects: ['kubestellar', 'kubernetes'],
      },
    })
    expect(laura).toMatchObject({
      chapterId: 'awakening',
      relativePath: './lore/laura-sherman-robert.md',
      kind: 'chatlog',
      metadata: {
        title: 'Wait, so who are you guys?',
        timestamp: '2326-08-01',
      },
    })
  })

  it('requires authored attribution for quote identity', () => {
    const record = parseLoreRecord('quote', 'prologue', './lore/quote.md', [
      '---',
      'kind: quote',
      'title: Legacy title',
      'timestamp: \'2326-07-14\'',
      '---',
      '',
      'Authored body',
    ].join('\n'))

    expect(record.diagnostics).toContain('frontmatter is missing attribution for quote identity')
    expect(record.body).toBe('Authored body')
  })

  it('loads every quote with authored identity and no diagnostics', () => {
    const quotes = loadAllLoreRecords().filter(record => record.kind === 'quote')

    expect(quotes).toHaveLength(18)
    for (const quote of quotes) {
      expect(quote.metadata.attribution, quote.relativePath).toEqual(expect.any(String))
      expect(quote.metadata.attribution?.trim(), quote.relativePath).not.toBe('')
      expect(quote.diagnostics, quote.relativePath).toEqual([])
    }
  })

  it.each([
    ['quote-natasha-woods', 'Natasha Woods VI', 'CNCF Marketing Material, Circa 2349'],
    ['quote-berkus', 'Berkus the Wise', 'The Cosmos, Volume 3 (Blue Universal Red Letter Edition)'],
    ['quote-unmarked-grave', 'Unmarked Grave', 'Eulogy: The Horror of Thousands'],
    ['quote-third-disciple', 'Third Disciple of Renner', 'The Chronicles of Blue Universal'],
  ])('parses migrated legacy quote identity for %s', (id, attribution, context) => {
    const record = loadAllLoreRecords().find(item => item.id === id)

    expect(record?.metadata).toMatchObject({ attribution, context })
  })

  it.each([
    ['quote-sagan-extinction-forever', 'Carl Sagan', 'Extinction is forever.', 'The Varieties of Scientific Experience: A Personal View of the Search for God, p. 204'],
    ['quote-sagan-pale-blue-dot', 'Carl Sagan', 'Look again at that dot. That\'s here. That\'s home. That\'s us.', 'Pale Blue Dot: A Vision of the Human Future in Space, chapter "You Are Here," p. 6'],
    ['quote-clarke-dinosaurs-adapt', 'Arthur C. Clarke', 'The dinosaurs disappeared because they could not adapt to their changing environment.', 'Foreword, The Collected Stories of Arthur C. Clarke, p. x'],
    ['quote-clarke-unstable-combination', 'Arthur C. Clarke', 'The combination is unstable and self-destroying.', 'Voices from the Sky, p. 183'],
    ['quote-asimov-knowledge-wisdom', 'Isaac Asimov', 'Science gathers knowledge faster than society gathers wisdom.', 'Isaac Asimov\'s Book of Science and Nature Quotations, p. 281'],
    ['quote-gould-stewards-of-nothing', 'Stephen Jay Gould', 'We are one among millions of species, stewards of nothing.', '"The Golden Rule," Eight Little Piggies, p. 48'],
    ['quote-gould-fight-to-save', 'Stephen Jay Gould', 'We will not fight to save what we do not love.', '"The Golden Rule," Eight Little Piggies, p. 40'],
    ['quote-goodall-every-individual-matters', 'Jane Goodall', 'Every individual matters.', 'With Love; first Scholastic printing preview PP47'],
    ['quote-goodall-nature-resilient', 'Jane Goodall', 'Fortunately nature is amazingly resilient.', '"Protecting the Tapestry of Life," May 2019'],
  ])('parses the Director\'s Cut science-quote panel record for %s with exact wording and provenance', (id, attribution, body, context) => {
    const record = loadAllLoreRecords().find(item => item.id === id)

    expect(record, id).toMatchObject({
      chapterId: 'directors-cut',
      kind: 'quote',
      body: `${body}\n`,
      diagnostics: [],
      metadata: { attribution, context },
    })
    expect(record?.metadata.timestamp, id).toEqual(expect.any(String))
  })

  // The real "excluded from the standard show" claim is verified against the standard
  // show's own timeline in wolvesNarrativeTimeline.test.ts's "keeps every Director-only
  // quote id out of the standard show" — this module never loads that timeline, so this
  // test can only check the panel's own chapter grouping and identity, not exclusion.
  it('groups the Director\'s Cut science-quote panel under its own chapter with no duplicate ids', () => {
    const directorsCutQuotes = loadAllLoreRecords().filter(record => record.chapterId === 'directors-cut')

    expect(directorsCutQuotes.map(record => record.id)).toEqual([
      'quote-sagan-extinction-forever',
      'quote-sagan-pale-blue-dot',
      'quote-clarke-dinosaurs-adapt',
      'quote-clarke-unstable-combination',
      'quote-asimov-knowledge-wisdom',
      'quote-gould-stewards-of-nothing',
      'quote-gould-fight-to-save',
      'quote-goodall-every-individual-matters',
      'quote-goodall-nature-resilient',
    ])
    expect(new Set(directorsCutQuotes.map(record => record.id)).size).toBe(directorsCutQuotes.length)
  })

  it('publishes the exact approved evidence for every Director\'s Cut science-quote panel record, not merely a URL shape', () => {
    const directorsCutRecords = loadAllLoreRecords().filter(record => record.chapterId === 'directors-cut')

    expect(directorsCutRecords.map(record => record.id)).toEqual(
      DIRECTORS_CUT_QUOTE_EVIDENCE.map(evidence => evidence.id),
    )

    for (const record of directorsCutRecords) {
      const evidence = findDirectorsCutQuoteEvidence(record.id)
      if (!evidence) {
        throw new Error(`Expected quote evidence for ${record.id}`)
      }

      const artifact = wolvesRelease.artifacts.find(item => item.id === record.id)
      // Compare the exact approved value, not just that a URL-shaped string is
      // present: a plausible-looking but wrong or swapped URL must fail here.
      expect(artifact?.sourceUrl, record.id).toBe(evidence.sourceUrl)
      expect(record.metadata.attribution, record.id).toBe(evidence.attribution)
    }
  })

  it('preserves every loaded record body from its authored Markdown, including terminal newlines', () => {
    for (const record of loadAllLoreRecords()) {
      const raw = loreSources[`../data${record.relativePath.slice(1)}`]
      if (raw === undefined) {
        throw new Error(`Missing lore source ${record.relativePath}`)
      }

      expect(record.body, record.relativePath).toBe(authoredBody(raw))
    }
  })

  it('exposes normalized staged record identity through the Wolves release', () => {
    const record = loadAllLoreRecords().find(item => item.id === 'lorem-prologue-1')
    const artifact = wolvesRelease.artifacts.find(item => item.id === 'lorem-prologue-1')

    expect(artifact).toMatchObject({
      type: record?.kind,
      title: record?.metadata.title,
      publishedAt: record?.metadata.timestamp,
      channel: record?.metadata.channel,
      body: record?.body,
    })
  })

  it('derives deterministic FNV-1a telemetry from record identity', () => {
    const record = parseLoreRecord('record', 'prologue', './lore/record.md', 'body')

    expect(deriveLoreTelemetry(record)).toEqual({
      resourceName: 'lore-9e13a7a0',
      namespace: 'wolves-lore',
      controller: 'lore-indexer',
      archiveNode: 'archive-13a7a0',
      observedGeneration: 1,
      phase: 'Indexed',
      recordFingerprint: 'fnv1a:9e13a7a0',
    })
  })

  it('accepts only authored Guardian classes and dinosaur epic names', () => {
    const record = parseLoreRecord('dinosaur', 'chapter', './lore/dinosaur.md', [
      '---',
      'kind: character-sheet',
      'title: Subject',
      'epic_name: Author-provided name',
      'guardian:',
      '  class: titan',
      '  super: Author-provided super',
      '---',
      '',
      'Body',
    ].join('\n'))

    expect(record.metadata.epic_name).toBe('Author-provided name')
    expect(record.metadata.guardian?.class).toBe('titan')
    expect(record.metadata.guardian?.super).toBe('Author-provided super')
    expect(() => parseLoreRecord('invalid', 'chapter', './lore/invalid.md', '---\nkind: character-sheet\nguardian:\n  class: invalid\n---\n\nBody'))
      .toThrow('Lore front matter guardian class must be titan, warlock, or hunter')
    expect(() => parseLoreRecord('invalid-epic-name', 'chapter', './lore/invalid.md', '---\nepic_name: 1\n---\n\nBody'))
      .toThrow('Lore front matter field "epic_name" must be a string')
  })

  it('accepts ordered authored project references for chatlogs', () => {
    const record = parseLoreRecord('chatlog', 'awakening', './lore/chatlog.md', [
      '---',
      'kind: chatlog',
      'title: Project-linked transcript',
      'timestamp: \'2326-08-01\'',
      'projects:',
      '  - kubestellar',
      '  - kubernetes',
      '---',
      '',
      '**andy**: I\'m telling you it works',
    ].join('\n'))

    expect(record.metadata).toMatchObject({
      projects: ['kubestellar', 'kubernetes'],
    })
  })

  it('rejects malformed project reference lists', () => {
    expect(() => parseLoreRecord('invalid-projects', 'awakening', './lore/invalid-projects.md', [
      '---',
      'kind: chatlog',
      'title: Invalid projects',
      'timestamp: \'2326-08-01\'',
      'projects: kubernetes',
      '---',
      '',
      'Body',
    ].join('\n'))).toThrow('Lore front matter field "projects" must be an array of strings')
  })

  it('rejects a bond whose dinosaur does not list that bond as a rider', () => {
    const guardianRecord = parseLoreRecord('subjectprofile/kat-cosgrove', 'awakening', './lore/kat-cosgrove.md', [
      '---',
      'subject_kind: person',
      'relations:',
      '  dinosaur: subjectprofile/karl',
      '---',
      '',
    ].join('\n'))
    const dinosaurRecord = parseLoreRecord('subjectprofile/karl', 'awakening', './lore/karl.md', [
      '---',
      'subject_kind: dinosaur',
      'relations:',
      '  riders: []',
      '---',
      '',
    ].join('\n'))
    const bondRecord = parseLoreRecord('guardian-bond/kat-cosgrove-karl', 'awakening', './lore/kat-cosgrove-karl.md', [
      '---',
      'kind: guardian-bond',
      'relations:',
      '  guardian: subjectprofile/kat-cosgrove',
      '  dinosaur: subjectprofile/karl',
      '---',
      '',
    ].join('\n'))

    expect(() => validateGuardianBonds([guardianRecord, dinosaurRecord, bondRecord]))
      .toThrow('guardian-bond/kat-cosgrove-karl is missing from dinosaur riders')
  })
})
