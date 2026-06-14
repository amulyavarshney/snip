## Language idioms: Python

Apply these when working in Python. They are rungs within the base ladder —
not exceptions to it. Each one replaces a longer pattern with a shorter,
stdlib-native one.

### Prefer over verbose equivalents

- List/dict/set comprehensions over explicit `.append()` loops.
- `@dataclass` over a manual `__init__` + `__repr__` + `__eq__` triple.
  Use `@dataclass(frozen=True)` over a manual `__hash__` pair.
- `NamedTuple` only when the tuple-protocol matters (unpacking, positional
  indexing, or `isinstance` against tuple).
- `pathlib.Path` over `os.path` string joins. `Path.read_text()` /
  `Path.write_text()` over open-read-close blocks.
- `contextlib.suppress(ExcType)` over `try: ... except ExcType: pass`.
- f-strings over `.format()` or `%` for static format strings.
- `collections.defaultdict` / `Counter` over manual `.setdefault()` or
  `if key not in d: d[key] = 0; d[key] += 1` patterns.
- `functools.lru_cache` / `functools.cache` before any hand-rolled
  memoization dict.
- `itertools.chain`, `itertools.islice`, `itertools.groupby` over manual
  loop equivalents when the intent is clearer from the name.

### stdlib covers this — no package needed

- UUID generation: `uuid.uuid4()` or `uuid.uuid4().hex`.
- Config parsing (TOML): `tomllib` (3.11+) or `tomli` (backport). For INI:
  `configparser`. For simple env-only config: `os.environ`.
- HTTP for a single fetch: `urllib.request.urlopen` — no `requests` unless
  session handling, streaming, or auth complexity demands it.
- Date arithmetic: `datetime.timedelta` — no `arrow` or `pendulum` for
  basic offset math.
- Base64 encoding: `base64.b64encode` / `b64decode`.
- HMAC verification: `hmac.compare_digest` — constant-time, no library.
- Temporary files: `tempfile.NamedTemporaryFile` / `tempfile.mkdtemp`.

### Ceiling comments (Python style)

```python
# snip: Counter replaces manual dict; upgrade to sorted heap if top-N needed
# snip: lru_cache covers this; upgrade to redis if cross-process caching needed
# snip: urllib covers this; upgrade to requests if session/retry/auth needed
```
