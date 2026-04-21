import { spawn } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import pc from 'picocolors';
import { ui, spinner, printBanner } from '../ui.js';
import { parseArgs } from '../util/args.js';
import { fail } from '../util/fail.js';
import { git, mainWorktree, currentBranch, branchExists, listWorktrees } from '../util/git.js';
import { readConfig, WORKTREE_DIR } from '../util/config.js';

export async function open(argv) {
  const { positional, options } = parseArgs(argv, {
    flags: ['no-setup', 'no-shell', 'force'],
    options: ['from'],
    aliases: { f: 'from' },
  });
  const [branchArg] = positional;
  if (!branchArg) fail('Missing branch name.', { hint: 'Usage: wbaum open <branch> [--from <base>]' });
  const branch = sanitizeBranch(branchArg);

  printBanner();
  ui.newline();

  const root = await mainWorktree();
  const base = options.from || (await currentBranch(root));
  const worktreeRel = join(WORKTREE_DIR, branch);
  const worktreeAbs = join(root, worktreeRel);

  ui.step(`Opening ${pc.cyan(branch)}`);
  ui.detail(`base:      ${base}`);
  ui.detail(`location:  ${worktreeRel}`);

  await ensureGitignore(root);

  const existing = (await listWorktrees(root)).find(
    (w) => w.path === worktreeAbs || w.branch === branch,
  );

  if (existing && !options.force) {
    ui.newline();
    ui.info(`Worktree already exists at ${pc.cyan(relative(process.cwd(), existing.path) || '.')}`);
  } else {
    await createWorktree({ root, branch, base, worktreeAbs });
  }

  if (!options['no-setup'] && !existing) {
    await runSetup({ root, worktreeAbs, branch });
  } else if (existing) {
    ui.detail('skipping setup (worktree already existed)');
  }

  ui.newline();
  ui.success(`Ready at ${pc.cyan(relative(process.cwd(), worktreeAbs) || '.')}`);

  if (options['no-shell']) {
    if (!process.stdout.isTTY) process.stdout.write(worktreeAbs + '\n');
    return;
  }

  await launchShell(worktreeAbs, branch);
}

function sanitizeBranch(name) {
  const clean = name.trim().replace(/^\/+|\/+$/g, '');
  if (!clean) fail('Branch name is empty.');
  if (/[\s~^:?*\[\\]/.test(clean) || clean.includes('..') || clean.startsWith('-')) {
    fail(`Invalid branch name: ${name}`);
  }
  return clean;
}

async function ensureGitignore(root) {
  const path = join(root, '.gitignore');
  let contents = '';
  try { contents = await readFile(path, 'utf8'); } catch (e) { if (e.code !== 'ENOENT') throw e; }
  const lines = contents.split('\n').map((l) => l.trim());
  const patterns = [`${WORKTREE_DIR}/`, WORKTREE_DIR, `/${WORKTREE_DIR}`, `/${WORKTREE_DIR}/`];
  if (patterns.some((p) => lines.includes(p))) return;
  const needsNL = contents.length > 0 && !contents.endsWith('\n');
  const block = `${needsNL ? '\n' : ''}# wbaum worktrees\n${WORKTREE_DIR}/\n`;
  await writeFile(path, contents + block);
  ui.detail(`added ${WORKTREE_DIR}/ to .gitignore`);
}

async function createWorktree({ root, branch, base, worktreeAbs }) {
  await mkdir(join(worktreeAbs, '..'), { recursive: true });

  const exists = await branchExists(branch, root);
  const sp = spinner(`Creating worktree ${pc.bold(branch)}`).start();
  let r;
  if (exists) {
    sp.update(`Attaching existing branch ${pc.bold(branch)}`);
    r = await git(['worktree', 'add', worktreeAbs, branch], { cwd: root });
  } else {
    r = await git(['worktree', 'add', '-b', branch, worktreeAbs, base], { cwd: root });
  }
  if (r.code !== 0) {
    sp.fail('Failed to create worktree');
    fail(r.stderr.trim() || 'git worktree add failed');
  }
  sp.stop(`Worktree created${exists ? ` (reusing branch ${pc.bold(branch)})` : ''}`);
}

async function runSetup({ root, worktreeAbs, branch }) {
  const { config, source } = await readConfig(root);
  if (!config.setup.length) {
    if (source) ui.detail(`${source}: no setup commands`);
    return;
  }
  ui.newline();
  ui.step(`Running setup from ${pc.bold(source)}`);
  const env = { ...process.env, WBAUM_BRANCH: branch, WBAUM_WORKTREE: worktreeAbs };
  for (const cmd of config.setup) {
    ui.newline();
    process.stdout.write(`  ${pc.magenta('$')} ${pc.bold(cmd)}\n`);
    const code = await spawnInherit(cmd, worktreeAbs, env);
    if (code !== 0) {
      ui.newline();
      fail(`Setup command failed (exit ${code}): ${cmd}`, {
        hint: 'Fix the command in .wbaum.yaml or rerun with --no-setup.',
      });
    }
  }
}

function spawnInherit(cmd, cwd, env = process.env) {
  return new Promise((resolve, reject) => {
    const shell = process.env.SHELL || (process.platform === 'win32' ? true : '/bin/sh');
    const child = spawn(cmd, { cwd, stdio: 'inherit', shell, env });
    child.on('error', reject);
    child.on('close', (code) => resolve(code ?? 0));
  });
}

async function launchShell(cwd, branch) {
  ui.newline();
  ui.step(`Entering ${pc.cyan(branch)} — type ${pc.bold('exit')} to return`);
  ui.newline();
  const shell = process.env.SHELL || (process.platform === 'win32' ? process.env.COMSPEC || 'cmd.exe' : '/bin/sh');
  const env = { ...process.env, WBAUM_BRANCH: branch, WBAUM_WORKTREE: cwd, WBAUM_PROMPT: `(wbaum:${branch})` };
  return new Promise((resolve) => {
    const child = spawn(shell, [], { cwd, stdio: 'inherit', env });
    child.on('close', (code) => {
      ui.newline();
      ui.info(`Left ${pc.cyan(branch)}`);
      resolve(code ?? 0);
    });
  });
}
