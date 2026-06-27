#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..');

function run(scriptName, env, stdin = '', cwd = process.cwd()) {
  return spawnSync(process.execPath, [path.join(ROOT, 'hooks', scriptName)], {
    env: { ...process.env, ...env },
    input: stdin,
    encoding: 'utf8',
    cwd,
  });
}

// ── Codex mode (PLUGIN_DATA set) ──────────────────────────────────────────────

test('Codex: activate writes state file with mode=ultra', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'snip-hooks-'));
  const pluginData = path.join(tmp, 'plugin-data');
  const home = path.join(tmp, 'home');
  fs.mkdirSync(home, { recursive: true });

  const result = run('snip-activate.js', {
    HOME: home, USERPROFILE: home,
    PLUGIN_DATA: pluginData,
    SNIP_DEFAULT_MODE: 'ultra',
  });

  assert.equal(result.status, 0, result.stderr);
  const statePath = path.join(pluginData, '.snip-active');
  assert.ok(fs.existsSync(statePath), 'state file created');
  const lines = fs.readFileSync(statePath, 'utf8').split('\n');
  assert.equal(lines[0], 'ultra', 'mode written correctly');

  const output = JSON.parse(result.stdout);
  assert.match(output.systemMessage, /^SNIP:ULTRA/, 'systemMessage has SNIP:ULTRA');
  assert.match(output.hookSpecificOutput.additionalContext, /SNIP MODE ACTIVE — level: ultra/);

  fs.rmSync(tmp, { recursive: true, force: true });
});

test('Codex: activate with mode=off clears state file', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'snip-hooks-'));
  const pluginData = path.join(tmp, 'plugin-data');
  const home = path.join(tmp, 'home');
  fs.mkdirSync(pluginData, { recursive: true });
  fs.mkdirSync(home, { recursive: true });
  // Pre-write a state file that should be cleared
  fs.writeFileSync(path.join(pluginData, '.snip-active'), 'full\n');

  run('snip-activate.js', {
    HOME: home, USERPROFILE: home,
    PLUGIN_DATA: pluginData,
    SNIP_DEFAULT_MODE: 'off',
  });

  assert.ok(!fs.existsSync(path.join(pluginData, '.snip-active')), 'state file removed on off');
  fs.rmSync(tmp, { recursive: true, force: true });
});

test('Codex: mode-tracker /snip prod updates state', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'snip-hooks-'));
  const pluginData = path.join(tmp, 'plugin-data');
  const home = path.join(tmp, 'home');
  fs.mkdirSync(pluginData, { recursive: true });
  fs.mkdirSync(home, { recursive: true });
  fs.writeFileSync(path.join(pluginData, '.snip-active'), 'full\ntypescript');

  const result = run('snip-mode-tracker.js', {
    HOME: home, USERPROFILE: home,
    PLUGIN_DATA: pluginData,
    SNIP_DEFAULT_MODE: 'full',
  }, JSON.stringify({ prompt: '/snip prod' }));

  assert.equal(result.status, 0, result.stderr);
  const lines = fs.readFileSync(path.join(pluginData, '.snip-active'), 'utf8').split('\n');
  assert.equal(lines[0], 'prod', 'mode updated to prod');
  assert.equal(lines[1], 'typescript', 'language preserved');

  const output = JSON.parse(result.stdout);
  assert.match(output.systemMessage, /^SNIP:PROD/);

  fs.rmSync(tmp, { recursive: true, force: true });
});

test('Codex: mode-tracker /snip lang go updates language', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'snip-hooks-'));
  const pluginData = path.join(tmp, 'plugin-data');
  const home = path.join(tmp, 'home');
  fs.mkdirSync(pluginData, { recursive: true });
  fs.mkdirSync(home, { recursive: true });
  fs.writeFileSync(path.join(pluginData, '.snip-active'), 'full\n');

  run('snip-mode-tracker.js', {
    HOME: home, USERPROFILE: home,
    PLUGIN_DATA: pluginData,
    SNIP_DEFAULT_MODE: 'full',
  }, JSON.stringify({ prompt: '/snip lang go' }));

  const lines = fs.readFileSync(path.join(pluginData, '.snip-active'), 'utf8').split('\n');
  assert.equal(lines[1], 'go', 'language updated to go');

  fs.rmSync(tmp, { recursive: true, force: true });
});

