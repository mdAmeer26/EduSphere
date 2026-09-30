import json
import os
from typing import Any, List

BACKEND_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
LOCAL_STORAGE_ROOT = os.path.join(BACKEND_ROOT, "uploads")
STORAGE_ROOT = os.getenv(
    "EDUSPHERE_STORAGE_DIR",
    "/tmp/edusphere" if os.getenv("VERCEL") else LOCAL_STORAGE_ROOT,
)

os.makedirs(STORAGE_ROOT, exist_ok=True)


def ensure_dir(path: str) -> None:
    os.makedirs(path, exist_ok=True)


def load_list(path: str) -> List[Any]:
    if not os.path.exists(path):
        return []
    try:
        with open(path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception:
        return []


def save_list(path: str, data: List[Any]) -> None:
    ensure_dir(os.path.dirname(path))
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
