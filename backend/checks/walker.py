"""Walk a payload alongside a JSON schema, yielding (value, sub_schema, path)."""
from typing import Any, Iterator


def walk_with_schema(payload: Any, schema: dict, path: str = "$") -> Iterator[tuple]:
    yield payload, schema, path
    if isinstance(payload, dict):
        props = (schema or {}).get("properties", {})
        for k, v in payload.items():
            sub = props.get(k, {})
            yield from walk_with_schema(v, sub, f"{path}.{k}")
    elif isinstance(payload, list):
        item_schema = (schema or {}).get("items", {})
        for i, v in enumerate(payload):
            yield from walk_with_schema(v, item_schema, f"{path}[{i}]")