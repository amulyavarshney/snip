// PromptFoo LOC metric: counts non-blank, non-comment lines in fenced code blocks.
// Also reports the count of snip:prod protected lines as a separate stat.

module.exports = (output) => {
  const blocks = [];
  let inBlock = false;
  let current = [];

  for (const line of output.split('\n')) {
    if (/^```/.test(line.trim())) {
      if (inBlock) {
        blocks.push(current);
        current = [];
        inBlock = false;
      } else {
        inBlock = true;
      }
    } else if (inBlock) {
      current.push(line);
    }
  }

  let loc = 0;
  let prodLines = 0;

  for (const block of blocks) {
    for (const line of block) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      if (/snip:prod/i.test(line)) { prodLines++; continue; }
      if (
        trimmed.startsWith('//') ||
        trimmed.startsWith('#') ||
        trimmed.startsWith('*') ||
        trimmed.startsWith('/*')
      ) continue;
      loc++;
    }
  }

  // Return score: lower LOC = better for baseline comparison.
  // PromptFoo treats lower score as better by default for this metric.
  return loc;
};
