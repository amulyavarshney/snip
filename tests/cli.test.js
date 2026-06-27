#!/usr/bin/env node
'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');

const { parseCliArgs } = require(path.join(__dirname, '..', 'cli', 'snip'));

test('parseCliArgs: no args returns help', () => {
  assert.deepEqual(parseCliArgs([]), { command: 'help' });
});

test('parseCliArgs: status', () => {
  assert.deepEqual(parseCliArgs(['status']), { command: 'status' });
});

test('parseCliArgs: version', () => {
  assert.deepEqual(parseCliArgs(['version']), { command: 'version' });
});

test('parseCliArgs: init', () => {
  assert.deepEqual(parseCliArgs(['init']), { command: 'init' });
});

test('parseCliArgs: sync', () => {
  assert.deepEqual(parseCliArgs(['sync']), { command: 'sync' });
});

test('parseCliArgs: mode ultra', () => {
  const result = parseCliArgs(['mode', 'ultra']);
  assert.equal(result.command, 'mode');
  assert.deepEqual(result.args, ['ultra']);
});

test('parseCliArgs: mode project prod', () => {
  const result = parseCliArgs(['mode', 'project', 'prod']);
  assert.equal(result.command, 'mode');
  assert.deepEqual(result.args, ['project', 'prod']);
});

test('parseCliArgs: lang typescript', () => {
  const result = parseCliArgs(['lang', 'typescript']);
  assert.equal(result.command, 'lang');
  assert.deepEqual(result.args, ['typescript']);
});

test('parseCliArgs: lang project go', () => {
  const result = parseCliArgs(['lang', 'project', 'go']);
  assert.equal(result.command, 'lang');
  assert.deepEqual(result.args, ['project', 'go']);
});

test('parseCliArgs: score with path', () => {
  const result = parseCliArgs(['score', 'src/']);
  assert.equal(result.command, 'score');
  assert.deepEqual(result.args, ['src/']);
});

test('parseCliArgs: score with flags', () => {
  const result = parseCliArgs(['score', 'src/', '--min-score', '60', '--fail-below']);
  assert.equal(result.command, 'score');
  assert.deepEqual(result.args, ['src/', '--min-score', '60', '--fail-below']);
});

test('parseCliArgs: bench', () => {
  const result = parseCliArgs(['bench']);
  assert.equal(result.command, 'bench');
});

test('parseCliArgs: unknown command returns help', () => {
  const result = parseCliArgs(['unknown-command']);
  assert.equal(result.command, 'help');
});

test('parseCliArgs: diff', () => {
  assert.deepEqual(parseCliArgs(['diff']), { command: 'diff', args: [] });
});

test('parseCliArgs: diff with flags', () => {
  const result = parseCliArgs(['diff', '--min-score', '70', '--fail-below']);
  assert.equal(result.command, 'diff');
  assert.deepEqual(result.args, ['--min-score', '70', '--fail-below']);
});
