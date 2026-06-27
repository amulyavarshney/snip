#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const SKILL_PATH = path.join(__dirname, '..', 'skills', 'snip', 'SKILL.md');
const OVERLAY_DIR = path.join(__dirname, '..', 'rules', 'overlays');

const RUNTIME_MODES = new Set(['lite', 'full', 'ultra', 'prod']);
const REVIEW_MODES = new Set(['review']);
const ALL_MODES = new Set([...RUNTIME_MODES, ...REVIEW_MODES]);

function normalizeMode(s) {
  if (typeof s !== 'string') return null;
  const m = s.trim().toLowerCase();
  return RUNTIME_MODES.has(m) ? m : null;
}

function filterSkillForMode(text, mode) {
  const normalized = typeof mode === 'string' ? mode.trim().toLowerCase() : null;
  // review mode has no skill body to filter — callers should use getSnipInstructions instead
  if (normalized && REVIEW_MODES.has(normalized)) return '';
  const effectiveMode = normalizeMode(mode) || 'full';
  const body = String(text || '').replace(/^---[\s\S]*?---\s*/, '');

  return body
    .split(/\r?\n/)
    .filter((line) => {
      // Filter intensity table rows: | **lite** | ... |
      const tableMatch = line.match(/^\|\s*\*\*(.+?)\*\*\s*\|/);
      if (tableMatch) {
        const label = normalizeMode(tableMatch[1].trim());
        if (label) return label === effectiveMode;
      }

      // Filter worked examples: "- lite: ..." / "- ultra: ..."
      const exampleMatch = line.match(/^-\s*([a-z]+):\s/);
      if (exampleMatch) {
        const label = normalizeMode(exampleMatch[1].trim());
        if (label) return label === effectiveMode;
      }

      return true;
    })
    .join('\n');
}

function getOverlayText(lang) {
  if (!lang) return null;
  const normalized = lang.trim().toLowerCase();
  const overlayPath = path.join(OVERLAY_DIR, normalized + '.md');
  try {
    return fs.readFileSync(overlayPath, 'utf8');
  } catch (_) {
    return null;
  }
}

function getFallbackInstructions(mode, lang) {
  const effectiveMode = normalizeMode(mode) || 'full';
  const langNote = lang ? ` [${lang}]` : '';
  return [
    `SNIP MODE ACTIVE — level: ${effectiveMode}${langNote}`,
    '',
    'You are an engineer who knows the best change is a deletion.',
    '',
    '## The 7-rung ladder',
    '',
    'Stop at the first rung that holds:',
    '0. Can this be deleted entirely?',
    '1. Does this need to exist at all? (YAGNI)',
    '2. Does the standard library do this? Use it.',
    '3. Does a native platform feature cover it? Use it.',
    '4. Does an already-installed dependency solve it? Use it.',
    '5. Can it be one line? Make it one line.',
    '6. Only then: write the minimum code that works.',
    '',
    '## Rules',
    '',
    'No unrequested abstractions. No boilerplate for later. Deletion beats addition.',
    'Mark simplifications: `// snip: <what, ceiling, upgrade path>`.',
    'Auth/money/security paths: tag `// snip:prod — <reason>`, do not simplify.',
    '',
    '## Output',
    '',
    'Code first. Then: → snipped: [X] → add when: [Y] → upgrade to: [Z]',
    '',
    '## Not lean about',
    '',
    'Trust boundaries, auth paths, money/data-loss paths, security, accessibility.',
    'Non-trivial logic leaves ONE runnable check. One-liners need no test.',
  ].join('\n');
}

function getSnipInstructions(mode, lang) {
  const effectiveMode = normalizeMode(mode) || 'full';
  const langNote = lang ? ` [${lang}]` : '';

  if (typeof mode === 'string' && REVIEW_MODES.has(mode.trim().toLowerCase())) {
    return `SNIP MODE ACTIVE — level: review${langNote}. Behavior defined by /snip-review skill.`;
  }

  let skillText;
  try {
    skillText = fs.readFileSync(SKILL_PATH, 'utf8');
  } catch (_) {
    return getFallbackInstructions(effectiveMode, lang);
  }

  let composed = `SNIP MODE ACTIVE — level: ${effectiveMode}${langNote}\n\n`;
  composed += filterSkillForMode(skillText, effectiveMode);

  const overlay = getOverlayText(lang);
  if (overlay) {
    composed += '\n\n---\n\n' + overlay;
  }

  return composed;
}

module.exports = {
  filterSkillForMode,
  getFallbackInstructions,
  getOverlayText,
  getSnipInstructions,
};
