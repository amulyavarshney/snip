#!/usr/bin/env node
'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

// Each test gets its own temp dir to avoid cross-test pollution.
function makeTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'snip-config-'));
}

function loadConfig(env, startDir) {
  // Isolate module state by deleting cached require entries.
  Object.keys(require.cache).forEach((k) => {
    if (k.includes('snip-config')) delete require.cache[k];
  });
  const saved = {};
  for (const [k, v] of Object.entries(env)) {
    saved[k] = process.env[k];
    process.env[k] = v;
  }
  try {
    const mod = require(path.join(__dirname, '..', 'hooks', 'snip-config'));
    return mod.getConfig(startDir);
  } finally {
    for (const [k] of Object.entries(env)) {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    }
  }
}

test('env var overrides project and user config', () => {
  const tmp = makeTempDir();
  fs.writeFileSync(path.join(tmp, '.snip.json'), JSON.stringify({ mode: 'lite' }));
  const cfg = loadConfig({ SNIP_DEFAULT_MODE: 'ultra' }, tmp);
  assert.equal(cfg.mode, 'ultra', 'env var wins over project config');
  fs.rmSync(tmp, { recursive: true, force: true });
});

test('project .snip.json mode overrides user config default', () => {
  const tmp = makeTempDir();
  fs.writeFileSync(path.join(tmp, '.snip.json'), JSON.stringify({ mode: 'prod' }));
  const savedEnv = process.env.SNIP_DEFAULT_MODE;
  delete process.env.SNIP_DEFAULT_MODE;
  const cfg = loadConfig({}, tmp);
  process.env.SNIP_DEFAULT_MODE = savedEnv;
  assert.equal(cfg.mode, 'prod');
  fs.rmSync(tmp, { recursive: true, force: true });
});

test('invalid mode in .snip.json falls through to default', () => {
  const tmp = makeTempDir();
  fs.writeFileSync(path.join(tmp, '.snip.json'), JSON.stringify({ mode: 'extreme' }));
  const savedEnv = process.env.SNIP_DEFAULT_MODE;
  delete process.env.SNIP_DEFAULT_MODE;
  const cfg = loadConfig({}, tmp);
  if (savedEnv !== undefined) process.env.SNIP_DEFAULT_MODE = savedEnv;
  assert.equal(cfg.mode, 'full', 'invalid mode falls through to default full');
  fs.rmSync(tmp, { recursive: true, force: true });
});

test('.snip.json walk-up: found in parent directory', () => {
  const tmp = makeTempDir();
  const subdir = path.join(tmp, 'packages', 'app');
  fs.mkdirSync(subdir, { recursive: true });
  fs.writeFileSync(path.join(tmp, '.snip.json'), JSON.stringify({ mode: 'ultra' }));
  const savedEnv = process.env.SNIP_DEFAULT_MODE;
  delete process.env.SNIP_DEFAULT_MODE;
  const cfg = loadConfig({}, subdir);
  if (savedEnv !== undefined) process.env.SNIP_DEFAULT_MODE = savedEnv;
  assert.equal(cfg.mode, 'ultra', 'walk-up finds parent .snip.json');
  fs.rmSync(tmp, { recursive: true, force: true });
});

test('prod.protect loaded correctly from .snip.json', () => {
  const tmp = makeTempDir();
  fs.writeFileSync(path.join(tmp, '.snip.json'), JSON.stringify({
    prod: { protect: ['auth', 'payments'] }
  }));
  const savedEnv = process.env.SNIP_DEFAULT_MODE;
  delete process.env.SNIP_DEFAULT_MODE;
  const cfg = loadConfig({}, tmp);
  if (savedEnv !== undefined) process.env.SNIP_DEFAULT_MODE = savedEnv;
  assert.deepEqual(cfg.prod.protect, ['auth', 'payments']);
  fs.rmSync(tmp, { recursive: true, force: true });
});

test('ceiling.warnAtLoc loaded as number', () => {
  const tmp = makeTempDir();
  fs.writeFileSync(path.join(tmp, '.snip.json'), JSON.stringify({
    ceiling: { warnAtLoc: 75 }
  }));
  const savedEnv = process.env.SNIP_DEFAULT_MODE;
  delete process.env.SNIP_DEFAULT_MODE;
  const cfg = loadConfig({}, tmp);
  if (savedEnv !== undefined) process.env.SNIP_DEFAULT_MODE = savedEnv;
  assert.equal(cfg.ceiling.warnAtLoc, 75);
  fs.rmSync(tmp, { recursive: true, force: true });
});

test('overlay toggles respected: python: false disables overlay', () => {
  const tmp = makeTempDir();
  fs.writeFileSync(path.join(tmp, '.snip.json'), JSON.stringify({
    overlays: { python: false }
  }));
  const savedEnv = process.env.SNIP_DEFAULT_MODE;
  delete process.env.SNIP_DEFAULT_MODE;
  const cfg = loadConfig({}, tmp);
  if (savedEnv !== undefined) process.env.SNIP_DEFAULT_MODE = savedEnv;
  assert.equal(cfg.overlays.python, false);
  assert.equal(cfg.overlays.typescript, true, 'other overlays still enabled');
  fs.rmSync(tmp, { recursive: true, force: true });
});

test('no .snip.json: defaults are sensible', () => {
  const tmp = makeTempDir();
  const savedEnv = process.env.SNIP_DEFAULT_MODE;
  delete process.env.SNIP_DEFAULT_MODE;
  const cfg = loadConfig({}, tmp);
  if (savedEnv !== undefined) process.env.SNIP_DEFAULT_MODE = savedEnv;
  assert.equal(cfg.mode, 'full');
  assert.equal(cfg.language, 'auto');
  assert.equal(cfg.overlays.python, true);
  assert.equal(cfg.overlays.typescript, true);
  assert.equal(cfg.overlays.go, true);
  fs.rmSync(tmp, { recursive: true, force: true });
});
