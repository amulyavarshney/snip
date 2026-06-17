# ✂ snip

**Ruthless efficiency mode for AI coding agents. Delete first. Build last.**

Snip enforces a 7-rung deletion ladder on AI agents — starting with "can this be deleted entirely?" — and protects production paths from over-simplification with `snip:prod` annotations.

---

## The problem snip solves

AI agents have a strong bias toward completeness. Ask for email validation, get a 27-line `EmailValidator` class with a regex that still rejects valid addresses. Ask for a cache, get a 120-line `TTLCache` with a lock, hit counter, and eviction policy — for a function that's called twice.

Snip shifts the default the other way.

---

## snip: vs snip:prod — why this matters

No other tool in this space makes this distinction:

```js
// snip: plain object dispatch; upgrade to class registry if handlers exceed 10
const handlers = { 'order.created': handleOrder, 'user.signup': handleSignup };
(handlers[event.type] ?? noop)(event);

// snip:prod — HMAC verification is a timing-attack boundary; do not simplify
const sig = Buffer.from(req.headers['x-signature'], 'hex');
const expected = createHmac('sha256', secret).update(req.rawBody).digest();
if (!timingSafeEqual(sig, expected)) return res.status(401).end();
```

Both are minimal. One is safe to shrink further. One is not. `snip` tells you which is which.

`// snip:prod` lines are excluded from the snip score — they are correctly complex by definition.

---

## Install

### Claude Code
```
/plugin install snip
```

### Cursor
```bash
curl -o .cursor/rules/snip.mdc \
  https://raw.githubusercontent.com/amulyavarshney/snip/main/.cursor/rules/snip.mdc
```

### Windsurf
```bash
curl -o .windsurf/rules/snip.md \
  https://raw.githubusercontent.com/amulyavarshney/snip/main/.windsurf/rules/snip.md
```

### GitHub Copilot
```bash
curl -o .github/copilot-instructions.md \
  https://raw.githubusercontent.com/amulyavarshney/snip/main/.github/copilot-instructions.md
```

### npm CLI
```bash
npm install -g @amulyavarshney/snip
snip init       # create .snip.json in current project
snip score src/ # score your codebase
```

---

## Benchmark results

Measured across 6 production-realistic tasks (JWT auth middleware, Go rate limiter, webhook HMAC validation, config loader, retry logic, query builder). Median of 10 runs per cell.

| | baseline | snip full | snip ultra |
|--|--|--|--|
| LOC (median) | 68 | 14 | 8 |
| Reduction | — | **~80%** | **~88%** |

Run yourself: `npm run bench` (requires `ANTHROPIC_API_KEY`)

---

## Modes

| Mode | Behavior |
|------|----------|
| `lite` | Builds what's asked; names the leaner option in one line |
| `full` | Full 7-rung ladder + language overlays (default) |
| `ultra` | Deletion-first; challenges requirements before writing |
| `prod` | Full ladder + `// snip:prod` protection for trust boundaries |
| `off` | Deactivated |

```
/snip             activate at default
/snip ultra       switch to ultra
/snip prod        switch to prod (recommended for financial/auth codebases)
/snip lang go     switch language overlay
/snip-review      review current code for over-engineering
```

---

## The 7-rung ladder

Before any code is written, snip stops at the first rung that holds:

```
0. Can this be deleted entirely?
1. Does this need to exist at all? (YAGNI)
2. Does the standard library do this? Use it.
3. Does a native platform feature cover it? Use it.
4. Does an already-installed dependency solve it? Use it.
5. Can it be one line? Make it one line.
6. Only then: write the minimum code that works.
```

Rung 0 is what makes snip different from other minimal-code tools — it fires on existing code, not just code being written.

---

## Language overlays

Snip auto-detects your project's dominant language and adds idiomatic shortcuts.

**Python** — list comprehensions over loops, `@dataclass`, `functools.lru_cache`, `pathlib.Path`, `contextlib.suppress`

**TypeScript** — discriminated unions over class hierarchies, `as const` over enums, `crypto.randomUUID()` (Node 19+), `fetch` (Node 18+)

**Go** — `errors.New` + `fmt.Errorf("%w")` over custom error structs, table-driven tests, `sync.Once`, `io.Reader`/`io.Writer`

Disable per-language in `.snip.json`:
```json
{ "overlays": { "python": false } }
```

---

## Team config

Commit `.snip.json` to your repo. Every developer and CI run picks it up automatically.

```json
{
  "mode": "full",
  "language": "auto",
  "prod": { "protect": ["auth", "payments", "billing"] },
  "score": { "minScore": 60, "failBelow": true }
}
```

### CI gate

```yaml
# .github/workflows/snip.yml
- name: Check snip score
  run: npx @amulyavarshney/snip score src/ --min-score 60 --fail-below
```

The snip score (0–100) measures how much of your codebase could be deleted or replaced with stdlib. `snip:prod` lines are excluded — they're correctly complex.

---

## Before/after examples

| Example | Without | With |
|---------|---------|------|
| [JWT auth middleware](examples/auth-middleware.md) | 5 files, ~60 lines | 10 lines + `snip:prod` tag |
| [Retry with backoff](examples/retry-logic.md) | 3-class hierarchy, 120 lines | 12-line async loop |
| [Config loading](examples/config-merging.md) | ConfigManager + 4 sources, 70 lines | 10 lines |
| [Webhook HMAC](examples/webhook-validation.md) | 5 classes, 80 lines | 8 lines + `snip:prod` tag |
| [Go error types](examples/go-error-handling.md) | 7 types, 50 lines | 4 sentinel vars |

---

## Development

```bash
# Run all tests
npm test

# Sync IDE rule copies from rules/base.md
npm run sync

# Run benchmarks
npm run bench
```

Tests use Node.js built-in `node:test`. Zero test dependencies.

---

## License

MIT
