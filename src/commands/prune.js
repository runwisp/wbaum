import { relative, sep } from 'node:path';
import pc from 'picocolors';
import { ui, printBanner, spinner } from '../ui.js';
import { parseArgs } from '../util/args.js';
import { git, mustGit, mainWorktree, listWorktrees } from '../util/git.js';
import { WORKTREE_DIR } from '../util/config.js';

export async function prune(argv = []) {
  const { options } = parseArgs(argv, {
    flags: ['dry-run', 'force', 'keep-branches'],
    aliases: { n: 'dry-run', f: 'force' },
  });

  const root = await mainWorktree();
  printBanner();
  ui.newline();

  const def = await detectDefaultBranch(root);
  if (def) {
    ui.info(`Default branch: ${pc.bold(def.local)} ${pc.dim(`(via ${def.source})`)}`);
  } else {
    ui.warn('Could not detect default branch — skipping merged-worktree cleanup.');
    ui.detail('Set origin/HEAD with: git remote set-head origin --auto');
  }

  const all = await listWorktrees(root);
  const managed = all.filter((w) => {
    const rel = relative(root, w.path);
    return rel === WORKTREE_DIR || rel.startsWith(WORKTREE_DIR + sep);
  });

  if (def) {
    const merged = await mergedBranches(def.ref, root);
    const eligible = managed.filter(
      (w) => w.branch && !w.detached && !w.locked && w.branch !== def.local,
    );
    const candidates = [];
    for (const w of eligible) {
      if (merged.has(w.branch)) {
        candidates.push({ w, squash: false });
        continue;
      }
      if (await isSquashMerged(w.branch, def.ref, root)) {
        candidates.push({ w, squash: true });
      }
    }

    if (!candidates.length) {
      ui.detail('no merged worktrees to remove');
    } else {
      for (const { w, squash } of candidates) {
        const suffix = squash ? pc.dim(' [squash-merged]') : '';
        const label = `${pc.bold(w.branch)} ${pc.dim(`(${relative(root, w.path) || w.path})`)}${suffix}`;
        if (options['dry-run']) {
          ui.step(`would remove ${label}`);
          continue;
        }
        const sp = spinner(`Removing ${label}`).start();
        const rmArgs = ['worktree', 'remove', w.path];
        if (options.force) rmArgs.splice(2, 0, '--force');
        const r = await git(rmArgs, { cwd: root });
        if (r.code !== 0) {
          sp.fail(`Failed to remove worktree ${pc.bold(w.branch)}`);
          ui.detail(r.stderr.trim().split('\n')[0] || 'git worktree remove failed');
          ui.detail('Pass --force to remove dirty worktrees.');
          continue;
        }
        sp.stop(`Removed worktree ${label}`);

        if (options['keep-branches']) {
          ui.detail(`kept branch ${w.branch}`);
          continue;
        }
        const useForce = options.force || squash;
        const delArgs = ['branch', useForce ? '-D' : '-d', w.branch];
        const r2 = await git(delArgs, { cwd: root });
        if (r2.code !== 0) {
          ui.warn(`Kept branch ${pc.bold(w.branch)} — ${(r2.stderr.trim().split('\n')[0]) || 'could not delete'}`);
        } else {
          ui.detail(`branch ${w.branch} deleted`);
        }
      }
    }
  }

  const sp = spinner('Pruning stale worktree records').start();
  const r = await mustGit(['worktree', 'prune', '-v', '--expire=now'], { cwd: root });
  sp.stop('Prune complete');
  const out = (r.stderr + r.stdout).trim();
  if (out) out.split('\n').forEach((l) => ui.detail(l));
  else ui.detail('no stale records');
}

async function detectDefaultBranch(cwd) {
  const head = await git(['symbolic-ref', '--quiet', '--short', 'refs/remotes/origin/HEAD'], { cwd });
  if (head.code === 0) {
    const full = head.stdout.trim();
    if (full) {
      const local = full.replace(/^origin\//, '');
      return { local, ref: `refs/remotes/origin/${local}`, source: 'origin/HEAD' };
    }
  }
  for (const name of ['main', 'master']) {
    const remote = await git(['show-ref', '--verify', '--quiet', `refs/remotes/origin/${name}`], { cwd });
    if (remote.code === 0) return { local: name, ref: `refs/remotes/origin/${name}`, source: `origin/${name}` };
    const local = await git(['show-ref', '--verify', '--quiet', `refs/heads/${name}`], { cwd });
    if (local.code === 0) return { local: name, ref: `refs/heads/${name}`, source: name };
  }
  return null;
}

async function mergedBranches(ref, cwd) {
  const r = await git(['for-each-ref', '--format=%(refname:short)', '--merged', ref, 'refs/heads/'], { cwd });
  if (r.code !== 0) return new Set();
  return new Set(
    r.stdout
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean),
  );
}

// Detects squash/rebase merges: if the cumulative tree change of <branch>
// (relative to its merge-base with <baseRef>) is already represented as a
// commit upstream, we treat the branch as merged.
async function isSquashMerged(branch, baseRef, cwd) {
  const mb = await git(['merge-base', baseRef, branch], { cwd });
  if (mb.code !== 0) return false;
  const mergeBase = mb.stdout.trim();
  if (!mergeBase) return false;

  const tip = await git(['rev-parse', `${branch}^{commit}`], { cwd });
  if (tip.code !== 0) return false;
  if (tip.stdout.trim() === mergeBase) return false;

  const tree = await git(['rev-parse', `${branch}^{tree}`], { cwd });
  if (tree.code !== 0) return false;

  const baseTree = await git(['rev-parse', `${mergeBase}^{tree}`], { cwd });
  if (baseTree.code === 0 && baseTree.stdout.trim() === tree.stdout.trim()) {
    // no net change vs. base — already represented
    return true;
  }

  const env = {
    ...process.env,
    GIT_AUTHOR_NAME: 'wbaum',
    GIT_AUTHOR_EMAIL: 'wbaum@localhost',
    GIT_COMMITTER_NAME: 'wbaum',
    GIT_COMMITTER_EMAIL: 'wbaum@localhost',
    GIT_AUTHOR_DATE: '1970-01-01T00:00:00Z',
    GIT_COMMITTER_DATE: '1970-01-01T00:00:00Z',
  };
  const synth = await git(
    ['commit-tree', tree.stdout.trim(), '-p', mergeBase, '-m', 'wbaum-squash-probe'],
    { cwd, env },
  );
  if (synth.code !== 0) return false;

  const cherry = await git(['cherry', baseRef, synth.stdout.trim()], { cwd });
  if (cherry.code !== 0) return false;
  return cherry.stdout.trim().startsWith('-');
}
