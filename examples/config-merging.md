# Layered Config Loading

**Task:** "Build a config system that layers environment variables over a JSON config file over compiled-in defaults."

## Without Snip

```python
from abc import ABC, abstractmethod
from typing import Any

class ConfigSource(ABC):
    @abstractmethod
    def load(self) -> dict[str, Any]:
        pass

class DefaultsConfigSource(ConfigSource):
    def __init__(self, defaults: dict):
        self._defaults = defaults

    def load(self) -> dict:
        return dict(self._defaults)

class FileConfigSource(ConfigSource):
    def __init__(self, path: str):
        self._path = path

    def load(self) -> dict:
        import json, os
        if not os.path.exists(self._path):
            return {}
        with open(self._path) as f:
            return json.load(f)

class EnvConfigSource(ConfigSource):
    def __init__(self, prefix: str):
        self._prefix = prefix.upper()

    def load(self) -> dict:
        import os
        return {
            k[len(self._prefix):].lower(): v
            for k, v in os.environ.items()
            if k.startswith(self._prefix)
        }

class ConfigManager:
    def __init__(self, sources: list[ConfigSource]):
        self._sources = sources
        self._config: dict = {}

    def load(self) -> None:
        for source in self._sources:
            self._config.update(source.load())

    def get(self, key: str, default: Any = None) -> Any:
        return self._config.get(key, default)

    def merge(self, extra: dict) -> None:
        self._config.update(extra)

# Usage
manager = ConfigManager([
    DefaultsConfigSource({'port': 8080, 'debug': False}),
    FileConfigSource('config.json'),
    EnvConfigSource('APP_'),
])
manager.load()
port = manager.get('port')
```

An abstract base class, four concrete classes, dependency injection, and a `load()`/`get()` API — for three dict merges.

## With Snip

```python
# snip: dict merge covers this; upgrade to pydantic BaseSettings if runtime
# validation or nested schemas are needed
import json, os

defaults = {'port': 8080, 'debug': False}

file_cfg = {}
if os.path.exists('config.json'):
    with open('config.json') as f:
        file_cfg = json.load(f)

env_cfg = {
    k.removeprefix('APP_').lower(): v
    for k, v in os.environ.items()
    if k.startswith('APP_')
}

config = {**defaults, **file_cfg, **env_cfg}
port = config['port']
```

**~70 lines across 6 entities → 10 lines.** The `ConfigManager` API (`load()`, `get()`, `merge()`) added no value over a plain dict. The upgrade path is clear: when you need field types, nested schemas, or validation on startup, `pydantic`'s `BaseSettings` is exactly this pattern with those features added.
