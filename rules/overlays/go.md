## Language idioms: Go

Apply these when working in Go. They are rungs within the base ladder —
not exceptions to it. Go's stdlib is unusually complete; reach for it first.

### Prefer over verbose equivalents

- `errors.New("msg")` over a custom error struct unless the caller inspects
  fields on the error value at runtime via `errors.As`.
- `fmt.Errorf("context: %w", err)` for wrapping — no custom wrapper types
  until a second distinct error kind is needed by callers.
- Table-driven tests: `[]struct{ name string; input X; want Y }` over
  individual `TestFooBar` functions for the same function under multiple
  inputs. One `t.Run(tc.name, ...)` loop.
- `sync.Once` over a manually guarded boolean for lazy initialization.
- `strings.Builder` over repeated string `+` concatenation inside a loop.
- `io.Reader` / `io.Writer` interfaces at function boundaries rather than
  `*os.File` or `*bytes.Buffer` — lets callers supply any backing store
  without code changes.
- `context.WithTimeout` (or `WithDeadline`) at every I/O call site — no
  goroutine should block indefinitely on external I/O.
- Struct embedding over a delegation field for IS-A relationships where
  the embedded type's full interface is intended to be promoted.
- `slices.Sort` / `slices.SortFunc` (Go 1.21+) over `sort.Slice` with
  a closure for simple sorts.
- `maps.Keys` / `maps.Values` (Go 1.21+) over manual range-append loops.

### stdlib covers this — no package needed

- Config (5 keys or fewer): `os.Getenv` + a single validation pass at
  startup. Add `viper` only when layered config files, watches, or remote
  sources are genuinely needed.
- JSON: `encoding/json` — no `jsoniter` or `easyjson` unless a profiler
  identifies JSON as the bottleneck.
- HTTP client: `net/http` stdlib client with a timeout — no `resty` or
  `go-resty` for straightforward calls.
- UUID: `crypto/rand` + `encoding/hex` for a random token, or
  `github.com/google/uuid` only when RFC 4122 conformance is required.
- HMAC: `crypto/hmac` + `crypto/sha256` + `hmac.Equal` — constant-time
  comparison built in. (`// snip:prod` these lines.)

### Ceiling comments (Go style)

```go
// snip: errors.New; upgrade to typed struct if callers need errors.As fields
// snip: os.Getenv; upgrade to viper if layered config or env-file support needed
// snip: net/http; upgrade to resty if retry/middleware chain needed
```
