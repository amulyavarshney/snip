## Language idioms: TypeScript

Apply these when working in TypeScript or JavaScript. They are rungs within
the base ladder — not exceptions to it.

### Prefer over verbose equivalents

- Discriminated unions over class hierarchies for variant types:
  `type Result<T> = { ok: true; value: T } | { ok: false; error: string }`
  over `class Ok<T> extends Result<T>` / `class Err extends Result<never>`.
  Add methods only when a third caller appears that needs them on the type.
- `satisfies` operator to narrow types without widening the inferred type.
  Prefer over explicit type assertions (`as`) on object literals.
- `as const` object maps over `enum` declarations: tree-shakeable, portable
  across module boundaries, no runtime overhead.
- Template literal types over string enums when the set is statically known
  and small.
- Optional chaining (`?.`) and nullish coalescing (`??`) over explicit null
  guard chains.
- `Array.from` + arrow, or spread (`[...iter]`), over manual push loops for
  transforms and collections.
- `Promise.allSettled` over `try/catch` inside `Promise.all` when partial
  failure is acceptable.
- `Object.fromEntries(entries.map(...))` over manual object accumulation in
  a `reduce`.

### stdlib / platform covers this — no package needed

- UUID generation (Node 19+): `crypto.randomUUID()`.
- HTTP in Node 18+: global `fetch` — no `axios` for straightforward calls
  without interceptors or streaming.
- HMAC (Node.js): `crypto.createHmac('sha256', secret)` — no library.
  Use `crypto.timingSafeEqual` for comparison. (`// snip:prod` these lines.)
- Env config: `process.env` with a single validation pass at startup.
  Reach for `zod` only when the schema has more than ~5 fields or nested
  types.
- Base64: `Buffer.from(str).toString('base64')` /
  `Buffer.from(b64, 'base64').toString()`.

### Ceiling comments (TypeScript style)

```ts
// snip: discriminated union; upgrade to class hierarchy if shared methods exceed 3
// snip: fetch covers this; upgrade to axios if interceptors or retry hooks needed
// snip: as const map; upgrade to enum if the values need declaration merging
```
