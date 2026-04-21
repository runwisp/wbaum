import { ui } from '../ui.js';

export function fail(message, { exitCode = 1, hint } = {}) {
  ui.error(message);
  if (hint) process.stderr.write(`    ${hint}\n`);
  const err = new Error(message);
  err.handled = true;
  err.exitCode = exitCode;
  throw err;
}
