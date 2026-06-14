#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');

// Codex sets PLUGIN_DATA; Claude Code does not.
const isCodex = Boolean(process.env.PLUGIN_DATA);

const statePath = isCodex
  ? path.join(process.env.PLUGIN_DATA, '.snip-active')
  : path.join(os.homedir(), '.claude', '.snip-active');

// State file format: two lines — "mode\nlang"
// e.g. "full\ntypescript" or "ultra\n"

function setModeAndLang(mode, lang) {
  fs.mkdirSync(path.dirname(statePath), { recursive: true });
  fs.writeFileSync(statePath, `${mode}\n${lang || ''}`, 'utf8');
}

function clearState() {
  try { fs.unlinkSync(statePath); } catch (_) {}
}

function readState() {
  try {
    const lines = fs.readFileSync(statePath, 'utf8').split('\n');
    return { mode: lines[0] || 'full', lang: lines[1] || null };
  } catch (_) {
    return { mode: 'full', lang: null };
  }
}

function writeHookOutput(event, mode, lang, context) {
  if (!isCodex) {
    if (context) process.stdout.write(context);
    return;
  }

  // Codex systemMessage: SNIP:MODE[:LANG_ABBREV]
  const langAbbrev = lang ? `:${lang.slice(0, 2).toUpperCase()}` : '';
  const output = { systemMessage: `SNIP:${mode.toUpperCase()}${langAbbrev}` };

  if (context) {
    output.hookSpecificOutput = {
      hookEventName: event,
      additionalContext: context,
    };
  }

  process.stdout.write(JSON.stringify(output));
}

module.exports = {
  clearState,
  isCodex,
  readState,
  setModeAndLang,
  statePath,
  writeHookOutput,
};
