# ✂ snip

**Ruthless efficiency mode for AI coding agents. Delete first. Build last.**

Snip enforces a 7-rung deletion ladder on AI agents — starting with "can this be deleted entirely?" — and protects production paths from over-simplification with `snip:prod` annotations.

---

## The problem snip solves

AI agents have a strong bias toward completeness. Ask for email validation, get a 27-line `EmailValidator` class with a regex that still rejects valid addresses. Ask for a cache, get a 120-line `TTLCache` with a lock, hit counter, and eviction policy — for a function that's called twice.

Snip shifts the default the other way.

---

## snip: vs snip:prod vs snip:safe — why this matters

No other tool in this space makes these distinctions:

```js
// snip: plain object dispatch; upgrade to class registry if handlers exceed 10
const handlers = { 'order.created': handleOrder, 'user.signup': handleSignup };
(handlers[event.type] ?? noop)(event);

// snip:prod — HMAC verification is a timing-attack boundary; do not simplify
const sig = Buffer.from(req.headers['x-signature'], 'hex');
const expected = createHmac('sha256', secret).update(req.rawBody).digest();
if (!timingSafeEqual(sig, expected)) return res.status(401).end();

// snip:safe — shared fixture; deletion would give false confidence in tests
const testDb = createTestDatabase();
```

Both minimal paths are safe to shrink. The `snip:prod` path is not — it is a deliberate trust boundary. The `snip:safe` path is test infrastructure that must exist.

All three annotation types are excluded from the snip score — they are correctly complex by definition.

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
snip init        # create .snip.json in current project
snip score src/  # score your codebase (0–100)
snip diff        # score only changed + untracked files
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
/snip             activate at default (full)
/snip ultra       switch to ultra
/snip prod        switch to prod (recommended for financial/auth codebases)
/snip lang go     switch language overlay
/snip-review      review current code for over-engineering only
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

Snip auto-detects your project's dominant language (scanning up to 3 directory levels) and adds idiomatic shortcuts. Supported languages:

**Python** — list comprehensions over loops, `@dataclass`, `functools.lru_cache`, `pathlib.Path`, `contextlib.suppress`

**TypeScript** — discriminated unions over class hierarchies, `as const` over enums, `crypto.randomUUID()` (Node 19+), `fetch` (Node 18+)

**Go** — `errors.New` + `fmt.Errorf("%w")` over custom error types, table-driven tests, `sync.Once`, `io.Reader`/`io.Writer`

**Rust** — `?` operator over match chains, `impl Trait` over generics, `From`/`Into` over explicit conversions, `thiserror` over manual `Display`

**Java** — records over POJOs, `Optional` over null checks, streams over loops, `var` for local inference

**C#** — pattern matching over type checks, `record` over classes for value types, `LINQ` over loops, `using` declarations

Disable per-language in `.snip.json`:
```json
{ "overlays": { "python": false } }
```

Set explicitly instead of auto-detecting:
```bash
snip lang typescript
snip lang project rust   # set in .snip.json for the whole team
```

---

## Scoring

`snip score` measures how much of your code could be deleted or replaced with stdlib, on a 0–100 scale. `snip:prod` and `snip:safe` lines are excluded.

```bash
snip score src/                        # score a directory
snip score src/ --min-score 60 --fail-below   # exit 1 if below threshold
snip score src/ --json                 # machine-readable output
snip diff                              # score only changed + untracked files
snip diff --min-score 60 --fail-below --json  # CI-friendly
```

The scorer detects ~25 over-engineering patterns including:

- Class-shaped ceremony: validators, repositories, builders, mappers, DTOs, singletons, abstract factories
- Function-level bloat: 5+ positional params, `.bind(this)`, hand-rolled memoize, unnecessary `new Promise()` constructors
- Hand-rolled stdlib: sort, base64, UUID, debounce, deep clone
- Structural smells: single-implementation interfaces, event buses with one event type, logger wrappers

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
- name: Snip score gate
  run: npx @amulyavarshney/snip score src/ --min-score 60 --fail-below

- name: Snip diff gate (PR-only)
  run: npx @amulyavarshney/snip diff --min-score 60 --fail-below
```

`snip diff` scores only the files changed in the current branch (tracked modifications + untracked new files), making it fast enough to run on every PR without scanning the whole tree.

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
