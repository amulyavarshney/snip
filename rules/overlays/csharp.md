## Language idioms: C#

Apply these when working in C# (.NET 6+). They are rungs within the base ladder —
not exceptions to it. Modern C# (records, pattern matching, LINQ, primary constructors)
removes most of the boilerplate that made C# verbose.

### Prefer over verbose equivalents

- `record` / `record struct` over a class with manual `Equals`, `GetHashCode`,
  `ToString`, and properties for immutable data carriers.
- Primary constructors (`class Foo(int x, string y)`) over explicit constructor
  + field declarations for simple dependency injection.
- `switch` expressions over `switch` statements when every arm returns a value.
  Exhaustiveness is checked at compile time.
- Pattern matching (`is { Property: value }`, `is Type t`) over `as` + null check.
- Collection expressions (`[1, 2, 3]`, `[..a, ..b]`) over `new List<T> { ... }` or
  `Enumerable.Concat` for small, static collections (C# 12+).
- LINQ one-liners (`.Where().Select().ToList()`) over `foreach` + accumulator for
  transformations — when the pipeline fits on one line.
- `string.Create` or interpolated strings over `StringBuilder` for strings built
  once. Use `StringBuilder` only inside tight loops with many appends.
- `IReadOnlyList<T>` / `IReadOnlyDictionary<K,V>` at return types to express
  immutability intent without a wrapper class.
- `ValueTask<T>` over `Task<T>` for hot-path async methods that frequently
  complete synchronously (avoids heap allocation per call).
- `using` declarations (`using var stream = ...`) over explicit `try/finally`
  dispose blocks.

### stdlib / BCL covers this — no NuGet package needed

- UUID: `Guid.NewGuid().ToString()`.
- Base64: `Convert.ToBase64String(bytes)` / `Convert.FromBase64String(s)`.
- HMAC: `System.Security.Cryptography.HMACSHA256` — no package. Use
  `CryptographicOperations.FixedTimeEquals` for constant-time comparison.
  Tag `// snip:prod` on the verification block.
- JSON: `System.Text.Json.JsonSerializer` (built-in, .NET 5+) — no Newtonsoft.Json
  unless the project already depends on it or advanced serialisation is needed.
- Simple HTTP: `HttpClient` (reuse a singleton or inject via DI) — no RestSharp
  for straightforward GET/POST without complex retry policies.
- Config (5 keys or fewer): `IConfiguration` bound via `GetValue<T>` — no custom
  config class hierarchy unless you need nested sections or validation.

### Ceiling comments (C# style)

```csharp
// snip: record; upgrade to class if mutable state, inheritance, or custom Equals needed
// snip: System.Text.Json; upgrade to Newtonsoft if custom converters or dynamic JSON needed
// snip: HttpClient; upgrade to Refit or RestSharp if typed client generation needed
```
