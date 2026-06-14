---
name: snip-review
description: >
  Code review focused exclusively on over-engineering. Finds what to delete,
  what to replace with stdlib or a native platform feature, and what the
  upgrade path looks like when the full version is eventually needed. One
  finding per line: location, tag, what to cut, what replaces it, when to
  escalate. Use when the user says "review for over-engineering", "what can
  we delete", "is this over-built", "simplify review", or invokes
  /snip-review. Does not fix — lists only.
license: MIT
---

Review code for unnecessary complexity. One finding per line. The diff's
best outcome is getting shorter.

## Format

`<location>: <tag> <what to cut>. <replacement or nothing>. <upgrade trigger if any>.`

For multi-file diffs: `<file>:<location>: <tag> ...`

### Tags

- `delete:` Dead code, unused flexibility, speculative feature. Replacement: nothing.
- `stdlib:` Hand-rolled thing the standard library already ships. Name the function or module.
- `native:` Dependency or code doing what the platform already does. Name the feature.
- `yagni:` Abstraction with one implementation, config nobody sets, layer with one caller,
  interface implemented exactly once. Inline it until a second case exists.
- `shrink:` Same logic, fewer lines. Show the shorter form inline.
- `prod-ok:` Code marked `snip:prod` or on an auth/money/security path. Do not flag for
  deletion — acknowledge it is correctly complex and move on.

## Examples

Bad finding:
> "This RetryExecutor class might be more complex than necessary, have you considered
> whether a simpler approach would work?"

Good findings:
```
L14-89: yagni: RetryExecutor class with one caller. Inline: async loop + sleep(100*2**i), 8 lines.
L4: native: moment.js for one .format() call. Intl.DateTimeFormat, 0 deps.
repo.py:L44: stdlib: manual Base64 encoding loop. base64.b64encode(data), 1 line.
L72-90: delete: feature-flag wrapper around a flag that has been true for 8 months.
L31-38: shrink: manual dict merge loop. {**defaults, **overrides}, 1 line.
auth/middleware.js:L12: prod-ok: HMAC verification path. Correctly complex, leave it.
```

## Scoring

End with the only metric that matters:
`net: -N lines possible`

If `snip:prod` lines were encountered: also report `prod-ok: N paths confirmed`.

If nothing to cut: `Lean already. Ship.`

## Boundaries

This skill reviews for complexity only. Correctness bugs, security holes,
performance regressions, and accessibility issues belong in a separate review
pass. A single assert-based self-check is the snip minimum — never flag it
for deletion.

Does not apply fixes. Lists only. "stop snip-review" or "normal mode": revert
to standard review style.
