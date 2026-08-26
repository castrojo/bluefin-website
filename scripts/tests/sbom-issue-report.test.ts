import { describe, expect, it } from 'vitest'
import { buildSbomIssuePlan } from '../lib/sbom-issue-report.js'

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const CHECKED_AT = '2026-08-26T10:00:00.000Z'

function makeAudit(images, checkedAt = CHECKED_AT) {
  return { checkedAt, images }
}

const VERIFIED_IMAGE = {
  id: 'dakota',
  product: 'dakota',
  image: 'ghcr.io/projectbluefin/dakota:latest',
  imageDigest: 'sha256:aaaa1111bbbb2222cccc3333dddd4444eeee5555ffff6666aaaa7777bbbb8888',
  sbomDigest: 'sha256:bbbb2222cccc3333dddd4444eeee5555ffff6666aaaa7777bbbb8888cccc9999',
  status: 'verified',
  values: { kernel: '7.0.7' },
}

const MISSING_SBOM_IMAGE = {
  id: 'bluefin-stable',
  product: 'bluefin',
  image: 'ghcr.io/ublue-os/bluefin:stable',
  imageDigest: 'sha256:cccc3333dddd4444eeee5555ffff6666aaaa7777bbbb8888cccc9999dddd0000',
  sbomDigest: 'sha256:dddd4444eeee5555ffff6666aaaa7777bbbb8888cccc9999dddd0000eeee1111',
  status: 'unavailable',
  errorCode: 'missing-required',
  missingRequired: ['kernel', 'gnome'],
}

const EVIDENCE_ERROR_IMAGE = {
  id: 'dakota-nvidia',
  product: 'dakota',
  image: 'ghcr.io/projectbluefin/dakota-nvidia:latest',
  status: 'unavailable',
  errorCode: 'image-not-found',
  error: 'image-not-found: no SBOM attestations found',
}

const DEGRADED_IMAGE = {
  id: 'bluefin-stable',
  product: 'bluefin',
  image: 'ghcr.io/ublue-os/bluefin:stable',
  imageDigest: 'sha256:cccc3333dddd4444eeee5555ffff6666aaaa7777bbbb8888cccc9999dddd0000',
  sbomDigest: 'sha256:dddd4444eeee5555ffff6666aaaa7777bbbb8888cccc9999dddd0000eeee1111',
  status: 'degraded',
  errorCode: 'ambiguous-optional',
  error: 'ghcr.io/ublue-os/bluefin:stable has ambiguous optional fields: mesa',
  ambiguousOptional: ['mesa'],
  values: { kernel: '7.1.6-201.fc44' },
  lastSuccessfulAt: '2026-08-25T10:00:00.000Z',
}

const PENDING_IMAGE = {
  id: 'dakota-gaming',
  product: 'dakota',
  image: 'ghcr.io/projectbluefin/dakota-gaming:testing',
  imageDigest: 'sha256:eeee5555ffff6666aaaa7777bbbb8888cccc9999dddd0000eeee1111ffff2222',
  status: 'unavailable',
  errorCode: 'pending-mapping',
  error: 'ghcr.io/projectbluefin/dakota-gaming:testing publishes an SBOM but has no reviewed package mapping yet',
}

const WORKFLOW_URL = 'https://github.com/projectbluefin/website/actions/runs/1234567890'

// ---------------------------------------------------------------------------
// buildSbomIssuePlan
// ---------------------------------------------------------------------------

