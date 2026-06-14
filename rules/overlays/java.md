## Language idioms: Java

Apply these when working in Java (17+). They are rungs within the base ladder —
not exceptions to it. Modern Java (records, sealed classes, text blocks, streams)
eliminates many patterns that used to require boilerplate.

### Prefer over verbose equivalents

- `record` over a POJO class with `equals`, `hashCode`, `toString`, and getters
  for immutable data carriers. One line replaces 40+.
- Sealed classes + pattern matching (`switch (shape) { case Circle c -> ... }`)
  over a `Visitor` pattern or `instanceof` chain for closed type hierarchies.
- `var` for local variable type inference when the type is obvious from the RHS.
- `List.of`, `Map.of`, `Set.of` for small immutable collections — no
  `new ArrayList<>()` + multiple `.add()` calls.
- Text blocks (`"""..."""`) over string concatenation or `StringBuilder` for
  multi-line strings (SQL, JSON templates, HTML snippets).
- Stream pipelines (`stream().filter().map().toList()`) over explicit `for` loops
  with accumulator lists — when the pipeline is one expression.
- `Optional.map` / `Optional.orElseGet` over null-check chains for optional values
  returned from methods. Do not use `Optional` as a field type.
- `instanceof` pattern matching (`if (obj instanceof String s)`) over
  `instanceof` + explicit cast.
- `CompletableFuture.supplyAsync` / `.thenApply` over raw `Thread` or `Runnable`
  for simple async tasks. Use a virtual thread (`Thread.ofVirtual().start()`) for
  I/O-bound work on Java 21+.

### stdlib / platform covers this — no dependency needed

- UUID: `java.util.UUID.randomUUID()`.
- Base64: `java.util.Base64.getEncoder().encodeToString(bytes)`.
- HMAC: `javax.crypto.Mac` with `HmacSHA256` — no library. Tag `// snip:prod` on
  the verification call; use `MessageDigest.isEqual` for constant-time comparison.
- Simple HTTP client (Java 11+): `java.net.http.HttpClient` — no OkHttp/Unirest
  for straightforward request-response calls without connection pooling.
- JSON (if Jackson is already on classpath): `objectMapper.writeValueAsString(obj)`.
- Date/time arithmetic: `java.time.*` (LocalDate, Duration, Instant) — no Joda-Time.

### Ceiling comments (Java style)

```java
// snip: record; upgrade to class if mutable state or inheritance needed
// snip: HttpClient; upgrade to OkHttp if connection pool tuning or interceptors needed
// snip: Optional.map chain; upgrade to explicit null check if readability suffers
```