test('Codex: mode-tracker "no snip" clears state', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'snip-hooks-'));
  const pluginData = path.join(tmp, 'plugin-data');
  const home = path.join(tmp, 'home');
  fs.mkdirSync(pluginData, { recursive: true });
  fs.mkdirSync(home, { recursive: true });
  fs.writeFileSync(path.join(pluginData, '.snip-active'), 'ultra\n');

  const result = run('snip-mode-tracker.js', {
    HOME: home, USERPROFILE: home,
    PLUGIN_DATA: pluginData,
    SNIP_DEFAULT_MODE: 'full',
  }, JSON.stringify({ prompt: 'no snip please' }));

  assert.equal(result.status, 0, result.stderr);
  assert.ok(!fs.existsSync(path.join(pluginData, '.snip-active')), 'state cleared');
  const output = JSON.parse(result.stdout);
  assert.equal(output.systemMessage, 'SNIP:OFF');

  fs.rmSync(tmp, { recursive: true, force: true });
});

test('Codex: activate detects language from nested src/ directory', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'snip-hooks-'));
  const pluginData = path.join(tmp, 'plugin-data');
  const home = path.join(tmp, 'home');
  const project = path.join(tmp, 'project');
  const srcDir = path.join(project, 'src');
  fs.mkdirSync(pluginData, { recursive: true });
  fs.mkdirSync(home, { recursive: true });
  fs.mkdirSync(srcDir, { recursive: true });

  // No .rs files at root; all Rust files are nested inside src/
  for (let i = 0; i < 5; i++) fs.writeFileSync(path.join(srcDir, `lib${i}.rs`), '');

  const result = run('snip-activate.js', {
    HOME: home, USERPROFILE: home,
    PLUGIN_DATA: pluginData,
    SNIP_DEFAULT_MODE: 'full',
  }, '', project);

  assert.equal(result.status, 0, result.stderr);
  const lines = fs.readFileSync(path.join(pluginData, '.snip-active'), 'utf8').split('\n');
  assert.equal(lines[1], 'rust', 'rust detected from nested src/ directory');

  fs.rmSync(tmp, { recursive: true, force: true });
});

// ── Claude Code mode (no PLUGIN_DATA) ────────────────────────────────────────

test('Claude Code: activate writes state file to ~/.claude/.snip-active', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'snip-hooks-'));
  const home = path.join(tmp, 'home');
  fs.mkdirSync(home, { recursive: true });
  const env = { HOME: home, USERPROFILE: home, SNIP_DEFAULT_MODE: 'full' };
  delete env.PLUGIN_DATA;

  const result = run('snip-activate.js', env);

  assert.equal(result.status, 0, result.stderr);
  const statePath = path.join(home, '.claude', '.snip-active');
  assert.ok(fs.existsSync(statePath), 'Claude Code state file written');
  const lines = fs.readFileSync(statePath, 'utf8').split('\n');
  assert.equal(lines[0], 'full');

  fs.rmSync(tmp, { recursive: true, force: true });
});

test('Claude Code: activate emits plain text (not JSON)', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'snip-hooks-'));
  const home = path.join(tmp, 'home');
  fs.mkdirSync(home, { recursive: true });

  const result = run('snip-activate.js', {
    HOME: home, USERPROFILE: home, SNIP_DEFAULT_MODE: 'full'
  });

  assert.equal(result.status, 0, result.stderr);
  // Claude Code output should NOT be JSON
  assert.ok(!result.stdout.startsWith('{'), 'Claude Code output is not JSON');
  assert.ok(result.stdout.includes('SNIP MODE ACTIVE'), 'contains expected text');

  fs.rmSync(tmp, { recursive: true, force: true });
});
