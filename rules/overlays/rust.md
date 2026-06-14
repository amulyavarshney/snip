## Language idioms: Rust

Apply these when working in Rust. They are rungs within the base ladder —
not exceptions to it. Rust's ownership model already eliminates many classes
of over-engineering; the idioms below finish the job.

### Prefer over verbose equivalents

- `?` operator over explicit `match err { Ok(v) => v, Err(e) => return Err(e) }`.
- `impl Into<T>` / `impl AsRef<T>` at function boundaries over concrete types
  when the caller's type doesn't matter — maximises flexibility without a trait object.
- `derive` macros (`Debug`, `Clone`, `PartialEq`, `serde::Serialize`) over
  manual trait implementations when the derived version is correct.
- `Vec::with_capacity(n)` when the size is known upfront — avoids reallocations
  without requiring a wrapper type.
- Iterator adapters (`map`, `filter`, `flat_map`, `chain`, `take`, `skip`)
  over explicit `for` loops when the transformation is a single expression.
- `unwrap_or_else(|| default)` / `unwrap_or_default()` over `match option { Some(v) => v, None => ... }`.
- `if let Some(v) = opt` / `while let` over full `match` when only one arm has a body.
- `Entry` API (`entry(k).or_insert(v)`) over `.contains_key` + `.insert` pairs.
- `std::mem::take` / `std::mem::replace` over clone-then-assign when ownership
  can be moved out of a mutable reference.
- Newtype pattern (`struct UserId(u64)`) over bare primitive aliases for domain
  identifiers that must not be mixed up.

### stdlib / platform covers this — no crate needed

- Sorting: `slice::sort` / `sort_by` / `sort_by_key` — no crate for in-memory sorts.
- Hashing: `std::collections::HashMap` / `HashSet` — no crate for simple key-value
  lookup (use `ahash` only when profiler shows HashMap as a bottleneck).
- UUID-like tokens: `SystemTime` + `thread_rng` or `std::time::UNIX_EPOCH` — no
  crate unless RFC 4122 UUID format is required by an API contract.
- Base64: use the `base64` crate (it is the de-facto stdlib-level standard for Rust).
- Simple config (5 keys or fewer): `std::env::var` + a validation block — no
  `config` or `envy` crate unless layered file config is genuinely needed.
- Logging: `eprintln!` for CLI tools; `log` facade for libraries. Add a backend
  (`env_logger`, `tracing`) only at the binary level.

### Ceiling comments (Rust style)

```rust
// snip: HashMap; upgrade to DashMap if concurrent access needed
// snip: sort; upgrade to pdqsort or rayon par_sort if benchmarks show gap
// snip: env::var config; upgrade to config crate if layered file config needed
```
