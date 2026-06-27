#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));

function loadConfig() {
  const mod = require(path.join(ROOT, 'hooks', 'snip-config'));
  return mod;
}

function readStateFile() {
  const statePath = path.join(os.homedir(), '.claude', '.snip-active');
  try {
    const lines = fs.readFileSync(statePath, 'utf8').split('\n');
    return { mode: lines[0] || 'unknown', lang: lines[1] || null };
  } catch (_) {
    return { mode: 'unknown (not active)', lang: null };
  }
}

function writeProjectConfig(partial) {
  const configPath = path.join(process.cwd(), '.snip.json');
  let existing = {};
  try { existing = JSON.parse(fs.readFileSync(configPath, 'utf8')); } catch (_) {}
  const merged = Object.assign({}, existing, partial);
  fs.writeFileSync(configPath, JSON.stringify(merged, null, 2) + '\n', 'utf8');
  return configPath;
}

// ── commands ──────────────────────────────────────────────────────────────────

function cmdStatus() {
  const { mode, lang } = readStateFile();
  const langNote = lang ? ` [${lang}]` : '';
  console.log(`snip: ${mode}${langNote}`);
}

function cmdVersion() {
  console.log(pkg.version);
}

function cmdMode(args) {
  const { VALID_MODES, writeUserConfig } = loadConfig();
  const isProject = args[0] === 'project';
  const level = isProject ? args[1] : args[0];

  if (!level || !VALID_MODES.includes(level)) {
    console.error(`Unknown mode: ${level || '(none)'}. Valid: ${VALID_MODES.join(', ')}`);
    process.exit(1);
  }

  if (isProject) {
    const configPath = writeProjectConfig({ mode: level });
    console.log(`Set mode: ${level} (${configPath})`);
  } else {
    writeUserConfig({ mode: level });
    const { getUserConfigPath } = loadConfig();
    console.log(`Set mode: ${level} (${getUserConfigPath()})`);
  }
}

function cmdLang(args) {
  const isProject = args[0] === 'project';
  const lang = isProject ? args[1] : args[0];
  const { VALID_LANGS, writeUserConfig } = loadConfig();
  const validWithNone = [...VALID_LANGS, 'none', 'auto'];

  if (!lang || !validWithNone.includes(lang)) {
    console.error(`Unknown language: ${lang || '(none)'}. Valid: ${validWithNone.join(', ')}`);
    process.exit(1);
  }

  if (isProject) {
    const configPath = writeProjectConfig({ language: lang });
    console.log(`Set language: ${lang} (${configPath})`);
  } else {
    writeUserConfig({ language: lang });
    const { getUserConfigPath } = loadConfig();
    console.log(`Set language: ${lang} (${getUserConfigPath()})`);
  }
}

function cmdInit() {
  const configPath = path.join(process.cwd(), '.snip.json');
  if (fs.existsSync(configPath)) {
    console.log(`.snip.json already exists: ${configPath}`);
    return;
  }
  const defaultConfig = {
    mode: 'full',
    language: 'auto',
    overlays: { python: true, typescript: true, go: true },
    prod: { protect: ['auth', 'payments', 'billing'] },
    ceiling: { warnAtLoc: 50 },
    score: { minScore: 60, failBelow: false },
  };
  fs.writeFileSync(configPath, JSON.stringify(defaultConfig, null, 2) + '\n', 'utf8');
  console.log(`Created: ${configPath}`);
}

function cmdSync() {
  const result = spawnSync(
    process.execPath,
    [path.join(ROOT, 'scripts', 'check-rule-copies.js'), '--fix'],
    { stdio: 'inherit' }
  );
  process.exit(result.status || 0);
}

function cmdScore(args) {
  const target = args[0] ? path.resolve(args[0]) : process.cwd();
  const extraArgs = args.slice(1);
  const result = spawnSync(
    process.execPath,
    [path.join(ROOT, 'score', 'snip-score.js'), target, ...extraArgs],
    { stdio: 'inherit' }
  );
  process.exit(result.status || 0);
}

