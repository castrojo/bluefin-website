/**
 * Execute the SBOM issue plan against the GitHub API.
 *
 * This module exists so the daily workflow's `github-script` step stays a
 * two-line loader. A relative `await import('./scripts/...')` inside
 * `actions/github-script` resolves against the action's own bundle directory,
 * not the checked-out repository, so it silently fails there and cannot be
 * tested locally at all. Keeping the logic in a checked-in module means the
 * exact code CI runs is the code the test suite runs.
 */
import fs from 'node:fs'
import path from 'node:path'
import { buildSbomIssuePlan } from './sbom-issue-report.js'

export const DEFAULT_AUDIT_PATH = '.cache/website-live-data/sbom-audit.json'
export const FAILURE_ISSUE_TITLE = 'Failed to update live data from SBOM sources'
export const AUTOMATION_LABELS = Object.freeze(['bug', 'automation'])

/**
 * @param {object} context - github-script context
 * @returns {string} URL of the current workflow run
 */
export function workflowRunUrl(context) {
  const repositoryUrl = context?.payload?.repository?.html_url
    ?? `https://github.com/${context?.repo?.owner}/${context?.repo?.repo}`
  return `${repositoryUrl}/actions/runs/${context?.runId}`
}

/**
 * List every open automation issue.
 *
 * Uses `github.paginate`: a single `listForRepo` call returns at most one page,
 * so deduplication silently breaks the day the repository has more than 100
 * open automation issues — and the symptom is duplicate issues, not an error.
 *
 * @param {object} github - github-script octokit client
 * @param {object} context - github-script context
 * @returns {Promise<Array<{ number: number, title: string, state: string }>>}
 */
export async function listOpenAutomationIssues(github, context) {
  const issues = await github.paginate(github.rest.issues.listForRepo, {
    owner: context.repo.owner,
    repo: context.repo.repo,
    state: 'open',
    labels: AUTOMATION_LABELS.join(','),
    per_page: 100,
  })
  return issues.map(issue => ({ number: issue.number, title: issue.title, state: issue.state }))
}

/**
 * Create, update, and close SBOM verification issues from the current audit.
 *
 * @param {{ github: object, context: object, core?: object, auditPath?: string, fs?: object }} deps
 * @returns {Promise<{ create: object[], update: object[], close: object[] }>} the executed plan
 */
export async function syncSbomIssues(deps) {
  const { github, context, core, fs: fsImpl = fs } = deps
  const auditPath = deps.auditPath
    ?? process.env.SBOM_AUDIT_PATH
    ?? path.join(process.cwd(), ...DEFAULT_AUDIT_PATH.split('/'))

  const audit = JSON.parse(fsImpl.readFileSync(auditPath, 'utf8'))
  const openIssues = await listOpenAutomationIssues(github, context)
  const plan = buildSbomIssuePlan(audit, openIssues, { workflowUrl: workflowRunUrl(context) })

  for (const item of plan.create) {
    await github.rest.issues.create({
      owner: context.repo.owner,
      repo: context.repo.repo,
      title: item.title,
      body: item.body,
      labels: item.labels,
    })
    core?.info?.(`Created issue: ${item.title}`)
  }

  for (const item of plan.update) {
    await github.rest.issues.update({
      owner: context.repo.owner,
      repo: context.repo.repo,
      issue_number: item.number,
      body: item.body,
    })
    core?.info?.(`Updated issue #${item.number}: ${item.title}`)
  }

  for (const item of plan.close) {
    await github.rest.issues.update({
      owner: context.repo.owner,
      repo: context.repo.repo,
      issue_number: item.number,
      state: 'closed',
      state_reason: item.state_reason,
    })
    core?.info?.(`Closed issue #${item.number}`)
  }

  return plan
}

/**
 * Create or update the single issue that reports a failed live-data run.
 *
 * Deduplicated by exact title: a daily job that opens a new issue per failure
 * buries the one issue anybody would read under a month of copies.
 *
 * @param {{ github: object, context: object, core?: object }} deps
 * @returns {Promise<{ action: 'created'|'updated', number?: number, title: string }>}
 */
export async function syncWorkflowFailureIssue(deps) {
  const { github, context, core } = deps
  const runUrl = workflowRunUrl(context)
  const body = [
    `The automated live-data update failed.`,
    ``,
    `- **Workflow run**: ${runUrl}`,
    `- **Failed at**: ${new Date().toISOString()}`,
    ``,
    `Check the workflow run for the failing step. This issue is reused by every`,
    `subsequent failure and closed manually once the run is green again.`,
  ].join('\n')

  const openIssues = await listOpenAutomationIssues(github, context)
  const existing = openIssues.find(issue => issue.title === FAILURE_ISSUE_TITLE)

  if (existing) {
    await github.rest.issues.update({
      owner: context.repo.owner,
      repo: context.repo.repo,
      issue_number: existing.number,
      body,
    })
    core?.info?.(`Updated failure issue #${existing.number}`)
    return { action: 'updated', number: existing.number, title: FAILURE_ISSUE_TITLE }
  }

  const created = await github.rest.issues.create({
    owner: context.repo.owner,
    repo: context.repo.repo,
    title: FAILURE_ISSUE_TITLE,
    body,
    labels: [...AUTOMATION_LABELS],
  })
  core?.info?.(`Created failure issue: ${FAILURE_ISSUE_TITLE}`)
  return { action: 'created', number: created?.data?.number, title: FAILURE_ISSUE_TITLE }
}
