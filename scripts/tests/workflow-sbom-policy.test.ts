import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { load } from 'js-yaml'
import { describe, expect, it } from 'vitest'

/**
 * Policy tests for the daily SBOM verification workflow.
 *
 * These tests assert the workflow's security posture and operational contract:
 * least-privilege permissions, pinned actions, correct schedule, and that it
 * delegates to the single production command.
 */

const WORKFLOW_PATH = resolve(process.cwd(), '.github/workflows/update-content.yml')

interface WorkflowStep {
  name?: string
  uses?: string
  run?: string
  with?: Record<string, string>
}

interface WorkflowJob {
  permissions?: Record<string, string>
  steps?: WorkflowStep[]
}

interface Workflow {
  on?: {
    schedule?: { cron?: string }[]
    [key: string]: unknown
  }
  permissions?: Record<string, string>
  jobs?: Record<string, WorkflowJob>
}

function loadWorkflow(): Workflow {
  return load(readFileSync(WORKFLOW_PATH, 'utf8')) as Workflow
}

function getAllSteps(workflow: Workflow): WorkflowStep[] {
  const steps: WorkflowStep[] = []
  for (const job of Object.values(workflow.jobs ?? {})) {
    steps.push(...(job.steps ?? []))
  }
  return steps
}

function getActionSteps(workflow: Workflow): WorkflowStep[] {
  return getAllSteps(workflow).filter(s => s.uses != null)
}

describe('update-content.yml workflow policy', () => {
  const workflow = loadWorkflow()

  it('runs on a daily schedule', () => {
    const crons = workflow.on?.schedule?.map(s => s.cron) ?? []
    expect(crons).toContain('0 10 * * *')
  })

  it('has empty top-level permissions', () => {
    expect(workflow.permissions).toEqual({})
  })

  it('grants only contents:read, issues:write, and actions:write to the update job', () => {
    const job = workflow.jobs?.update
    expect(job).toBeDefined()
    const perms = Object.keys(job!.permissions ?? {}).sort()
    expect(perms).toEqual(['actions', 'contents', 'issues'])
    expect(job!.permissions!.contents).toBe('read')
    expect(job!.permissions!.issues).toBe('write')
    expect(job!.permissions!.actions).toBe('write')
  })

  it('pins every action to a full commit SHA', () => {
    const actionSteps = getActionSteps(workflow)
    for (const step of actionSteps) {
      const ref = step.uses!.split('@')[1]
      expect(
        ref,
        `${step.uses} is not pinned to a full commit SHA`,
      ).toMatch(/^[0-9a-f]{40}$/)
    }
  })

  it('installs ORAS', () => {
    const steps = getActionSteps(workflow)
    const oras = steps.find(s => s.uses?.includes('oras-project/setup-oras'))
    expect(oras, 'ORAS setup action not found').toBeDefined()
  })

  it('installs Cosign', () => {
    const steps = getActionSteps(workflow)
    const cosign = steps.find(s => s.uses?.includes('sigstore/cosign-installer'))
    expect(cosign, 'Cosign installer action not found').toBeDefined()
  })

  it('runs npm run update:image-versions as the SBOM verification command', () => {
    const steps = getAllSteps(workflow)
    const sbomStep = steps.find(s => s.run?.includes('update:image-versions'))
    expect(sbomStep, 'No step runs npm run update:image-versions').toBeDefined()
  })

  it('does not run update-stream-versions.js separately', () => {
    const steps = getAllSteps(workflow)
    const step = steps.find(s => s.run?.includes('update-stream-versions'))
    expect(step, 'update-stream-versions.js must not be called separately').toBeUndefined()
  })

  it('does not run update-dakota-versions.js separately', () => {
    const steps = getAllSteps(workflow)
    const step = steps.find(s => s.run?.includes('update-dakota-versions'))
    expect(step, 'update-dakota-versions.js must not be called separately').toBeUndefined()
  })

  it('includes .cache/website-live-data/sbom-audit.json in the cache save paths', () => {
    const steps = getAllSteps(workflow)
    const cacheSave = steps.find(
      s => s.uses?.includes('actions/cache/save') && s.with?.key?.startsWith('website-live-data-'),
    )
    expect(cacheSave, 'cache save step not found').toBeDefined()
    const paths = (cacheSave!.with!.path ?? '').trim().split('\n').map(l => l.trim())
    expect(paths).toContain('.cache/website-live-data/sbom-audit.json')
  })
})

// ---------------------------------------------------------------------------
// github-script execution seam
//
// Parsing the YAML proves the step exists; it does not prove the step runs.
// A relative `await import('./scripts/...')` inside actions/github-script
// resolves against the action's bundle directory and throws ERR_MODULE_NOT_FOUND
// at runtime, which no YAML assertion can catch. These tests execute the
// script body exactly as github-script does — as an async function body with
// `github`, `context`, `core`, and `require` in scope — so the import seam is
// exercised for real.
// ---------------------------------------------------------------------------