function cmdDiff(args) {
  const { scorePaths, formatReport } = require(path.join(ROOT, 'score', 'snip-score'));
  const jsonOut = args.includes('--json');
  const failBelow = args.includes('--fail-below');
  const minScore = (() => {
    const idx = args.indexOf('--min-score');
    return idx !== -1 ? parseInt(args[idx + 1], 10) : null;
  })();

  // Collect changed files from git: staged + unstaged modifications and additions.
  const gitResult = spawnSync('git', ['diff', '--name-only', '--diff-filter=ACMR', 'HEAD'], {
    encoding: 'utf8',
    cwd: process.cwd(),
  });

  if (gitResult.status !== 0) {
    console.error('snip diff: git diff failed — are you inside a git repo?');
    process.exit(1);
  }

  const changedFiles = gitResult.stdout
    .trim()
    .split('\n')
    .filter(Boolean)
    .map((f) => path.resolve(process.cwd(), f));

  if (changedFiles.length === 0) {
    console.log('snip diff: no changed files');
    process.exit(0);
  }

  const result = scorePaths(changedFiles);

  if (jsonOut) {
    const out = {
      overall: result.overall,
      prodLines: result.prodLines,
      safeLines: result.safeLines,
      files: result.files
        .filter((f) => f.score !== null)
        .map((f) => ({
          file: path.relative(process.cwd(), f.file),
          score: f.score,
          deletableLoc: f.deletableLoc,
          totalLoc: f.totalLoc,
          prodLines: f.prodLines,
          safeLines: f.safeLines,
          findings: f.findings,
        })),
    };
    console.log(JSON.stringify(out, null, 2));
  } else {
    console.log(formatReport(result, { rootDir: process.cwd() }));
  }

  if (failBelow && minScore !== null && result.overall < minScore) {
    if (!jsonOut) console.error(`\nFAIL: score ${result.overall} is below minimum ${minScore}`);
    process.exit(1);
  }
}

function cmdBench(args) {
  const configPath = path.join(ROOT, 'benchmarks', 'promptfooconfig.yaml');
  const result = spawnSync('npx', ['promptfoo@latest', 'eval', '-c', configPath, ...args], {
    stdio: 'inherit',
    shell: true,
    cwd: ROOT,
  });
  process.exit(result.status || 0);
}

function printHelp() {
  console.log(`
snip v${pkg.version} — ruthless efficiency mode for AI agents

Usage:
  snip                          Show this help
  snip status                   Print active mode and language
  snip version                  Print version
  snip mode <level>             Set default mode globally
  snip mode project <level>     Set mode in .snip.json (current dir)
  snip lang <language>          Set default language globally
  snip lang project <language>  Set language in .snip.json
  snip init                     Scaffold .snip.json in current dir
  snip sync                     Regenerate IDE rule copies from rules/base.md
  snip score [path]             Score a file or directory (0-100)
  snip diff                     Score only git-changed files (vs HEAD)
  snip bench                    Run benchmark suite (needs ANTHROPIC_API_KEY)

Modes: lite | full | ultra | prod | off
Languages: python | typescript | go | auto | none

Examples:
  snip init
  snip mode project prod
  snip lang typescript
  snip score src/
  snip score src/ --min-score 60 --fail-below
  snip diff
  snip diff --min-score 60 --fail-below
  snip diff --json
`);
}

// ── dispatch ──────────────────────────────────────────────────────────────────

function parseCliArgs(argv) {
  const [cmd, ...rest] = argv;
  if (!cmd) return { command: 'help' };
  switch (cmd) {
    case 'status':  return { command: 'status' };
    case 'version': return { command: 'version' };
    case 'init':    return { command: 'init' };
    case 'sync':    return { command: 'sync' };
    case 'mode':    return { command: 'mode', args: rest };
    case 'lang':    return { command: 'lang', args: rest };
    case 'score':   return { command: 'score', args: rest };
    case 'diff':    return { command: 'diff', args: rest };
    case 'bench':   return { command: 'bench', args: rest };
    default:        return { command: 'help' };
  }
}

module.exports = { parseCliArgs }; // exported for testing

if (require.main === module) {
  const parsed = parseCliArgs(process.argv.slice(2));
  switch (parsed.command) {
    case 'status':  cmdStatus(); break;
    case 'version': cmdVersion(); break;
    case 'init':    cmdInit(); break;
    case 'sync':    cmdSync(); break;
    case 'mode':    cmdMode(parsed.args); break;
    case 'lang':    cmdLang(parsed.args); break;
    case 'score':   cmdScore(parsed.args); break;
    case 'diff':    cmdDiff(parsed.args); break;
    case 'bench':   cmdBench(parsed.args); break;
    default:        printHelp(); break;
  }
}
