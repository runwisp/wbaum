export function parseArgs(argv, spec = {}) {
  const flags = new Set(spec.flags ?? []);
  const options = new Set(spec.options ?? []);
  const aliases = spec.aliases ?? {};
  const positional = [];
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--') {
      positional.push(...argv.slice(i + 1));
      break;
    }
    if (a.startsWith('--')) {
      let [k, v] = a.slice(2).split('=');
      k = aliases[k] ?? k;
      if (flags.has(k) && v === undefined) { out[k] = true; continue; }
      if (options.has(k)) {
        if (v === undefined) v = argv[++i];
        out[k] = v;
        continue;
      }
      out[k] = v ?? true;
      continue;
    }
    if (a.startsWith('-') && a.length > 1) {
      const k = aliases[a.slice(1)] ?? a.slice(1);
      if (flags.has(k)) { out[k] = true; continue; }
      if (options.has(k)) { out[k] = argv[++i]; continue; }
      out[k] = true;
      continue;
    }
    positional.push(a);
  }
  return { positional, options: out };
}
