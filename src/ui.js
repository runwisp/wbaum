import pc from 'picocolors';

const isTTY = process.stdout.isTTY;
const SYM = {
  ok: pc.green('✔'),
  warn: pc.yellow('▲'),
  err: pc.red('✖'),
  info: pc.cyan('›'),
  arrow: pc.magenta('❯'),
};

export const ui = {
  info(msg) { write(`  ${SYM.info} ${msg}\n`); },
  success(msg) { write(`  ${SYM.ok} ${msg}\n`); },
  warn(msg) { write(`  ${SYM.warn} ${msg}\n`); },
  error(msg) { process.stderr.write(`  ${SYM.err} ${msg}\n`); },
  step(msg) { write(`  ${SYM.arrow} ${pc.bold(msg)}\n`); },
  detail(msg) { write(`    ${pc.dim(msg)}\n`); },
  newline() { write('\n'); },
  table(rows, headers) {
    if (rows.length === 0) return;
    const stripAnsi = (s) => String(s).replace(/\x1b\[[0-9;]*m/g, '');
    const widths = headers.map((h, i) =>
      Math.max(stripAnsi(h).length, ...rows.map((r) => stripAnsi(r[i] ?? '').length))
    );
    const pad = (cell, i) => {
      const vis = stripAnsi(cell ?? '');
      return String(cell ?? '') + ' '.repeat(Math.max(0, widths[i] - vis.length));
    };
    const line = (cells, color = (x) => x) =>
      '  ' + cells.map((c, i) => color(pad(c, i))).join('  ') + '\n';
    write(line(headers, pc.dim));
    write(line(headers.map((_, i) => '─'.repeat(widths[i])), pc.dim));
    for (const r of rows) write(line(r));
  },
};

function write(s) { process.stdout.write(s); }

export function spinner(label) {
  const frames = ['⠋','⠙','⠹','⠸','⠼','⠴','⠦','⠧','⠇','⠏'];
  let i = 0;
  let timer = null;
  let text = label;
  const render = () => {
    if (!isTTY) return;
    process.stdout.write(`\r  ${pc.cyan(frames[i = (i + 1) % frames.length])} ${text}   `);
  };
  const clear = () => { if (isTTY) process.stdout.write('\r\x1b[2K'); };
  return {
    start() {
      if (isTTY) timer = setInterval(render, 80);
      else write(`  ${SYM.info} ${text}\n`);
      return this;
    },
    update(t) { text = t; },
    stop(finalMsg) {
      if (timer) clearInterval(timer);
      clear();
      if (finalMsg) write(`  ${SYM.ok} ${finalMsg}\n`);
    },
    fail(finalMsg) {
      if (timer) clearInterval(timer);
      clear();
      if (finalMsg) process.stderr.write(`  ${SYM.err} ${finalMsg}\n`);
    },
  };
}

export function printBanner() {
  const w = pc.bold(pc.magenta('wbaum'));
  const tag = pc.dim('— a delightful git worktree manager');
  write(`\n  ${w}  ${tag}\n`);
}