describe('buildSbomIssuePlan', () => {
  it('creates an issue for a single missing-sbom failure', () => {
    const audit = makeAudit([MISSING_SBOM_IMAGE])
    const plan = buildSbomIssuePlan(audit, [])

    expect(plan.create).toHaveLength(1)
    expect(plan.update).toHaveLength(0)
    expect(plan.close).toHaveLength(0)

    const issue = plan.create[0]
    expect(issue.title).toContain('[SBOM verification]')
    expect(issue.title).toContain('bluefin')
    expect(issue.body).toContain(MISSING_SBOM_IMAGE.image)
    expect(issue.body).toContain(MISSING_SBOM_IMAGE.imageDigest!)
    expect(issue.body).toContain('kernel, gnome')
    expect(issue.body).toContain(CHECKED_AT)
    expect(issue.labels).toContain('bug')
    expect(issue.labels).toContain('automation')
  })

  it('creates an issue for an evidence-error failure', () => {
    const audit = makeAudit([EVIDENCE_ERROR_IMAGE])
    const plan = buildSbomIssuePlan(audit, [])

    expect(plan.create).toHaveLength(1)
    const issue = plan.create[0]
    expect(issue.title).toContain('dakota')
    expect(issue.body).toContain('no SBOM attestations found')
  })

  it('creates no issues when all images are verified', () => {
    const audit = makeAudit([VERIFIED_IMAGE])
    const plan = buildSbomIssuePlan(audit, [])

    expect(plan.create).toHaveLength(0)
    expect(plan.update).toHaveLength(0)
    expect(plan.close).toHaveLength(0)
  })

  it('updates an existing issue when the same failure recurs', () => {
    const audit = makeAudit([MISSING_SBOM_IMAGE])
    const openIssues = [
      { number: 42, title: plan_title_for(MISSING_SBOM_IMAGE), state: 'open' },
    ]
    const plan = buildSbomIssuePlan(audit, openIssues)

    expect(plan.create).toHaveLength(0)
    expect(plan.update).toHaveLength(1)
    expect(plan.update[0].number).toBe(42)
    expect(plan.update[0].body).toContain(CHECKED_AT)
    expect(plan.close).toHaveLength(0)
  })

  it('closes an issue when the failure has recovered', () => {
    const audit = makeAudit([VERIFIED_IMAGE])
    const openIssues = [
      { number: 42, title: plan_title_for(MISSING_SBOM_IMAGE), state: 'open' },
    ]
    const plan = buildSbomIssuePlan(audit, openIssues)

    expect(plan.create).toHaveLength(0)
    expect(plan.update).toHaveLength(0)
    expect(plan.close).toHaveLength(1)
    expect(plan.close[0].number).toBe(42)
    expect(plan.close[0].state_reason).toBe('completed')
  })

  it('does not close non-SBOM issues', () => {
    const audit = makeAudit([VERIFIED_IMAGE])
    const openIssues = [
      { number: 10, title: 'Unrelated bug report', state: 'open' },
      { number: 11, title: '[SBOM verification] bluefin: missing-required', state: 'open' },
    ]
    const plan = buildSbomIssuePlan(audit, openIssues)

    expect(plan.close).toHaveLength(1)
    expect(plan.close[0].number).toBe(11)
  })

  it('handles multiple failures from different products', () => {
    const audit = makeAudit([MISSING_SBOM_IMAGE, EVIDENCE_ERROR_IMAGE])
    const plan = buildSbomIssuePlan(audit, [])

    expect(plan.create).toHaveLength(2)
    const titles = plan.create.map(i => i.title)
    expect(titles[0]).not.toBe(titles[1])
  })

  it('includes image reference in issue body', () => {
    const audit = makeAudit([MISSING_SBOM_IMAGE])
    const plan = buildSbomIssuePlan(audit, [])

    expect(plan.create[0].body).toContain(MISSING_SBOM_IMAGE.image)
  })

  it('includes digest when available in issue body', () => {
    const audit = makeAudit([MISSING_SBOM_IMAGE])
    const plan = buildSbomIssuePlan(audit, [])

    expect(plan.create[0].body).toContain(MISSING_SBOM_IMAGE.imageDigest!)
  })

  it('omits digest line when digest is not available', () => {
    const audit = makeAudit([EVIDENCE_ERROR_IMAGE])
    const plan = buildSbomIssuePlan(audit, [])

    expect(plan.create[0].body).not.toContain('Digest')
  })

  it('produces deterministic titles for the same failure', () => {
    const audit1 = makeAudit([MISSING_SBOM_IMAGE], '2026-08-25T10:00:00.000Z')
    const audit2 = makeAudit([MISSING_SBOM_IMAGE], '2026-08-26T10:00:00.000Z')

    const plan1 = buildSbomIssuePlan(audit1, [])
    const plan2 = buildSbomIssuePlan(audit2, [])

    expect(plan1.create[0].title).toBe(plan2.create[0].title)
  })

  it('handles an audit with no failures and no open issues', () => {
    const plan = buildSbomIssuePlan(makeAudit([]), [])

    expect(plan.create).toHaveLength(0)
    expect(plan.update).toHaveLength(0)
    expect(plan.close).toHaveLength(0)
  })

  it('closes multiple recovered issues at once', () => {
    const audit = makeAudit([VERIFIED_IMAGE])
    const openIssues = [
      { number: 10, title: '[SBOM verification] bluefin: missing-required', state: 'open' },
      { number: 20, title: '[SBOM verification] dakota: image-not-found', state: 'open' },
    ]
    const plan = buildSbomIssuePlan(audit, openIssues)

    expect(plan.close).toHaveLength(2)
    expect(plan.close.map(c => c.number)).toEqual([10, 20])
  })

  it('creates for new failures while closing recovered ones', () => {
    const audit = makeAudit([EVIDENCE_ERROR_IMAGE])
    const openIssues = [
      { number: 42, title: plan_title_for(MISSING_SBOM_IMAGE), state: 'open' },
    ]
    const plan = buildSbomIssuePlan(audit, openIssues)

    expect(plan.create).toHaveLength(1)
    expect(plan.create[0].title).toContain('dakota')
    expect(plan.close).toHaveLength(1)
    expect(plan.close[0].number).toBe(42)
  })

  it('deduplicates multiple images sharing the same product/failure-code title', () => {
    const image1 = {
      id: 'bluefin-lts',
      product: 'bluefin',
      image: 'ghcr.io/projectbluefin/bluefin-lts:stable',
      status: 'unavailable',
      errorCode: 'missing-sbom',
      error: 'No SPDX referrer found',
    }
    const image2 = {
      id: 'bluefin-lts-hwe',
      product: 'bluefin',
      image: 'ghcr.io/projectbluefin/bluefin-lts-hwe:stable',
      status: 'unavailable',
      errorCode: 'missing-sbom',
      error: 'No SPDX referrer found',
    }
    const audit = makeAudit([image1, image2])
    const plan = buildSbomIssuePlan(audit, [])

    // Same title → single issue listing both images
    expect(plan.create).toHaveLength(1)
    expect(plan.create[0].body).toContain('bluefin-lts')
    expect(plan.create[0].body).toContain('bluefin-lts-hwe')
  })
})

