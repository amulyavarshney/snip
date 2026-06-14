#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.join(__dirname, '..');
const FIX = process.argv.includes('--fix');

function read(relPath) {
  return fs.readFileSync(path.join(ROOT, relPath), 'utf8').replace(/\r\n/g, '\n');
}

function getBaseRevision() {
  const content = read('rules/base.md');
  return crypto.createHash('sha256').update(content).digest('hex').slice(0, 8);
}

function extractStamp(content) {
  const m = content.match(/<!--\s*snip:generated from rules\/base\.md rev:([0-9a-f]+)\s*-->/);
  return m ? m[1] : null;
}

function buildGeneratedContent(baseContent, { prependFrontmatter, prependStamp } = {}) {
  const rev = getBaseRevision();
  const stamp = `<!-- snip:generated from rules/base.md rev:${rev} -->\n`;
  let out = stamp;
  if (prependFrontmatter) out += prependFrontmatter + '\n';
  out += baseContent.trim() + '\n';
  return out;
}

// IDE copy definitions: [relPath, options]
// prependFrontmatter: MDC frontmatter to add after stamp (for Cursor .mdc files)
const IDE_COPIES = [
  ['.cursor/rules/snip.mdc', {
    prependFrontmatter: '---\ndescription: Snip ruthless efficiency mode\nglobs:\nalwaysApply: true\n---',
  }],
  ['.windsurf/rules/snip.md', {}],
  ['.clinerules/snip.md', {}],
  ['.github/copilot-instructions.md', {}],
];

const INVARIANTS = [
  'snip:prod',
  'Can this be deleted entirely',
  'ONE runnable check',
  'trust boundaries',
  'ceiling and the upgrade path',
];

let failed = false;

// Layer 1: check/fix generation stamps
const baseContent = read('rules/base.md');
const currentRev = getBaseRevision();

for (const [relPath, opts] of IDE_COPIES) {
  const fullPath = path.join(ROOT, relPath);

  if (FIX) {
    const generated = buildGeneratedContent(baseContent, opts);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, generated, 'utf8');
    console.log(`  synced: ${relPath}`);
  } else {
    try {
      const existing = fs.readFileSync(fullPath, 'utf8');
      const stamp = extractStamp(existing);
      if (stamp !== currentRev) {
        console.error(`STALE: ${relPath} (stamp ${stamp || 'missing'}, current ${currentRev})`);
        failed = true;
      }
    } catch (_) {
      console.error(`MISSING: ${relPath}`);
      failed = true;
    }
  }
}

// Layer 2: invariant phrases must appear in both AGENTS.md and SKILL.md
const sources = [
  ['AGENTS.md', read('AGENTS.md')],
  ['skills/snip/SKILL.md', read('skills/snip/SKILL.md')],
];

for (const phrase of INVARIANTS) {
  for (const [label, text] of sources) {
    if (!text.includes(phrase)) {
      console.error(`MISSING INVARIANT in ${label}: "${phrase}"`);
      failed = true;
    }
  }
}

if (FIX) {
  console.log(`Rule copies synced (rev ${currentRev}).`);
} else if (failed) {
  console.error('\nRun: node scripts/check-rule-copies.js --fix');
  process.exit(1);
} else {
  console.log(`Rule copies up to date (rev ${currentRev}). ${INVARIANTS.length} invariants present.`);
}
