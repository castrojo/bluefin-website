/**
 * Build a plan for creating, updating, or closing GitHub issues based on
 * SBOM audit results.
 *
 * Pure function — no I/O. `scripts/lib/sbom-issue-sync.js` executes the plan
 * against the GitHub API.
 *
 * Issue title convention: `[SBOM verification] <product>: <errorCode>` where
 * `errorCode` is the exact code the audit recorded (`missing-sbom`,
 * `missing-required`, `ambiguous-required`, `ambiguous-optional`,
 * `missing-optional`, `pending-mapping`, `image-not-found`,
 * `missing-provenance`, `invalid-provenance`, `invalid-sbom`, ...). Titles are
 * deterministic, so the same failure always maps to the same issue and a
 * different failure never hides inside an existing one.
 */

const TITLE_PREFIX = '[SBOM verification]'

/**
 * Statuses that must alert. `degraded` alerts too: a silently omitted optional
 * field is exactly the kind of loss this pipeline exists to surface.
 */
const ALERTING_STATUSES = new Set(['unavailable', 'degraded'])

/**
 * @param {{ errorCode?: string, missingRequired?: string[] }} image
 * @returns {string}
 */
function failureCode(image) {
  if (image.errorCode) {
    return image.errorCode
  }
  if (image.missingRequired?.length) {
    return 'missing-required'
  }
  return 'unknown'
}

/**
 * @param {{ product: string, errorCode?: string, missingRequired?: string[] }} image
 * @returns {string}
 */
function issueTitle(image) {
  return `${TITLE_PREFIX} ${image.product}: ${failureCode(image)}`
}

/**
 * Evidence lines shared by the single-image and multi-image bodies.
 *
 * @param {object} image
 * @returns {string[]}
 */
function evidenceLines(image) {
  const lines = [
    `- **Image**: \`${image.image}\``,
    `- **Image ID**: \`${image.id}\``,
    `- **Product**: ${image.product}`,
    `- **Status**: ${image.status ?? 'unavailable'}`,
    `- **Failure code**: \`${failureCode(image)}\``,
  ]
  if (image.imageDigest) {
    lines.push(`- **Digest**: \`${image.imageDigest}\``)
  }
  if (image.sbomDigest) {
    lines.push(`- **SBOM digest**: \`${image.sbomDigest}\``)
  }
  if (image.error) {
    lines.push(`- **Error**: ${image.error}`)
  }
  if (image.missingRequired?.length) {
    lines.push(`- **Missing required packages**: ${image.missingRequired.join(', ')}`)
  }
  if (image.ambiguousRequired?.length) {
    lines.push(`- **Ambiguous required packages**: ${image.ambiguousRequired.join(', ')}`)
  }
  if (image.ambiguousOptional?.length) {
    lines.push(`- **Ambiguous optional packages (omitted)**: ${image.ambiguousOptional.join(', ')}`)
  }
  if (image.missingOptional?.length) {
    lines.push(`- **Missing optional packages (omitted)**: ${image.missingOptional.join(', ')}`)
  }
  lines.push(`- **Last successful verification**: ${image.lastSuccessfulAt ?? 'none recorded'}`)
  return lines
}

/**
 * Build an issue body listing every affected image that shares one title.
 *
 * @param {Array<object>} images
 * @param {{ checkedAt: string }} audit
 * @param {{ workflowUrl?: string }} options
 * @returns {string}
 */
function issueBody(images, audit, options = {}) {
  const lines = [`## SBOM Verification Failure`, ``]

  if (images.length === 1) {
    lines.push(...evidenceLines(images[0]))
  }
  else {
    lines.push(`**Affected images** (${images.length}):`, ``)
    for (const image of images) {
      lines.push(`### \`${image.id}\``)
      lines.push(...evidenceLines(image))
      lines.push(``)
    }
  }

  lines.push(`- **Checked at**: ${audit.checkedAt}`)
  lines.push(`- **Workflow run**: ${options.workflowUrl ?? 'not recorded'}`)
  lines.push(``)
  lines.push(`This issue was automatically created by the daily SBOM verification workflow.`)
  return lines.join('\n')
}

/**
 * Build a plan for creating/updating/closing GitHub issues based on SBOM
 * audit results.
 *
 * @param {{ checkedAt: string, images: Array<object> }} audit
 * @param {Array<{ number: number, title: string, state: string }>} openIssues
 * @param {{ workflowUrl?: string }} [options]
 * @returns {{ create: Array<{ title: string, body: string, labels: string[] }>, update: Array<{ number: number, title: string, body: string }>, close: Array<{ number: number, state_reason: string }> }}
 */
export function buildSbomIssuePlan(audit, openIssues, options = {}) {
  const plan = { create: [], update: [], close: [] }

  const failedImages = audit.images.filter(img => ALERTING_STATUSES.has(img.status))
  const failedTitles = new Set()
  const titleToImages = new Map()

  for (const image of failedImages) {
    const title = issueTitle(image)
    failedTitles.add(title)
    if (!titleToImages.has(title)) {
      titleToImages.set(title, [])
    }
    titleToImages.get(title).push(image)
  }

  for (const [title, images] of titleToImages) {
    const body = issueBody(images, audit, options)
    const existing = openIssues.find(i => i.title === title)
    if (existing) {
      plan.update.push({ number: existing.number, title, body })
    }
    else {
      plan.create.push({ title, body, labels: ['bug', 'automation'] })
    }
  }

  // Close issues whose failure has recovered
  for (const issue of openIssues) {
    if (issue.title.startsWith(TITLE_PREFIX) && !failedTitles.has(issue.title)) {
      plan.close.push({ number: issue.number, state_reason: 'completed' })
    }
  }

  return plan
}
