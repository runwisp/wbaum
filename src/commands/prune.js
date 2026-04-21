import { ui, printBanner, spinner } from '../ui.js';
import { mustGit, mainWorktree } from '../util/git.js';

export async function prune() {
  const root = await mainWorktree();
  printBanner();
  ui.newline();
  const sp = spinner('Pruning stale worktree records').start();
  const r = await mustGit(['worktree', 'prune', '-v'], { cwd: root });
  sp.stop('Prune complete');
  const out = r.stdout.trim();
  if (out) out.split('\n').forEach((l) => ui.detail(l));
  else ui.detail('nothing to prune');
}
