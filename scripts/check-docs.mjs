import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { extname, join, relative, resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const errors = []

function walk(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === '.git') {
      return []
    }
    const path = join(directory, entry.name)
    return entry.isDirectory() ? walk(path) : [path]
  })
}

function addError(message) {
  errors.push(message)
}

const markdown = walk(root).filter(path => extname(path).toLowerCase() === '.md')
const required = ['AGENTS.md', 'docs/SKILL.md', 'docs/skills/INDEX.md', 'docs/README.md']
for (const path of required) {
  if (!existsSync(join(root, path))) {
    addError(`missing required file: ${path}`)
  }
}

const banned = ['IMPROVEMENTS.md', 'CHANGELOG.md', 'CHANGES.md', 'SESSION.md', 'NOTES.md', 'PLAN.md', 'TODO.md']
for (const path of banned) {
  if (existsSync(join(root, path))) {
    addError(`banned agent changelog or session file: ${path} (write learnings to docs/skills/ instead)`)
  }
}

const bannedSessionDirectories = ['docs/superpowers/plans', 'docs/superpowers/specs']
for (const path of bannedSessionDirectories) {
  if (existsSync(join(root, path))) {
    addError(`banned committed session directory: ${path} (use the agent session folder instead)`)
  }
}

const router = existsSync(join(root, 'docs/SKILL.md'))
  ? readFileSync(join(root, 'docs/SKILL.md'), 'utf8')
  : ''

const skillFiles = walk(join(root, 'docs/skills')).filter(path => path.endsWith('/SKILL.md'))
for (const path of skillFiles) {
  const relativePath = relative(root, path)
  const directory = relative(join(root, 'docs/skills'), path).split('/')[0]
  const source = readFileSync(path, 'utf8')
  const frontMatterStart = source.startsWith('---\n')
  const frontMatterEnd = source.indexOf('\n---\n', 4)

  if (!frontMatterStart || frontMatterEnd === -1) {
    addError(`${relativePath}: missing YAML front matter`)
    continue
  }

  const fields = source.slice(4, frontMatterEnd).split('\n')
  const name = fields.find(line => line.startsWith('name:'))?.slice(5).trim()
  const description = fields.find(line => line.startsWith('description:'))?.slice(12).trim()

  if (!name || !description) {
    addError(`${relativePath}: front matter needs name and description`)
  }
  if (name && name !== directory) {
    addError(`${relativePath}: name '${name}' does not match '${directory}'`)
  }
  if (!router.includes(`skills/${directory}/SKILL.md`)) {
    addError(`${relativePath}: not routed from docs/SKILL.md`)
  }
  if (source.split('\n').length > 500) {
    addError(`${relativePath}: exceeds 500 lines`)
  }

  // The canonical skill spec (`/addyosmani/agent-skills`). `## Verification` is
  // checked for every Markdown file below; these are the rest of it. Eight of
  // twelve skills had drifted without `## Common Rationalizations`, which is
  // the section that records the excuse that leads to each Red Flag — the part
  // an agent actually argues with itself about.
  const requiredSections = [
    '## When to Use',
    '## When NOT to Use',
    '## Core Process',
    '## Common Rationalizations',
    '## Red Flags',
  ]
  for (const section of requiredSections) {
    if (!source.includes(`\n${section}\n`)) {
      addError(`${relativePath}: missing ${section} section`)
    }
  }
}

for (const path of markdown) {
  const relativePath = relative(root, path)
  const source = readFileSync(path, 'utf8')
  if (skillFiles.includes(path) && !source.includes('## Verification')) {
    addError(`${relativePath}: missing Verification section`)
  }

  const links = [...source.matchAll(/\[[^\]]+\]\([^)]+\)/g)].map(([match]) => {
    const start = match.lastIndexOf('](') + 2
    return match.slice(start, -1)
  })
  for (const link of links) {
    if (/^(?:https?:|mailto:|#)/.test(link)) {
      continue
    }
    const target = link.split('#')[0]
    if (!target) {
      continue
    }
    const resolved = resolve(path, '..', target)
    if (!existsSync(resolved)) {
      addError(`${relativePath}: broken link ${link}`)
    }
  }
}

if (errors.length) {
  process.stderr.write(`${errors.join('\n')}\n`)
  process.exit(1)
}

process.stdout.write(`checked ${markdown.length} Markdown files and ${skillFiles.length} skills\n`)
