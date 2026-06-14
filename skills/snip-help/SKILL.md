---
name: snip-help
description: >
  Quick-reference card for snip. Lists all modes, commands, configuration
  options, language overlays, and the snip:prod annotation system. Use when
  the user says "snip help", "how does snip work", "what modes does snip have",
  or invokes /snip-help.
license: MIT
---

## Snip quick reference

**What it does:** Enforces a 7-rung deletion ladder on AI agents.
Before any code is written, it asks whether the code should exist at all.

---

### Modes

| Mode | Behavior |
|------|----------|
| `lite` | Builds what's asked; names the leaner option in one line |
| `full` | Full 7-rung ladder + language overlays (default) |
| `ultra` | Deletion-first; challenges requirements before writing |
| `prod` | Full ladder + `// snip:prod` protection for trust boundaries |
| `off` | Deactivated for this session |

---

### Commands

```
/snip               activate at configured default
/snip lite          switch to lite mode
/snip full          switch to full mode
/snip ultra         switch to ultra mode
/snip prod          switch to prod mode
/snip off           deactivate for this session
/snip lang python   switch language overlay
/snip lang typescript
/snip lang go
/snip lang none     disable language overlay
/snip status        show current mode and language
/snip-review        enter over-engineering review sub-skill
/snip-help          show this card
```

Deactivation phrases: "stop snip", "no snip", "normal mode", "disable snip"

---

### snip: comments

```
// snip: <what exists and why it's sufficient>
// snip: <shortcut>; upgrade to <next step> when <trigger>
// snip:prod — <why this path must not be simplified>
```

`snip:prod` marks trust boundaries: auth, payments, HMAC, SQL injection gates.
The agent never simplifies a `snip:prod` block.

---

### Configuration (.snip.json)

```json
{
  "mode": "full",
  "language": "auto",
  "overlays": { "python": true, "typescript": true, "go": true },
  "prod": { "protect": ["auth", "payments", "billing"] },
  "ceiling": { "warnAtLoc": 50 },
  "score": { "minScore": 60, "failBelow": true }
}
```

Resolution order: `SNIP_DEFAULT_MODE` env > `.snip.json` (walks up from cwd) >
`~/.config/snip/config.json` > default `"full"`

---

### Language overlays

Automatically applied when snip detects the project language. Adds
language-specific idiom shortcuts on top of the base ladder.

- **Python**: dataclass, list comps, lru_cache, pathlib, contextlib.suppress
- **TypeScript**: discriminated unions, as const, satisfies, crypto.randomUUID
- **Go**: errors.New, fmt.Errorf %w, table tests, sync.Once, io.Reader

Disable per-language: `"overlays": { "python": false }`

---

### snip score

```bash
snip score src/          # score a directory
snip score file.py       # score a file
```

Reports a 0–100 score per file: `100 - (deletable_loc / total_loc * 100)`.
`snip:prod` lines are excluded — they are correctly complex by definition.
Set `"score": { "minScore": 60, "failBelow": true }` in `.snip.json` for CI.

---

### Install

**Claude Code:** `/plugin install snip`
**Cursor / Windsurf:** copy `.cursor/rules/snip.mdc` to your project rules
**GitHub Copilot:** copy `.github/copilot-instructions.md`
**VS Code extension:** install "Snip" from the marketplace
**npm:** `npm install -g snip` for the CLI

GitHub: https://github.com/[author]/snip
