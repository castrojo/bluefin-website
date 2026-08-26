import { describe, expect, it, vi } from 'vitest'
import {
  FAILURE_ISSUE_TITLE,
  listOpenAutomationIssues,
  syncSbomIssues,
  syncWorkflowFailureIssue,
  workflowRunUrl,
} from '../lib/sbom-issue-sync.js'

const CONTEXT = {
  repo: { owner: 'projectbluefin', repo: 'website' },
  runId: 1234567890,
  payload: { repository: { html_url: 'https://github.com/projectbluefin/website' } },
}

const AUDIT = {
  checkedAt: '2026-08-26T10:00:00.000Z',
  images: [
    {
      id: 'bluefin-stable',
      product: 'bluefin',
      image: 'ghcr.io/ublue-os/bluefin:stable',
      required: true,
      status: 'degraded',
      errorCode: 'ambiguous-optional',
      error: 'ambiguous optional fields: mesa',
      ambiguousOptional: ['mesa'],
      lastSuccessfulAt: '2026-08-25T10:00:00.000Z',
    },
    {
      id: 'dakota-gaming',
      product: 'dakota',
      image: 'ghcr.io/projectbluefin/dakota-gaming:testing',
      required: false,
      status: 'unavailable',
      errorCode: 'missing-sbom',
      error: 'No SPDX referrer found',
    },
  ],
}

/**
 * A GitHub client stub whose `paginate` walks every page, exactly like the real
 * one. Passing only page one is how the pagination bug hid.
 */
function makeGithub(openIssues: Array<{ number: number, title: string, state: string }>) {
  const listForRepo = vi.fn(async ({ page = 1, per_page: perPage = 100 }) => ({
    data: openIssues.slice((page - 1) * perPage, page * perPage),
  }))
  const paginate = vi.fn(async (route: typeof listForRepo, params: Record<string, unknown>) => {
    const collected = []
    for (let page = 1; ; page++) {
      const { data } = await route({ ...params, page })
      collected.push(...data)
      if (data.length < (params.per_page as number)) {
        break
      }
    }
    return collected
  })
  return {
    paginate,
    rest: {
      issues: {
        listForRepo,
        create: vi.fn(async () => ({ data: { number: 999 } })),
        update: vi.fn(async () => ({ data: {} })),
      },
    },
  }
}

const fsStub = { readFileSync: () => JSON.stringify(AUDIT) }

describe('workflowRunUrl', () => {
  it('builds the run URL from the repository payload', () => {
    expect(workflowRunUrl(CONTEXT)).toBe('https://github.com/projectbluefin/website/actions/runs/1234567890')
  })

  it('falls back to owner/repo when the payload has no repository', () => {
    expect(workflowRunUrl({ repo: { owner: 'a', repo: 'b' }, runId: 7, payload: {} }))
      .toBe('https://github.com/a/b/actions/runs/7')
  })
})

describe('listOpenAutomationIssues', () => {
  it('paginates instead of reading only the first 100 issues', async () => {
    const issues = Array.from({ length: 250 }, (_, i) => ({ number: i + 1, title: `issue ${i + 1}`, state: 'open' }))
    const github = makeGithub(issues)

    const result = await listOpenAutomationIssues(github, CONTEXT)

    expect(github.paginate).toHaveBeenCalledTimes(1)
    expect(result).toHaveLength(250)
  })

  it('requests only open bug/automation issues', async () => {
    const github = makeGithub([])
    await listOpenAutomationIssues(github, CONTEXT)
    expect(github.paginate).toHaveBeenCalledWith(
      github.rest.issues.listForRepo,
      expect.objectContaining({
        owner: 'projectbluefin',
        repo: 'website',
        state: 'open',
        labels: 'bug,automation',
        per_page: 100,
      }),
    )
  })
})

