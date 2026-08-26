const nestedWorktreeExclude = '**/.worktrees/**'

export function createVitestExclude(cwd = process.cwd()) {
  const exclude = [
    '**/node_modules/**',
    '**/dist/**',
    '**/cypress/**',
    '**/.{idea,git,cache,output,temp}/**',
  ]

  if (!cwd.split(/[/\\]/).includes('.worktrees')) {
    exclude.push(nestedWorktreeExclude)
  }

  return exclude
}
