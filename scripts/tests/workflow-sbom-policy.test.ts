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
