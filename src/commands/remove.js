import { join } from 'node:path';
import pc from 'picocolors';
import { ui, spinner, printBanner } from '../ui.js';
import { parseArgs } from '../util/args.js';
import { fail } from '../util/fail.js';
import { git, repoRoot, listWorktrees } from '../util/git.js';
import { WORKTREE_DIR } from '../util/config.js';

export async function remove(argv) {
  const { positional, options } = parseArgs(argv, {
    flags: ['force', 'keep-branch'],
  });
  const [branch] = positional;
  if (!branch) fail('Missing branch name.', { hint: 'Usage: wbaum remove <branch>' });

  printBanner();
  ui.newline();

  const root = await repoRoot();
  const worktreeAbs = join(root, WORKTREE_DIR, branch);
  const all = await listWorktrees(root);
  const match = all.find((w) => w.path === worktreeAbs || w.branch === branch);
  if (!match) fail(`No worktree found for ${pc.bold(branch)}`, { hint: 'Run: wbaum list' });

  const sp = spinner(`Removing worktree ${pc.bold(branch)}`).start();
  const args = ['worktree', 'remove', match.path];
  if (options.force) args.splice(2, 0, '--force');
  const r = await git(args, { cwd: root });
  if (r.code !== 0) {
    sp.fail('Failed to remove worktree');
    fail(r.stderr.trim() || 'git worktree remove failed', {
      hint: 'Pass --force to remove a dirty worktree.',
    });
  }
  sp.stop('Worktree removed');

  if (!options['keep-branch'] && match.branch) {
    const delSp = spinner(`Deleting branch ${pc.bold(match.branch)}`).start();
    const args2 = ['branch', options.force ? '-D' : '-d', match.branch];
    const r2 = await git(args2, { cwd: root });
    if (r2.code !== 0) {
      delSp.stop();
      ui.warn(`Kept branch ${pc.bold(match.branch)} — ${(r2.stderr.trim().split('\n')[0]) || 'not fully merged'}`);
      ui.detail('Pass --force to force-delete, or --keep-branch to silence this.');
    } else {
      delSp.stop(`Branch ${pc.bold(match.branch)} deleted`);
    }
  } else if (options['keep-branch'] && match.branch) {
    ui.detail(`kept branch ${match.branch}`);
  }
}
