#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');

const DEFAULT_MODE = 'full';
const VALID_MODES = ['off', 'lite', 'full', 'ultra', 'prod', 'review'];
const RUNTIME_MODES = ['off', 'lite', 'full', 'ultra', 'prod'];
const VALID_LANGS = ['python', 'typescript', 'go', 'rust', 'java', 'csharp', 'auto'];

function normalizeMode(s) {
  if (typeof s !== 'string') return null;
  const m = s.trim().toLowerCase();
  return RUNTIME_MODES.includes(m) ? m : null;
}

function normalizeConfigMode(s) {
  if (typeof s !== 'string') return null;
  const m = s.trim().toLowerCase();
  return VALID_MODES.includes(m) ? m : null;
}

function getUserConfigDir() {
  if (process.env.XDG_CONFIG_HOME) {
    return path.join(process.env.XDG_CONFIG_HOME, 'snip');
  }
  if (process.platform === 'win32') {
    return path.join(
      process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming'),
      'snip'
    );
  }
  return path.join(os.homedir(), '.config', 'snip');
}

function getUserConfigPath() {
  return path.join(getUserConfigDir(), 'config.json');
}

function getUserConfig() {
  try {
    const raw = fs.readFileSync(getUserConfigPath(), 'utf8');
    return JSON.parse(raw);
  } catch (_) {
    return null;
  }
}

function writeUserConfig(partial) {
  const configPath = getUserConfigPath();
  fs.mkdirSync(path.dirname(configPath), { recursive: true });
  const existing = getUserConfig() || {};
  const merged = Object.assign({}, existing, partial);
  fs.writeFileSync(configPath, JSON.stringify(merged, null, 2), 'utf8');
}

// Walk up from startDir looking for .snip.json, stop at filesystem root.
function findProjectConfig(startDir) {
  let dir = path.resolve(startDir || process.cwd());
  const root = path.parse(dir).root;

  while (true) {
    const candidate = path.join(dir, '.snip.json');
    try {
      const raw = fs.readFileSync(candidate, 'utf8');
      return JSON.parse(raw);
    } catch (_) {}

    if (dir === root) break;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

// Merged config: project config fields fill gaps that env/user don't cover.
function getConfig(startDir) {
  const envMode = process.env.SNIP_DEFAULT_MODE;
  const projectCfg = findProjectConfig(startDir);
  const userCfg = getUserConfig();

  // Mode: env > project > user > default
  let mode = DEFAULT_MODE;
  if (envMode && VALID_MODES.includes(envMode.toLowerCase())) {
    mode = envMode.toLowerCase();
  } else if (projectCfg && projectCfg.mode && VALID_MODES.includes(projectCfg.mode)) {
    mode = projectCfg.mode;
  } else if (userCfg && userCfg.mode && VALID_MODES.includes(userCfg.mode)) {
    mode = userCfg.mode;
  }

  // Language: project > user > 'auto'
  let language = 'auto';
  if (projectCfg && projectCfg.language !== undefined) {
    language = projectCfg.language;
  } else if (userCfg && userCfg.language !== undefined) {
    language = userCfg.language;
  }

  const overlays = Object.assign(
    { python: true, typescript: true, go: true },
    (userCfg && userCfg.overlays) || {},
    (projectCfg && projectCfg.overlays) || {}
  );

  const prod = Object.assign(
    { protect: ['auth', 'payments', 'billing', 'security', 'crypto'] },
    (userCfg && userCfg.prod) || {},
    (projectCfg && projectCfg.prod) || {}
  );

  const ceiling = Object.assign(
    { warnAtLoc: null },
    (userCfg && userCfg.ceiling) || {},
    (projectCfg && projectCfg.ceiling) || {}
  );

  const score = Object.assign(
    { minScore: null, failBelow: false },
    (userCfg && userCfg.score) || {},
    (projectCfg && projectCfg.score) || {}
  );

  return { mode, language, overlays, prod, ceiling, score };
}

function getDefaultMode(startDir) {
  return getConfig(startDir).mode;
}

function getLanguage(startDir) {
  const { language } = getConfig(startDir);
  if (!language || language === 'none' || language === null) return null;
  if (language === 'auto') return null; // caller handles auto-detection
  if (VALID_LANGS.includes(language.toLowerCase())) return language.toLowerCase();
  return null;
}

module.exports = {
  DEFAULT_MODE,
  VALID_MODES,
  RUNTIME_MODES,
  VALID_LANGS,
  findProjectConfig,
  getConfig,
  getDefaultMode,
  getLanguage,
  getUserConfig,
  getUserConfigDir,
  getUserConfigPath,
  normalizeConfigMode,
  normalizeMode,
  writeUserConfig,
};
