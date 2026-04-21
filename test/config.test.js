import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readConfig } from '../src/util/config.js';

test('missing config returns empty setup', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'wbaum-'));
  const { config, source } = await readConfig(dir);
  assert.deepEqual(config.setup, []);
  assert.equal(source, null);
});

test('parses .wbaum.yaml', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'wbaum-'));
  await writeFile(join(dir, '.wbaum.yaml'), 'setup:\n  - npm install\n  - npm run prepare\n');
  const { config, source } = await readConfig(dir);
  assert.deepEqual(config.setup, ['npm install', 'npm run prepare']);
  assert.equal(source, '.wbaum.yaml');
});

test('falls back to .wbaum.yml', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'wbaum-'));
  await writeFile(join(dir, '.wbaum.yml'), 'setup: [echo hi]\n');
  const { config, source } = await readConfig(dir);
  assert.deepEqual(config.setup, ['echo hi']);
  assert.equal(source, '.wbaum.yml');
});

test('ignores non-string setup entries', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'wbaum-'));
  await writeFile(join(dir, '.wbaum.yaml'), 'setup:\n  - ok\n  - "null"\n  - ""\n  - 42\n');
  const { config } = await readConfig(dir);
  assert.deepEqual(config.setup, ['ok', 'null']);
});
