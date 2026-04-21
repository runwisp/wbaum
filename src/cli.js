import pc from 'picocolors';
import { open } from './commands/open.js';
import { list } from './commands/list.js';
import { remove } from './commands/remove.js';
import { cd } from './commands/cd.js';
import { prune } from './commands/prune.js';
import { printBanner, ui } from './ui.js';
import { readPackageVersion } from './util/pkg.js';

const COMMANDS = {
  open: { run: open, summary: 'Create (or enter) a worktree and launch setup', usage: 'wbaum open <branch> [--from <base>] [--no-setup] [--no-shell]' },
  list: { run: list, summary: 'List all wbaum-managed worktrees', usage: 'wbaum list' },
  ls: { run: list, hidden: true },
  remove: { run: remove, summary: 'Remove a worktree (and optionally its branch)', usage: 'wbaum remove <branch> [--force] [--keep-branch]' },
  rm: { run: remove, hidden: true },
  cd: { run: cd, summary: 'Enter an existing worktree in a subshell', usage: 'wbaum cd <branch>' },
  enter: { run: cd, hidden: true },
  prune: { run: prune, summary: 'Prune stale worktree records', usage: 'wbaum prune' },
};

const ALIASES = { '-h': 'help', '--help': 'help', '-v': 'version', '--version': 'version' };

export async function main(argv) {
  const [cmdRaw, ...rest] = argv;
  const cmd = ALIASES[cmdRaw] || cmdRaw;

  if (!cmd || cmd === 'help') {
    printHelp();
    return;
  }
  if (cmd === 'version') {
    process.stdout.write(`${await readPackageVersion()}\n`);
    return;
  }

  const entry = COMMANDS[cmd];
  if (!entry) {
    ui.error(`Unknown command: ${pc.bold(cmdRaw)}`);
    process.stderr.write(`Try ${pc.cyan('wbaum --help')}\n`);
    process.exit(2);
  }

  try {
    await entry.run(rest);
  } catch (err) {
    if (err && err.handled) {
      process.exit(err.exitCode ?? 1);
    }
    throw err;
  }
}

function printHelp() {
  printBanner();
  const lines = [];
  lines.push('');
  lines.push(pc.bold('  USAGE'));
  lines.push(`    ${pc.cyan('wbaum')} ${pc.dim('<command>')} ${pc.dim('[...args]')}`);
  lines.push('');
  lines.push(pc.bold('  COMMANDS'));
  for (const [name, meta] of Object.entries(COMMANDS)) {
    if (meta.hidden) continue;
    lines.push(`    ${pc.cyan(name.padEnd(8))} ${meta.summary}`);
  }
  lines.push('');
  lines.push(pc.bold('  EXAMPLES'));
  lines.push(`    ${pc.dim('$')} ${pc.cyan('bunx wbaum open feature/login')}`);
  lines.push(`    ${pc.dim('$')} ${pc.cyan('npx wbaum open hotfix --from main')}`);
  lines.push(`    ${pc.dim('$')} ${pc.cyan('wbaum list')}`);
  lines.push(`    ${pc.dim('$')} ${pc.cyan('wbaum rm feature/login')}`);
  lines.push('');
  lines.push(pc.bold('  .wbaum.yaml'));
  lines.push(pc.dim('    # optional, lives at repo root'));
  lines.push(pc.dim('    setup:'));
  lines.push(pc.dim('      - pnpm install'));
  lines.push(pc.dim('      - cp ../../.env .env'));
  lines.push('');
  process.stdout.write(lines.join('\n') + '\n');
}
