import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import YAML from 'yaml';

export const CONFIG_FILENAME = '.wbaum.yaml';
export const ALT_CONFIG_FILENAMES = ['.wbaum.yml'];
export const WORKTREE_DIR = '.wbaum';

export async function readConfig(repoRoot) {
  const candidates = [CONFIG_FILENAME, ...ALT_CONFIG_FILENAMES];
  for (const name of candidates) {
    try {
      const raw = await readFile(join(repoRoot, name), 'utf8');
      const parsed = YAML.parse(raw) ?? {};
      return { config: normalize(parsed), source: name };
    } catch (e) {
      if (e.code !== 'ENOENT') throw e;
    }
  }
  return { config: normalize({}), source: null };
}

function normalize(cfg) {
  const setup = Array.isArray(cfg.setup) ? cfg.setup.filter((x) => typeof x === 'string' && x.trim()) : [];
  return { setup };
}
