import { relative, sep } from 'node:path';
import pc from 'picocolors';
import { ui, printBanner } from '../ui.js';
import { repoRoot, listWorktrees } from '../util/git.js';
import { WORKTREE_DIR } from '../util/config.js';

export async function list() {
  const root = await repoRoot();
  const all = await listWorktrees(root);
  const managed = all.filter((w) => {
    const rel = relative(root, w.path);
    return rel === WORKTREE_DIR || rel.startsWith(WORKTREE_DIR + sep);
  });

  printBanner();
  ui.newline();
  if (!managed.length) {
    ui.info('No wbaum worktrees yet.');
    ui.detail('Create one with: wbaum open <branch>');
    return;
  }
  const rows = managed.map((w) => [
    pc.cyan(w.branch ?? pc.dim('(detached)')),
    pc.dim(w.head?.slice(0, 7) ?? ''),
    relative(process.cwd(), w.path) || '.',
    w.locked ? pc.yellow('locked') : '',
  ]);
  ui.table(rows, ['BRANCH', 'HEAD', 'PATH', 'STATUS']);
}
