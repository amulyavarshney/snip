#!/usr/bin/env node
'use strict';

const { getDefaultMode, normalizeMode, normalizeConfigMode, VALID_LANGS } = require('./snip-config');
const { clearState, readState, setModeAndLang, writeHookOutput } = require('./snip-runtime');

const DEACTIVATE_RE = /\b(stop snip|no snip|normal mode|disable snip)\b/i;
const SNIP_CMD_RE = /^[/@$]snip(?::snip)?(?:-review|(?:\s+.*)?)$/i;

function parseSnipCommand(prompt) {
  const p = prompt.trim();

  // Deactivation phrases (checked before command parsing)
  if (DEACTIVATE_RE.test(p)) return { type: 'deactivate' };

  // Must start with /snip, @snip, or $snip
  if (!/^[/@$]snip/i.test(p)) return { type: 'noop' };

  const parts = p.replace(/^[@$]/, '/').toLowerCase().split(/\s+/);
  const cmd = parts[0];

  if (cmd === '/snip-review' || cmd === '/snip:snip-review') {
    return { type: 'set-mode', mode: 'review' };
  }

  if (cmd === '/snip-help' || cmd === '/snip:snip-help') {
    return { type: 'noop' }; // help is handled by the skill, not the hook
  }

  if (cmd !== '/snip' && cmd !== '/snip:snip') return { type: 'noop' };

  const sub = parts[1] || '';
  const arg = parts[2] || '';

  // /snip lang <language>
  if (sub === 'lang') {
    if (arg === 'none' || arg === '') return { type: 'set-lang', lang: null };
    if (VALID_LANGS.includes(arg)) return { type: 'set-lang', lang: arg };
    return { type: 'noop' };
  }

  // /snip status
  if (sub === 'status') return { type: 'status' };

  // /snip [mode]
  if (!sub) return { type: 'set-mode', mode: getDefaultMode() };

  const modeNorm = normalizeMode(sub) || normalizeConfigMode(sub);
  if (modeNorm) return { type: 'set-mode', mode: modeNorm };

  return { type: 'noop' };
}

let raw = '';
process.stdin.on('data', (chunk) => { raw += chunk; });
process.stdin.on('end', () => {
  try {
    const data = JSON.parse(raw.replace(/^﻿/, ''));
    const prompt = (data.prompt || '').trim();
    const action = parseSnipCommand(prompt);

    if (action.type === 'deactivate') {
      clearState();
      writeHookOutput('UserPromptSubmit', 'off', null, 'SNIP MODE OFF');
      return;
    }

    if (action.type === 'status') {
      const { mode, lang } = readState();
      const langNote = lang ? ` [${lang}]` : '';
      writeHookOutput('UserPromptSubmit', mode, lang, `SNIP STATUS: level ${mode}${langNote}`);
      return;
    }

    if (action.type === 'set-mode') {
      const { lang: currentLang } = readState();
      const newMode = action.mode;
      if (newMode === 'off') {
        clearState();
        writeHookOutput('UserPromptSubmit', 'off', null, 'SNIP MODE OFF');
      } else {
        setModeAndLang(newMode, currentLang);
        const langNote = currentLang ? ` [${currentLang}]` : '';
        writeHookOutput('UserPromptSubmit', newMode, currentLang,
          `SNIP MODE CHANGED — level: ${newMode}${langNote}`);
      }
      return;
    }

    if (action.type === 'set-lang') {
      const { mode: currentMode } = readState();
      setModeAndLang(currentMode, action.lang);
      const langNote = action.lang ? ` [${action.lang}]` : ' [none]';
      writeHookOutput('UserPromptSubmit', currentMode, action.lang,
        `SNIP LANGUAGE CHANGED — level: ${currentMode}${langNote}`);
      return;
    }

    // noop — no output needed
  } catch (_) {
    // Silent fail — never break the user's session over a hook error.
  }
});

module.exports = { parseSnipCommand }; // exported for testing
