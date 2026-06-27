#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

// Heuristic patterns: each entry has a test(line) → bool.
// A line matching any pattern counts as "deletable" unless it's a snip:prod/snip:safe line.
const PATTERNS = [
  // Hand-rolled sort implementations
  { name: 'hand-rolled-sort', test: (l) => /function\s+\w*[Ss]ort\w*\s*\(/.test(l) && !/\.sort\(/.test(l) },
  // Class with "Validator" in the name (email validator shape)
  { name: 'validator-class', test: (l) => /class\s+\w+Validator\b/.test(l) },
  // Abstract/base class with one obvious subclass name pattern
  { name: 'abstract-base-class', test: (l) => /\b(abstract\s+class|class\s+Abstract\w+|class\s+Base\w+)\b/.test(l) },
  // Interface with one implementation (TypeScript)
  { name: 'single-impl-interface', test: (l) => /^(export\s+)?interface\s+I[A-Z]\w+\s*\{/.test(l.trim()) },
  // Repository/Service/Controller class layer pattern
  { name: 'layer-class', test: (l) => /class\s+\w+(Repository|Service|Controller|Manager|Handler|Executor|Factory)\b/.test(l) },
  // Hand-rolled base64 (not using stdlib)
  { name: 'hand-rolled-base64', test: (l) => /btoa|atob/.test(l) && /loop|for\s*\(|while\s*\(/.test(l) },
  // Unused @dataclass wrapper / NamedTuple with single field
  { name: 'verbose-namedtuple', test: (l) => /\bTypedDict\b|\bNamedTuple\b/.test(l) },
  // Hand-rolled retry logic classes (not a plain loop)
  { name: 'retry-class', test: (l) => /class\s+\w+(Retry|Backoff|Policy)\b/.test(l) },
  // Config manager classes
  { name: 'config-class', test: (l) => /class\s+\w+(Config|Configuration|Settings)(Manager|Loader|Reader|Builder)?\b/.test(l) },
  // Convenience wrapper functions (wrapper around stdlib)
  { name: 'convenience-wrapper', test: (l) => /function\s+\w*(Wrapper|Util|Helper)\w*\s*\(/.test(l) },

  // ── New patterns ──────────────────────────────────────────────────────────

  // Builder pattern with single build() target (GoF Builder for one output type)
  { name: 'builder-class', test: (l) => /class\s+\w+Builder\b/.test(l) },
  // DTO/VO suffix classes — often ceremony around plain objects
  { name: 'dto-class', test: (l) => /class\s+\w+(Dto|VO|ValueObject|DataTransferObject)\b/i.test(l) },
  // Mapper classes — usually a function would do
  { name: 'mapper-class', test: (l) => /class\s+\w+Mapper\b/.test(l) },
  // Decorator/Wrapper class patterns (not the language decorator syntax)
  { name: 'wrapper-class', test: (l) => /class\s+\w+(Wrapper|Decorator|Adapter|Proxy)\b/.test(l) },
  // Hand-rolled UUID / random ID generation without stdlib
  { name: 'hand-rolled-uuid', test: (l) => /Math\.random\(\)\.toString\(36\)|new\s+Date\(\)\.getTime\(\)\s*\+\s*Math/.test(l) },
  // Logging wrapper classes (log4j-style wrapper over the platform logger)
  { name: 'logger-wrapper', test: (l) => /class\s+\w*(Logger|Log|Logging)(Wrapper|Adapter|Factory|Manager)?\b/.test(l) },
  // Hand-rolled debounce/throttle function declarations
  { name: 'hand-rolled-debounce', test: (l) => /function\s+\w*(debounce|throttle)\w*\s*\(/i.test(l) },
  // EventEmitter/EventBus classes with one listener type (pub/sub over a plain callback)
  { name: 'single-event-bus', test: (l) => /class\s+\w*(EventBus|EventEmitter|EventDispatcher|PubSub)\b/.test(l) },
  // Hand-rolled deep clone / deep copy function
  { name: 'hand-rolled-deep-clone', test: (l) => /function\s+\w*(deepClone|deepCopy|cloneDeep)\w*\s*\(/i.test(l) },
  // Singleton pattern boilerplate (getInstance static method)
  { name: 'singleton-pattern', test: (l) => /static\s+\w*getInstance\w*\s*\(/.test(l) },
  // Abstract factory with one concrete factory
  { name: 'abstract-factory', test: (l) => /class\s+\w+(AbstractFactory|FactoryBase|BaseFactory)\b/.test(l) },
];

// Count non-blank, non-comment lines in a text block.
function countLoc(text) {
  return text.split('\n').filter((l) => {
    const trimmed = l.trim();
    return trimmed.length > 0 &&
      !trimmed.startsWith('//') &&
      !trimmed.startsWith('#') &&
      !trimmed.startsWith('*') &&
      !trimmed.startsWith('/*') &&
      !trimmed.startsWith('--');
  }).length;
}

function scoreFile(filePath) {
  let text;
  try {
    text = fs.readFileSync(filePath, 'utf8');
  } catch (err) {
    return { score: null, deletableLoc: 0, totalLoc: 0, prodLines: 0, findings: [], error: err.message };
  }

  const lines = text.split('\n');
  const findings = [];
  let deletableLoc = 0;
  let prodLines = 0;
  let safeLines = 0;
  let totalLoc = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    if (!trimmed) continue;

    // snip:prod — correctly complex trust boundary; exclude from score entirely
    if (/snip:prod/i.test(line)) {
      prodLines++;
      continue;
    }

    // snip:safe — necessary test infrastructure; exclude from score entirely
    if (/snip:safe/i.test(line)) {
      safeLines++;
      continue;
    }

    // Count as LOC
    if (
      trimmed.length > 0 &&
      !trimmed.startsWith('//') &&
      !trimmed.startsWith('#') &&
      !trimmed.startsWith('*') &&
      !trimmed.startsWith('/*')
    ) {
      totalLoc++;
    } else {
      continue; // comment or blank, skip pattern check
    }

    for (const pattern of PATTERNS) {
      if (pattern.test(line)) {
        deletableLoc++;
        findings.push({ line: i + 1, pattern: pattern.name, text: trimmed.slice(0, 80) });
        break; // one pattern hit per line
      }
    }
  }

  const score = totalLoc === 0 ? 100 : Math.round(100 - (100 * deletableLoc / totalLoc));

  return { score, deletableLoc, totalLoc, prodLines, safeLines, findings };
}

function scoreDir(dirPath, opts = {}) {
  const { recursive = true, extensions = ['.js', '.ts', '.tsx', '.py', '.go', '.rs', '.java', '.cs'] } = opts;

  function collectFiles(dir) {
    let results = [];
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch (_) { return results; }

    for (const entry of entries) {
      if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory() && recursive) {
        results = results.concat(collectFiles(fullPath));
      } else if (entry.isFile() && extensions.includes(path.extname(entry.name))) {
        results.push(fullPath);
      }
    }
    return results;
  }

  const files = collectFiles(dirPath);
  const results = files.map((f) => ({ file: f, ...scoreFile(f) }));

  const validResults = results.filter((r) => r.score !== null);
  const totalDeletable = validResults.reduce((s, r) => s + r.deletableLoc, 0);
  const totalLoc = validResults.reduce((s, r) => s + r.totalLoc, 0);
  const totalProd = validResults.reduce((s, r) => s + r.prodLines, 0);
  const totalSafe = validResults.reduce((s, r) => s + r.safeLines, 0);
  const overall = totalLoc === 0 ? 100 : Math.round(100 - (100 * totalDeletable / totalLoc));

  return { files: results, overall, prodLines: totalProd, safeLines: totalSafe };
}

function formatReport(result, { rootDir = process.cwd() } = {}) {
  const lines = [];

  if (result.files) {
    // Directory report
    lines.push('snip score:');
    for (const f of result.files) {
      if (f.score === null) continue;
      const rel = path.relative(rootDir, f.file);
      const notes = [];
      if (f.prodLines > 0) notes.push(`${f.prodLines} snip:prod`);
      if (f.safeLines > 0) notes.push(`${f.safeLines} snip:safe`);
      const noteStr = notes.length > 0 ? `  (${notes.join(', ')})` : '';
      lines.push(`  ${rel.padEnd(40)} score: ${String(f.score).padStart(3)}${noteStr}`);
    }
    lines.push('');
    lines.push(`  overall: ${result.overall}/100`);
    if (result.prodLines > 0) lines.push(`  snip:prod protected: ${result.prodLines} paths`);
    if (result.safeLines > 0) lines.push(`  snip:safe protected: ${result.safeLines} paths`);
  } else {
    // Single file report
    const notes = [];
    if (result.prodLines > 0) notes.push(`snip:prod protected: ${result.prodLines} lines`);
    if (result.safeLines > 0) notes.push(`snip:safe protected: ${result.safeLines} lines`);
    const noteStr = notes.length > 0 ? '\n' + notes.join('\n') : '';
    lines.push(`score: ${result.score}/100`);
    lines.push(`deletable: ${result.deletableLoc} / ${result.totalLoc} LOC${noteStr}`);
    if (result.findings.length > 0) {
      lines.push('\nfindings:');
      for (const f of result.findings) {
        lines.push(`  L${f.line}: ${f.pattern} — ${f.text}`);
      }
    }
  }

  return lines.join('\n');
}

// Score an explicit list of file paths (used by snip diff).
function scorePaths(filePaths, opts = {}) {
  const { extensions = ['.js', '.ts', '.tsx', '.py', '.go', '.rs', '.java', '.cs'] } = opts;
  const filtered = filePaths.filter((f) => extensions.includes(path.extname(f)));
  const results = filtered.map((f) => ({ file: f, ...scoreFile(f) }));

  const validResults = results.filter((r) => r.score !== null);
  const totalDeletable = validResults.reduce((s, r) => s + r.deletableLoc, 0);
  const totalLoc = validResults.reduce((s, r) => s + r.totalLoc, 0);
  const totalProd = validResults.reduce((s, r) => s + r.prodLines, 0);
  const totalSafe = validResults.reduce((s, r) => s + r.safeLines, 0);
  const overall = totalLoc === 0 ? 100 : Math.round(100 - (100 * totalDeletable / totalLoc));

  return { files: results, overall, prodLines: totalProd, safeLines: totalSafe };
}

module.exports = { PATTERNS, scoreFile, scoreDir, scorePaths, formatReport };

// CLI entry when run directly
if (require.main === module) {
  const args = process.argv.slice(2).filter((a) => !a.startsWith('--'));
  const minScore = (() => {
    const idx = process.argv.indexOf('--min-score');
    return idx !== -1 ? parseInt(process.argv[idx + 1], 10) : null;
  })();
  const failBelow = process.argv.includes('--fail-below');
  const jsonOut = process.argv.includes('--json');

  if (args.length === 0) {
    console.log('Usage: snip-score.js <file|dir> [--min-score N] [--fail-below] [--json]');
    process.exit(0);
  }

  const target = path.resolve(args[0]);
  const stat = fs.statSync(target);

  if (stat.isDirectory()) {
    const result = scoreDir(target);
    if (jsonOut) {
      const out = {
        overall: result.overall,
        prodLines: result.prodLines,
        safeLines: result.safeLines,
        files: result.files
          .filter((f) => f.score !== null)
          .map((f) => ({
            file: path.relative(target, f.file),
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
      console.log(formatReport(result, { rootDir: target }));
    }
    if (failBelow && minScore !== null && result.overall < minScore) {
      if (!jsonOut) console.error(`\nFAIL: score ${result.overall} is below minimum ${minScore}`);
      process.exit(1);
    }
  } else {
    const result = scoreFile(target);
    if (jsonOut) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log(formatReport(result));
    }
    if (failBelow && minScore !== null && result.score < minScore) {
      if (!jsonOut) console.error(`\nFAIL: score ${result.score} is below minimum ${minScore}`);
      process.exit(1);
    }
  }
}
