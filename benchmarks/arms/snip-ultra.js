// Snip ultra arm: injects the snip SKILL.md (ultra intensity) as system prompt.
const fs = require('fs');
const path = require('path');

const skillPath = path.join(__dirname, '..', '..', 'skills', 'snip', 'SKILL.md');
const skillText = fs.readFileSync(skillPath, 'utf8').replace(/^---[\s\S]*?---\s*/, '');

function filterForUltra(text) {
  const modes = new Set(['lite', 'full', 'prod']);
  return text.split('\n').filter((line) => {
    const m = line.match(/^\|\s*\*\*(.+?)\*\*\s*\|/);
    if (m && modes.has(m[1].trim().toLowerCase())) return false;
    const e = line.match(/^-\s*([a-z]+):\s/);
    if (e && modes.has(e[1].trim().toLowerCase())) return false;
    return true;
  }).join('\n');
}

const systemPrompt = 'SNIP MODE ACTIVE — level: ultra\n\n' + filterForUltra(skillText);

module.exports = async (context) => {
  return {
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: context.vars.task },
    ],
  };
};
