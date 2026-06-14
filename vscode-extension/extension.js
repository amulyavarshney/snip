'use strict';

const vscode = require('vscode');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const MODES = ['lite', 'full', 'ultra', 'prod', 'off'];
const SNIP_JSON = '.snip.json';

let statusBarItem;

function getWorkspaceRoot() {
  return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? null;
}

function readProjectConfig(root) {
  if (!root) return null;
  try {
    return JSON.parse(fs.readFileSync(path.join(root, SNIP_JSON), 'utf8'));
  } catch (_) {
    return null;
  }
}

function writeProjectConfig(root, partial) {
  const configPath = path.join(root, SNIP_JSON);
  let existing = {};
  try { existing = JSON.parse(fs.readFileSync(configPath, 'utf8')); } catch (_) {}
  const merged = Object.assign({}, existing, partial);
  fs.writeFileSync(configPath, JSON.stringify(merged, null, 2) + '\n', 'utf8');
}

function updateStatusBar(config) {
  if (!statusBarItem) return;
  const mode = config?.mode ?? 'off';
  if (mode === 'off') {
    statusBarItem.hide();
    return;
  }
  statusBarItem.text = `✂ SNIP:${mode.toUpperCase()}`;
  statusBarItem.tooltip = `Snip mode: ${mode}. Click to change.`;
  statusBarItem.command = 'snip.setMode';
  statusBarItem.show();
}

async function cmdSetMode() {
  const root = getWorkspaceRoot();
  const picked = await vscode.window.showQuickPick(
    MODES.map((m) => ({ label: m, description: m === 'full' ? '(default)' : m === 'prod' ? 'protects auth/money paths' : '' })),
    { title: 'Snip: Set Mode', placeHolder: 'Select intensity level' }
  );
  if (!picked) return;
  if (root) {
    writeProjectConfig(root, { mode: picked.label });
    updateStatusBar({ mode: picked.label });
    vscode.window.showInformationMessage(`Snip mode set to: ${picked.label}`);
  } else {
    vscode.window.showWarningMessage('Snip: No workspace folder open — cannot write .snip.json');
  }
}

async function cmdShowScore() {
  const root = getWorkspaceRoot();
  const activeFile = vscode.window.activeTextEditor?.document.uri.fsPath;
  if (!activeFile) {
    vscode.window.showWarningMessage('Snip: No active file to score.');
    return;
  }

  const scoreScript = path.join(__dirname, '..', 'score', 'snip-score.js');
  if (!fs.existsSync(scoreScript)) {
    vscode.window.showErrorMessage('Snip: score/snip-score.js not found.');
    return;
  }

  const result = spawnSync(process.execPath, [scoreScript, activeFile], { encoding: 'utf8' });
  const output = result.stdout || result.stderr || 'No output.';

  const channel = vscode.window.createOutputChannel('Snip Score');
  channel.clear();
  channel.appendLine(output);
  channel.show(true);
}

async function cmdInit() {
  const root = getWorkspaceRoot();
  if (!root) {
    vscode.window.showWarningMessage('Snip: No workspace folder open.');
    return;
  }
  const configPath = path.join(root, SNIP_JSON);
  if (fs.existsSync(configPath)) {
    vscode.window.showInformationMessage('Snip: .snip.json already exists.');
    return;
  }
  writeProjectConfig(root, {
    mode: 'full',
    language: 'auto',
    overlays: { python: true, typescript: true, go: true },
    prod: { protect: ['auth', 'payments', 'billing'] },
    ceiling: { warnAtLoc: 50 },
    score: { minScore: 60, failBelow: false },
  });
  vscode.window.showInformationMessage(`Snip: Created ${SNIP_JSON}`);
  updateStatusBar({ mode: 'full' });
}

async function cmdStatus() {
  const root = getWorkspaceRoot();
  const config = readProjectConfig(root);
  const mode = config?.mode ?? 'full (default)';
  const lang = config?.language ?? 'auto';
  vscode.window.showInformationMessage(`Snip: mode=${mode}, language=${lang}`);
}

function activate(context) {
  statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  context.subscriptions.push(statusBarItem);

  context.subscriptions.push(vscode.commands.registerCommand('snip.setMode', cmdSetMode));
  context.subscriptions.push(vscode.commands.registerCommand('snip.showScore', cmdShowScore));
  context.subscriptions.push(vscode.commands.registerCommand('snip.init', cmdInit));
  context.subscriptions.push(vscode.commands.registerCommand('snip.status', cmdStatus));

  const root = getWorkspaceRoot();
  const config = readProjectConfig(root);
  updateStatusBar(config);

  // Nudge on first activation if no .snip.json
  if (root && !config) {
    vscode.window.showInformationMessage(
      'Snip is not configured for this project.',
      'Initialize .snip.json'
    ).then((choice) => {
      if (choice === 'Initialize .snip.json') cmdInit();
    });
  }

  // Watch .snip.json for changes and update status bar
  if (root) {
    const watcher = vscode.workspace.createFileSystemWatcher(
      new vscode.RelativePattern(root, SNIP_JSON)
    );
    watcher.onDidChange(() => updateStatusBar(readProjectConfig(root)));
    watcher.onDidCreate(() => updateStatusBar(readProjectConfig(root)));
    watcher.onDidDelete(() => updateStatusBar(null));
    context.subscriptions.push(watcher);
  }
}

function deactivate() {}

module.exports = { activate, deactivate };
