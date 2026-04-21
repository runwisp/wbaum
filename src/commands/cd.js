import { spawn } from 'node:child_process';
import { join } from 'node:path';
import pc from 'picocolors';
import { ui, printBanner } from '../ui.js';
import { parseArgs } from '../util/args.js';
import { fail } from '../util/fail.js';
import { repoRoot, listWorktrees } from '../util/git.js';
import { WORKTREE_DIR } from '../util/config.js';

export async function cd(argv) {
  const { positional } = parseArgs(argv);
  const [branch] = positional;
  if (!branch) fail('Missing branch name.', { hint: 'Usage: wbaum cd <branch>' });

  const root = await repoRoot();
  const target = join(root, WORKTREE_DIR, branch);
  const match = (await listWorktrees(root)).find((w) => w.path === target || w.branch === branch);
  if (!match) fail(`No worktree for ${pc.bold(branch)}`, { hint: 'wbaum open ' + branch });

  if (!process.stdout.isTTY) {
    process.stdout.write(match.path + '\n');
    return;
  }

  printBanner();
  ui.newline();
  ui.step(`Entering ${pc.cyan(branch)} — type ${pc.bold('exit')} to return`);
  ui.newline();

  const shell = process.env.SHELL || (process.platform === 'win32' ? process.env.COMSPEC || 'cmd.exe' : '/bin/sh');
  const env = { ...process.env, WBAUM_BRANCH: branch, WBAUM_WORKTREE: match.path };
  await new Promise((resolve) => {
    const child = spawn(shell, [], { cwd: match.path, stdio: 'inherit', env });
    child.on('close', () => {
      ui.newline();
      ui.info(`Left ${pc.cyan(branch)}`);
      resolve();
    });
  });
}
