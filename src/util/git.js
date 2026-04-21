import { spawn } from 'node:child_process';
import { fail } from './fail.js';

export function run(cmd, args, { cwd, stdio = 'pipe', env } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { cwd, stdio, env: env ?? process.env });
    let stdout = '';
    let stderr = '';
    if (child.stdout) child.stdout.on('data', (d) => (stdout += d.toString()));
    if (child.stderr) child.stderr.on('data', (d) => (stderr += d.toString()));
    child.on('error', reject);
    child.on('close', (code) => resolve({ code, stdout, stderr }));
  });
}

export async function git(args, opts = {}) {
  return run('git', args, opts);
}

export async function mustGit(args, opts = {}) {
  const r = await git(args, opts);
  if (r.code !== 0) {
    fail(`git ${args.join(' ')} failed`, { hint: r.stderr.trim() || r.stdout.trim() });
  }
  return r;
}

export async function repoRoot(cwd = process.cwd()) {
  const r = await git(['rev-parse', '--show-toplevel'], { cwd });
  if (r.code !== 0) {
    fail('Not inside a git repository.', { hint: 'Run wbaum from within a git repo.' });
  }
  return r.stdout.trim();
}

// Returns the absolute path of the main worktree (the repo root that owns
// the .git directory), even when invoked from inside a linked worktree.
export async function mainWorktree(cwd = process.cwd()) {
  const r = await mustGit(['worktree', 'list', '--porcelain'], { cwd });
  const first = r.stdout.split(/\n\n+/).find(Boolean) ?? '';
  for (const line of first.split('\n')) {
    if (line.startsWith('worktree ')) return line.slice('worktree '.length).trim();
  }
  // Fallback: ask git directly
  return (await repoRoot(cwd));
}

export async function currentBranch(cwd) {
  const r = await git(['symbolic-ref', '--quiet', '--short', 'HEAD'], { cwd });
  if (r.code === 0) return r.stdout.trim();
  const head = await git(['rev-parse', '--short', 'HEAD'], { cwd });
  return head.stdout.trim();
}

export async function branchExists(name, cwd) {
  const r = await git(['show-ref', '--verify', '--quiet', `refs/heads/${name}`], { cwd });
  return r.code === 0;
}

export async function listWorktrees(cwd) {
  const r = await mustGit(['worktree', 'list', '--porcelain'], { cwd });
  const blocks = r.stdout.split(/\n\n+/).filter(Boolean);
  return blocks.map((block) => {
    const out = {};
    for (const line of block.split('\n')) {
      const [k, ...v] = line.split(' ');
      out[k] = v.join(' ');
    }
    return {
      path: out.worktree,
      head: out.HEAD,
      branch: out.branch ? out.branch.replace(/^refs\/heads\//, '') : null,
      detached: 'detached' in out,
      locked: 'locked' in out,
    };
  });
}