describe('syncSbomIssues', () => {
  it('creates one issue per product/failure-code with the workflow URL', async () => {
    const github = makeGithub([])
    const plan = await syncSbomIssues({ github, context: CONTEXT, fs: fsStub })

    expect(plan.create).toHaveLength(2)
    expect(github.rest.issues.create).toHaveBeenCalledTimes(2)
    const bodies = github.rest.issues.create.mock.calls.map(call => call[0].body as string)
    expect(bodies.every(body => body.includes('actions/runs/1234567890'))).toBe(true)
    expect(bodies.some(body => body.includes('2026-08-25T10:00:00.000Z'))).toBe(true)
    expect(bodies.some(body => body.includes('none recorded'))).toBe(true)
  })

  it('updates an existing issue found beyond the first page', async () => {
    const filler = Array.from({ length: 120 }, (_, i) => ({ number: i + 1, title: `noise ${i + 1}`, state: 'open' }))
    const github = makeGithub([
      ...filler,
      { number: 500, title: '[SBOM verification] bluefin: ambiguous-optional', state: 'open' },
      { number: 501, title: '[SBOM verification] dakota: missing-sbom', state: 'open' },
    ])

    const plan = await syncSbomIssues({ github, context: CONTEXT, fs: fsStub })

    expect(plan.create).toHaveLength(0)
    expect(plan.update.map(u => u.number).sort()).toEqual([500, 501])
    expect(github.rest.issues.create).not.toHaveBeenCalled()
  })

  it('closes a recovered issue with state_reason completed', async () => {
    const github = makeGithub([
      { number: 42, title: '[SBOM verification] dakota: image-not-found', state: 'open' },
      { number: 43, title: '[SBOM verification] bluefin: ambiguous-optional', state: 'open' },
      { number: 44, title: '[SBOM verification] dakota: missing-sbom', state: 'open' },
    ])

    await syncSbomIssues({ github, context: CONTEXT, fs: fsStub })

    const closeCall = github.rest.issues.update.mock.calls.find(call => call[0].state === 'closed')
    expect(closeCall?.[0]).toMatchObject({ issue_number: 42, state: 'closed', state_reason: 'completed' })
  })

  it('reads the audit from an explicit path', async () => {
    const github = makeGithub([])
    const readFileSync = vi.fn(() => JSON.stringify({ checkedAt: 'x', images: [] }))

    await syncSbomIssues({ github, context: CONTEXT, auditPath: '/somewhere/sbom-audit.json', fs: { readFileSync } })

    expect(readFileSync).toHaveBeenCalledWith('/somewhere/sbom-audit.json', 'utf8')
  })
})

describe('syncWorkflowFailureIssue', () => {
  it('creates the failure issue when none is open', async () => {
    const github = makeGithub([])
    const result = await syncWorkflowFailureIssue({ github, context: CONTEXT })

    expect(result.action).toBe('created')
    expect(github.rest.issues.create).toHaveBeenCalledTimes(1)
    const call = github.rest.issues.create.mock.calls[0][0]
    expect(call.title).toBe(FAILURE_ISSUE_TITLE)
    expect(call.labels).toEqual(['bug', 'automation'])
    expect(call.body).toContain('actions/runs/1234567890')
  })

  it('updates the existing failure issue instead of opening a duplicate', async () => {
    const github = makeGithub([{ number: 77, title: FAILURE_ISSUE_TITLE, state: 'open' }])
    const result = await syncWorkflowFailureIssue({ github, context: CONTEXT })

    expect(result).toMatchObject({ action: 'updated', number: 77 })
    expect(github.rest.issues.create).not.toHaveBeenCalled()
    expect(github.rest.issues.update).toHaveBeenCalledTimes(1)
    expect(github.rest.issues.update.mock.calls[0][0]).toMatchObject({ issue_number: 77 })
  })

  it('finds the existing failure issue past the first page', async () => {
    const filler = Array.from({ length: 100 }, (_, i) => ({ number: i + 1, title: `noise ${i + 1}`, state: 'open' }))
    const github = makeGithub([...filler, { number: 300, title: FAILURE_ISSUE_TITLE, state: 'open' }])

    const result = await syncWorkflowFailureIssue({ github, context: CONTEXT })

    expect(result).toMatchObject({ action: 'updated', number: 300 })
    expect(github.rest.issues.create).not.toHaveBeenCalled()
  })
})