describe('buildSbomIssuePlan — exact error codes, degraded entries, and evidence', () => {
  it('uses the exact errorCode in the title', () => {
    const plan = buildSbomIssuePlan(makeAudit([EVIDENCE_ERROR_IMAGE]), [])
    expect(plan.create[0].title).toBe('[SBOM verification] dakota: image-not-found')
  })

  it('separates two failure codes for the same product into two issues', () => {
    const plan = buildSbomIssuePlan(makeAudit([MISSING_SBOM_IMAGE, {
      ...MISSING_SBOM_IMAGE,
      id: 'bluefin-lts',
      errorCode: 'missing-sbom',
      missingRequired: undefined,
      error: 'no sbom',
    }]), [])
    expect(plan.create.map(i => i.title).sort()).toEqual([
      '[SBOM verification] bluefin: missing-required',
      '[SBOM verification] bluefin: missing-sbom',
    ])
  })

  it('opens an issue for a degraded image', () => {
    const plan = buildSbomIssuePlan(makeAudit([DEGRADED_IMAGE]), [])
    expect(plan.create).toHaveLength(1)
    expect(plan.create[0].title).toBe('[SBOM verification] bluefin: ambiguous-optional')
    expect(plan.create[0].body).toContain('degraded')
    expect(plan.create[0].body).toContain('mesa')
  })

  it('does not close a degraded image issue', () => {
    const openIssues = [{ number: 7, title: '[SBOM verification] bluefin: ambiguous-optional', state: 'open' }]
    const plan = buildSbomIssuePlan(makeAudit([DEGRADED_IMAGE]), openIssues)
    expect(plan.close).toHaveLength(0)
    expect(plan.update.map(u => u.number)).toEqual([7])
  })

  it('keeps a pending-mapping issue open rather than closing it', () => {
    const openIssues = [{ number: 8, title: '[SBOM verification] dakota: pending-mapping', state: 'open' }]
    const plan = buildSbomIssuePlan(makeAudit([PENDING_IMAGE]), openIssues)
    expect(plan.close).toHaveLength(0)
    expect(plan.update.map(u => u.number)).toEqual([8])
  })

  it('includes the workflow run URL when one is supplied', () => {
    const plan = buildSbomIssuePlan(makeAudit([MISSING_SBOM_IMAGE]), [], { workflowUrl: WORKFLOW_URL })
    expect(plan.create[0].body).toContain(WORKFLOW_URL)
  })

  it('includes the last successful verification timestamp', () => {
    const plan = buildSbomIssuePlan(makeAudit([DEGRADED_IMAGE]), [], { workflowUrl: WORKFLOW_URL })
    expect(plan.create[0].body).toContain('2026-08-25T10:00:00.000Z')
  })

  it('says none recorded when no previous verification exists', () => {
    const plan = buildSbomIssuePlan(makeAudit([PENDING_IMAGE]), [], { workflowUrl: WORKFLOW_URL })
    expect(plan.create[0].body).toContain('none recorded')
  })

  it('states the last successful verification for every image in a multi-image issue', () => {
    const audit = makeAudit([
      { ...PENDING_IMAGE, id: 'dakota-gaming' },
      { ...PENDING_IMAGE, id: 'dakota-nvidia-gaming', lastSuccessfulAt: '2026-08-20T10:00:00.000Z' },
    ])
    const plan = buildSbomIssuePlan(audit, [], { workflowUrl: WORKFLOW_URL })
    expect(plan.create).toHaveLength(1)
    expect(plan.create[0].body).toContain('none recorded')
    expect(plan.create[0].body).toContain('2026-08-20T10:00:00.000Z')
  })

  it('reports the pending-mapping digest so the artifact can be inspected', () => {
    const plan = buildSbomIssuePlan(makeAudit([PENDING_IMAGE]), [])
    expect(plan.create[0].body).toContain(PENDING_IMAGE.imageDigest)
  })
})

// Helper to compute the expected title for an image (mirrors internal logic)
function plan_title_for(image: { product: string, errorCode?: string }): string {
  return `[SBOM verification] ${image.product}: ${image.errorCode ?? 'unknown'}`
}
