#!/usr/bin/env node
'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');

const {
  filterSkillForMode,
  getOverlayText,
  getSnipInstructions,
  getFallbackInstructions,
} = require(path.join(__dirname, '..', 'hooks', 'snip-instructions'));

test('filterSkillForMode: keeps full row, strips lite and ultra rows', () => {
  const text = [
    '| **lite** | lite behavior |',
    '| **full** | full behavior |',
    '| **ultra** | ultra behavior |',
    '| **prod** | prod behavior |',
    'Some normal rule line.',
  ].join('\n');

  const result = filterSkillForMode(text, 'full');
  assert.ok(result.includes('full behavior'), 'full row kept');
  assert.ok(!result.includes('lite behavior'), 'lite row stripped');
  assert.ok(!result.includes('ultra behavior'), 'ultra row stripped');
  assert.ok(!result.includes('prod behavior'), 'prod row stripped');
  assert.ok(result.includes('Some normal rule line.'), 'non-mode line kept');
});

test('filterSkillForMode: strips frontmatter', () => {
  const text = '---\nname: snip\n---\n\nBody text here.';
  const result = filterSkillForMode(text, 'full');
  assert.ok(!result.includes('name: snip'), 'frontmatter stripped');
  assert.ok(result.includes('Body text here.'), 'body kept');
});

test('filterSkillForMode: example lines filtered by mode', () => {
  const text = [
    '- lite: lite example text',
    '- full: full example text',
    '- ultra: ultra example text',
  ].join('\n');

  const result = filterSkillForMode(text, 'ultra');
  assert.ok(result.includes('ultra example text'), 'ultra example kept');
  assert.ok(!result.includes('lite example text'), 'lite example stripped');
  assert.ok(!result.includes('full example text'), 'full example stripped');
});

test('filterSkillForMode: unknown mode defaults to full', () => {
  const text = '| **full** | full row |\n| **ultra** | ultra row |';
  const result = filterSkillForMode(text, 'unknown-mode');
  assert.ok(result.includes('full row'), 'full row kept for unknown mode');
  assert.ok(!result.includes('ultra row'), 'ultra row stripped for unknown mode');
});

test('getOverlayText: returns content for valid languages', () => {
  const py = getOverlayText('python');
  assert.ok(py !== null, 'python overlay exists');
  assert.ok(py.includes('Language idioms: Python'), 'python overlay header present');

  const ts = getOverlayText('typescript');
  assert.ok(ts !== null, 'typescript overlay exists');
  assert.ok(ts.includes('Language idioms: TypeScript'), 'typescript overlay header present');

  const go = getOverlayText('go');
  assert.ok(go !== null, 'go overlay exists');
  assert.ok(go.includes('Language idioms: Go'), 'go overlay header present');
});

test('getOverlayText: returns null for unknown language', () => {
  const result = getOverlayText('cobol');
  assert.equal(result, null, 'unknown language returns null');
});

test('getOverlayText: returns null for null/undefined', () => {
  assert.equal(getOverlayText(null), null);
  assert.equal(getOverlayText(undefined), null);
});

test('getSnipInstructions: header includes mode and lang', () => {
  const result = getSnipInstructions('ultra', 'go');
  assert.ok(result.startsWith('SNIP MODE ACTIVE — level: ultra [go]'), 'header correct');
});

test('getSnipInstructions: typescript overlay appended', () => {
  const result = getSnipInstructions('full', 'typescript');
  assert.ok(result.includes('Language idioms: TypeScript'), 'typescript overlay present');
});

test('getSnipInstructions: no overlay when lang is null', () => {
  const result = getSnipInstructions('full', null);
  assert.ok(!result.includes('Language idioms:'), 'no overlay section when lang is null');
  assert.ok(!result.includes('[null]'), 'no [null] in header');
});

test('getSnipInstructions: review mode returns brief note', () => {
  const result = getSnipInstructions('review', null);
  assert.ok(result.includes('snip-review skill'), 'review mode note present');
});

test('getSnipInstructions: prod mode included in output', () => {
  const result = getSnipInstructions('prod', null);
  assert.ok(result.includes('snip:prod'), 'snip:prod mentioned in prod mode output');
});

test('getFallbackInstructions: includes all 7 rungs', () => {
  const result = getFallbackInstructions('full', null);
  for (let i = 0; i <= 6; i++) {
    assert.ok(result.includes(`${i}.`), `rung ${i} present in fallback`);
  }
});

test('filterSkillForMode: review mode returns empty string, not full content', () => {
  const text = '| **full** | full row |\nSome rule text.';
  const result = filterSkillForMode(text, 'review');
  assert.equal(result, '', 'review mode yields empty string from filter');
});

test('getFallbackInstructions: includes trust boundaries clause', () => {
  const result = getFallbackInstructions('full', null);
  assert.ok(result.includes('trust boundaries') || result.includes('Trust boundaries'), 'trust boundaries present');
});
