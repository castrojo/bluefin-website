#!/usr/bin/env node
/**
 * Execute a `github-script` body the way `actions/github-script` does.
 *
 * Fidelity matters in one specific way: the action compiles the YAML `script`
 * into an async function *inside its own bundled module*, so a relative
 * specifier such as `./scripts/lib/foo.js` resolves against the action's
 * directory under `_actions/`, not against the checkout — and throws
 * ERR_MODULE_NOT_FOUND at runtime while every YAML-level assertion passes.
 *
 * This runner therefore lives in its own directory, away from the repository
 * root, while being started with the repository root as the working directory.
 * A body that resolves its imports from `process.cwd()` works here; a body that
 * uses a bare relative specifier fails here, exactly as it does in CI.
 *
 * Input  (env): GH_SCRIPT_BODY, GH_OPEN_ISSUES
 * Output (stdout): {"created": [...], "updated": [...]}
 */

const openIssues = JSON.parse(process.env.GH_OPEN_ISSUES ?? '[]')
const created = []
const updated = []

const github = {
  paginate: async () => openIssues,
  rest: {
    issues: {
      listForRepo: async () => ({ data: openIssues }),
      create: async (params) => {
        created.push(params)
        return { data: { number: 1 } }
      },
      update: async (params) => {
        updated.push(params)
        return { data: {} }
      },
    },
  },
}

const context = {
  repo: { owner: 'projectbluefin', repo: 'website' },
  runId: 987654321,
  payload: { repository: { html_url: 'https://github.com/projectbluefin/website' } },
}

const core = { info: () => {}, warning: () => {}, setFailed: () => {} }

const AsyncFunction = Object.getPrototypeOf(async () => {}).constructor
const run = new AsyncFunction('github', 'context', 'core', 'require', process.env.GH_SCRIPT_BODY)

await run(github, context, core, undefined)

process.stdout.write(JSON.stringify({ created, updated }))
