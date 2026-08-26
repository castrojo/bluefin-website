/**
 * Build a plan for creating, updating, or closing GitHub issues based on
 * SBOM audit results.
 *
 * Pure function — no I/O. The caller (typically a github-script step) is
 * responsible for executing the plan against the GitHub API.
 *
 * Issue title convention: `[SBOM verification] <product>: <failure-code>`
 * where failure-code is `evidence-error`, `missing-sbom`, or `unknown`.
 * This makes titles deterministic so the same failure maps to the same issue.
 */

const TITLE_PREFIX = '[SBOM verification]'

/**
 * @param {{ error?: string, missingRequired?: string[] }} image
 * @returns {string}
 */
function failureCode(image) {
  if (image.error) {
    return 'evidence-error'
  }
  if (image.missingRequired?.length) {
    return 'missing-sbom'
  }
  return 'unknown'
}

/**
 * @param {{ product: string, error?: string, missingRequired?: string[] }} image
 * @returns {string}
 */
function issueTitle(image) {
  return `${TITLE_PREFIX} ${image.product}: ${failureCode(image)}`
}

/**
 * @param {{ id: string, product: string, image: string, imageDigest?: string, error?: string, missingRequired?: string[] }} image
 * @param {{ checkedAt: string }} audit
 * @returns {string}
 */
function issueBody(image, audit) {
  const lines = [
    `## SBOM Verification Failure`,
    ``,
    `- **Image**: \`${image.image}\``,
    `- **Image ID**: \`${image.id}\``,
    `- **Product**: ${image.product}`,
  ]
  if (image.imageDigest) {
    lines.push(`- **Digest**: \`${image.imageDigest}\``)
  }
  if (image.error) {
    lines.push(`- **Error**: ${image.error}`)
  }
  if (image.missingRequired?.length) {
    lines.push(`- **Missing required packages**: ${image.missingRequired.join(', ')}`)
  }
  lines.push(`- **Checked at**: ${audit.checkedAt}`)
  lines.push(``)
  lines.push(`This issue was automatically created by the daily SBOM verification workflow.`)
  return lines.join('\n')
}

/**
 * Build a plan for creating/updating/closing GitHub issues based on SBOM
 * audit results.
 *
 * @param {{ checkedAt: string, images: Array<{ id: string, product: string, image: string, imageDigest?: string, status: string, error?: string, missingRequired?: string[] }> }} audit
 * @param {Array<{ number: number, title: string, state: string }>} openIssues - currently open issues (pre-filtered to SBOM-related ones is fine; the function also filters)
 * @returns {{ create: Array<{ title: string, body: string, labels: string[] }>, update: Array<{ number: number, title: string, body: string }>, close: Array<{ number: number, state_reason: string }> }}
 */
export function buildSbomIssuePlan(audit, openIssues) {
  const plan = { create: [], update: [], close: [] }

  const failedImages = audit.images.filter(img => img.status === 'unavailable')
  const failedTitles = new Set()

  for (const image of failedImages) {
    const title = issueTitle(image)
    failedTitles.add(title)
    const body = issueBody(image, audit)

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