const AUDIT_FIXTURE = resolve(process.cwd(), 'scripts/tests/fixtures/sbom-audit-degraded.json')
const RUNNER = resolve(process.cwd(), 'scripts/tests/fixtures/github-script-runner.mjs')

function scriptBodyFor(name: string): string {
  const step = getAllSteps(loadWorkflow()).find(s => s.name === name)
  expect(step, `step '${name}' not found`).toBeDefined()
  const script = step!.with?.script
  expect(script, `step '${name}' has no script body`).toBeDefined()
  return script!
}

interface RecordedCalls {
  created: Record<string, unknown>[]
  updated: Record<string, unknown>[]
}

/**
 * Run a github-script body through `fixtures/github-script-runner.mjs`, which
 * reproduces the action's referrer semantics: the function is compiled inside a
 * module that does not live at the repository root, while the process working
 * directory is the checkout.
 */
function runScriptBody(body: string, openIssues: unknown[], env: Record<string, string> = {}): RecordedCalls {
  const stdout = execFileSync(process.execPath, [RUNNER], {
    cwd: process.cwd(),
    encoding: 'utf8',
    env: { ...process.env, ...env, GH_SCRIPT_BODY: body, GH_OPEN_ISSUES: JSON.stringify(openIssues) },
  })
  return JSON.parse(stdout) as RecordedCalls
}

describe('github-script bodies resolve their imports from the checkout', () => {
  it('runs the SBOM issue management script end to end', () => {
    const { created } = runScriptBody(
      scriptBodyFor('Manage SBOM verification issues'),
      [],
      { SBOM_AUDIT_PATH: AUDIT_FIXTURE },
    )

    expect(created.map(c => c.title).sort()).toEqual([
      '[SBOM verification] bluefin: ambiguous-optional',
      '[SBOM verification] dakota: missing-sbom',
    ])
    expect(created.every(c => String(c.body).includes('actions/runs/987654321'))).toBe(true)
  })

  it('runs the failure-issue script end to end and deduplicates by exact title', () => {
    const { created, updated } = runScriptBody(
      scriptBodyFor('Create issue on failure'),
      [{ number: 314, title: 'Failed to update live data from SBOM sources', state: 'open' }],
    )

    expect(created).toHaveLength(0)
    expect(updated).toHaveLength(1)
    expect(updated[0]).toMatchObject({ issue_number: 314 })
  })

  it('opens exactly one failure issue when none is open yet', () => {
    const { created } = runScriptBody(scriptBodyFor('Create issue on failure'), [])

    expect(created).toHaveLength(1)
    expect(created[0].title).toBe('Failed to update live data from SBOM sources')
  })

  it('fails a body that imports a bare relative specifier (harness negative control)', () => {
    expect(() => runScriptBody(
      'const mod = await import(\'./scripts/lib/sbom-issue-report.js\')\n',
      [],
    )).toThrow(/ERR_MODULE_NOT_FOUND|Cannot find module/)
  })

  it('never uses a bare relative specifier in a github-script body', () => {
    for (const step of getAllSteps(loadWorkflow())) {
      const script = step.with?.script
      if (script == null) {
        continue
      }
      expect(
        /import\(\s*['"`]\.\.?\//.test(script),
        `step '${step.name}' imports a relative path, which resolves against the action bundle at runtime`,
      ).toBe(false)
    }
  })
})

describe('update-content.yml restores the previous live data', () => {
  const workflow = loadWorkflow()

  it('restores the live-data cache before verification runs', () => {
    const steps = getAllSteps(workflow)
    const restoreIndex = steps.findIndex(s => s.uses?.includes('actions/cache/restore'))
    const verifyIndex = steps.findIndex(s => s.run?.includes('update:image-versions'))
    expect(restoreIndex, 'no cache restore step in update-content.yml').toBeGreaterThanOrEqual(0)
    expect(restoreIndex).toBeLessThan(verifyIndex)
  })

  it('restores with the exact save path list, order included', () => {
    const steps = getAllSteps(workflow)
    const restore = steps.find(s => s.uses?.includes('actions/cache/restore'))!
    const save = steps.find(s => s.uses?.includes('actions/cache/save'))!
    const paths = (step: WorkflowStep) => (step.with!.path ?? '').trim().split('\n').map(l => l.trim())
    expect(paths(restore)).toEqual(paths(save))
  })

  it('does not fail the run when no cache exists yet', () => {
    const restore = getAllSteps(workflow).find(s => s.uses?.includes('actions/cache/restore'))!
    expect(String(restore.with!['fail-on-cache-miss'])).toBe('false')
  })
})
