#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');

const { getConfig } = require('./snip-config');
const { getSnipInstructions } = require('./snip-instructions');
const { clearState, isCodex, setModeAndLang, writeHookOutput } = require('./snip-runtime');

const claudeDir = path.join(os.homedir(), '.claude');
const claudeSettingsPath = path.join(claudeDir, 'settings.json');

// Detect dominant language by file extension count in a directory.
function detectLanguage(dir) {
  const counts = { python: 0, typescript: 0, go: 0, rust: 0, java: 0, csharp: 0 };
  try {
    const entries = fs.readdirSync(dir);
    for (const entry of entries) {
      if (entry.startsWith('.') || entry === 'node_modules') continue;
      const ext = path.extname(entry).toLowerCase();
      if (ext === '.py') counts.python++;
      else if (ext === '.ts' || ext === '.tsx') counts.typescript++;
      else if (ext === '.go') counts.go++;
      else if (ext === '.rs') counts.rust++;
      else if (ext === '.java') counts.java++;
      else if (ext === '.cs') counts.csharp++;
    }
  } catch (_) {
    return null;
  }

  const max = Math.max(...Object.values(counts));
  if (max === 0) return null;

  // Tie-break: prefer whichever appears first alphabetically for determinism.
  for (const [lang, count] of Object.entries(counts)) {
    if (count === max) return lang;
  }
  return null;
}

function resolveLanguage(config) {
  const { language, overlays } = config;

  if (!language || language === 'none') return null;

  let resolved = null;
  if (language === 'auto') {
    resolved = detectLanguage(process.cwd());
  } else if (['python', 'typescript', 'go'].includes(language)) {
    resolved = language;
  }

  if (!resolved) return null;

  // Respect per-language overlay toggles from .snip.json
  if (overlays && overlays[resolved] === false) return null;

  return resolved;
}

const config = getConfig();
const mode = config.mode;

if (mode === 'off') {
  clearState();
  writeHookOutput('SessionStart', 'off', null, isCodex ? '' : 'OK');
  process.exit(0);
}

const lang = resolveLanguage(config);

try {
  setModeAndLang(mode, lang);
} catch (_) {
  // Best-effort — don't block the hook if the state file can't be written.
}

let output = getSnipInstructions(mode, lang);

// Nudge Claude Code users to configure the statusline if it's missing.
if (!isCodex) {
  try {
    let hasStatusline = false;
    if (fs.existsSync(claudeSettingsPath)) {
      const settings = JSON.parse(fs.readFileSync(claudeSettingsPath, 'utf8'));
      if (settings.statusLine) hasStatusline = true;
    }

    if (!hasStatusline) {
      const isWin = process.platform === 'win32';
      const script = isWin ? 'snip-statusline.ps1' : 'snip-statusline.sh';
      const scriptPath = path.join(__dirname, script);
      const command = isWin
        ? `powershell -ExecutionPolicy Bypass -File "${scriptPath}"`
        : `bash "${scriptPath}"`;
      const snippet = `"statusLine": { "type": "command", "command": ${JSON.stringify(command)} }`;
      output += `\n\nSTATUSLINE SETUP: The snip plugin includes a statusline badge ` +
        `showing active mode (e.g. [SNIP:FULL], [SNIP:PROD]). ` +
        `Add this to ~/.claude/settings.json to enable it: ${snippet}. ` +
        `Proactively offer to set this up for the user on first interaction.`;
    }
  } catch (_) {}
}

writeHookOutput('SessionStart', mode, lang, output);
