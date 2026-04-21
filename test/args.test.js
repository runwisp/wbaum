import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseArgs } from '../src/util/args.js';

test('positional args', () => {
  const { positional, options } = parseArgs(['open', 'feature/x']);
  assert.deepEqual(positional, ['open', 'feature/x']);
  assert.deepEqual(options, {});
});

test('flags and options', () => {
  const { positional, options } = parseArgs(
    ['open', 'x', '--from', 'main', '--no-setup'],
    { flags: ['no-setup'], options: ['from'] },
  );
  assert.deepEqual(positional, ['open', 'x']);
  assert.equal(options.from, 'main');
  assert.equal(options['no-setup'], true);
});

test('--key=value form', () => {
  const { options } = parseArgs(['--from=dev'], { options: ['from'] });
  assert.equal(options.from, 'dev');
});

test('short alias', () => {
  const { options } = parseArgs(['-f', 'main'], { options: ['from'], aliases: { f: 'from' } });
  assert.equal(options.from, 'main');
});

test('-- passthrough', () => {
  const { positional } = parseArgs(['a', '--', '--not-a-flag', 'b']);
  assert.deepEqual(positional, ['a', '--not-a-flag', 'b']);
});
