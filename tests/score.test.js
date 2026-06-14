#!/usr/bin/env node
'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const { PATTERNS, scoreFile, scoreDir, formatReport } = require(
  path.join(__dirname, '..', 'score', 'snip-score')
);

function tmpFile(name, content) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'snip-score-'));
  const file = path.join(dir, name);
  fs.writeFileSync(file, content, 'utf8');
  return { file, dir };
}

test('scoreFile: clean file scores 100', () => {
  const { file, dir } = tmpFile('clean.js', [
    'const x = 1;',
    'const y = x + 2;',
    'module.exports = y;',
  ].join('\n'));

  const result = scoreFile(file);
  assert.equal(result.score, 100);
  assert.equal(result.deletableLoc, 0);
  fs.rmSync(dir, { recursive: true, force: true });
});

test('scoreFile: Validator class counts as deletable', () => {
  const { file, dir } = tmpFile('validator.js', [
    'class EmailValidator {',
    '  validate(email) {',
    '    return email.includes("@");',
    '  }',
    '}',
  ].join('\n'));

  const result = scoreFile(file);
  assert.ok(result.deletableLoc >= 1, 'validator class detected');
  assert.ok(result.score < 100, 'score below 100 when deletable patterns found');
  fs.rmSync(dir, { recursive: true, force: true });
});

test('scoreFile: snip:prod lines excluded from score', () => {
  const { file, dir } = tmpFile('auth.js', [
    '// snip:prod — HMAC verification trust boundary',
    'const sig = Buffer.from(header, "hex");',
    'const expected = hmac.digest();',
    'if (!timingSafeEqual(sig, expected)) return 401;',
  ].join('\n'));

  const result = scoreFile(file);
  assert.equal(result.prodLines, 1, 'one snip:prod line counted');
  assert.equal(result.totalLoc, 3, 'prod line excluded from totalLoc');
  fs.rmSync(dir, { recursive: true, force: true });
});

test('scoreFile: snip:safe lines excluded from score', () => {
  const { file, dir } = tmpFile('setup.js', [
    '// snip:safe — shared fixture used by all auth tests',
    'const testDb = createTestDatabase();',
    'const user = createTestUser(testDb);',
    'const x = 1;',
  ].join('\n'));

  const result = scoreFile(file);
  assert.equal(result.safeLines, 1, 'one snip:safe line counted');
  assert.equal(result.totalLoc, 3, 'safe line excluded from totalLoc');
  fs.rmSync(dir, { recursive: true, force: true });
});

test('scoreFile: RetryPolicy class counts as deletable', () => {
  const { file, dir } = tmpFile('retry.ts', [
    'class ExponentialBackoffPolicy {',
    '  execute(fn: () => void) {}',
    '}',
  ].join('\n'));

  const result = scoreFile(file);
  assert.ok(result.deletableLoc >= 1, 'retry class detected');
  fs.rmSync(dir, { recursive: true, force: true });
});

test('scoreFile: returns score=null on missing file', () => {
  const result = scoreFile('/nonexistent/path/file.js');
  assert.equal(result.score, null);
  assert.ok(result.error, 'error message present');
});

test('scoreDir: aggregates multiple files', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'snip-score-dir-'));
  fs.writeFileSync(path.join(dir, 'clean.ts'), 'const x = 1;\nconst y = 2;\n');
  fs.writeFileSync(path.join(dir, 'bloat.ts'), 'class EmailValidator {\n  validate(e) { return true; }\n}\n');

  const result = scoreDir(dir);
  assert.equal(result.files.length, 2, 'two files scored');
  assert.ok(typeof result.overall === 'number', 'overall score is a number');
  fs.rmSync(dir, { recursive: true, force: true });
});

test('scoreDir: skips node_modules', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'snip-score-dir-'));
  const nm = path.join(dir, 'node_modules', 'lib');
  fs.mkdirSync(nm, { recursive: true });
  fs.writeFileSync(path.join(nm, 'index.js'), 'class AbstractManager {}\n');
  fs.writeFileSync(path.join(dir, 'app.js'), 'const x = 1;\n');

  const result = scoreDir(dir);
  assert.equal(result.files.length, 1, 'node_modules skipped');
  fs.rmSync(dir, { recursive: true, force: true });
});

test('formatReport: single file report includes score', () => {
  const report = formatReport({ score: 85, deletableLoc: 3, totalLoc: 20, prodLines: 2, findings: [] });
  assert.ok(report.includes('85'), 'score present in report');
  assert.ok(report.includes('snip:prod'), 'prod lines mentioned');
});

test('scoreFile: new patterns — builder, DTO, singleton detected', () => {
  const { file, dir } = tmpFile('bloat2.ts', [
    'class UserBuilder { build() {} }',
    'class OrderDto { id: number; }',
    'static getInstance() { return this.instance; }',
  ].join('\n'));

  const result = scoreFile(file);
  assert.ok(result.deletableLoc >= 2, 'builder and dto detected');
  fs.rmSync(dir, { recursive: true, force: true });
});

test('getOverlayText: returns content for new languages', () => {
  const { getOverlayText } = require(path.join(__dirname, '..', 'hooks', 'snip-instructions'));
  const rust = getOverlayText('rust');
  assert.ok(rust !== null, 'rust overlay exists');
  assert.ok(rust.includes('Language idioms: Rust'), 'rust overlay header');

  const java = getOverlayText('java');
  assert.ok(java !== null, 'java overlay exists');
  assert.ok(java.includes('Language idioms: Java'), 'java overlay header');

  const cs = getOverlayText('csharp');
  assert.ok(cs !== null, 'csharp overlay exists');
  assert.ok(cs.includes('Language idioms: C#'), 'csharp overlay header');
});

test('PATTERNS exported and non-empty', () => {
  assert.ok(Array.isArray(PATTERNS), 'PATTERNS is an array');
  assert.ok(PATTERNS.length >= 20, 'PATTERNS has at least 20 entries after enhancements');
  for (const p of PATTERNS) {
    assert.ok(typeof p.name === 'string', 'pattern has name');
    assert.ok(typeof p.test === 'function', 'pattern has test function');
  }
});
