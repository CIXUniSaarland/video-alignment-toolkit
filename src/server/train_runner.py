"""Runs training in a separate process so it can be terminated cleanly
(which also frees all GPU memory). Progress is forwarded to the parent via a queue."""
import os
import sys

os.environ.setdefault("KMP_DUPLICATE_LIB_OK", "TRUE")
# Reduce CUDA fragmentation (reserved-but-unallocated memory) across train/stop cycles.
os.environ.setdefault("PYTORCH_CUDA_ALLOC_CONF", "expandable_segments:True")

_SERVER_DIR = os.path.dirname(os.path.abspath(__file__))
_REPO_ROOT = os.path.abspath(os.path.join(_SERVER_DIR, "..", ".."))
_LAC_CORE = os.path.join(_REPO_ROOT, "lac")
for _p in (_LAC_CORE, _SERVER_DIR):
    if _p not in sys.path:
        sys.path.insert(0, _p)
os.chdir(_LAC_CORE)

from train_toolkit import train_model, load_config_file


class _QueueEmitter:
    """socketio stand-in: forwards .emit(event, data) to a multiprocessing queue."""
    def __init__(self, q):
        self.q = q

    def emit(self, event, data):
        self.q.put((event, data))


def run_training(config_path, q):
    emitter = _QueueEmitter(q)
    try:
        cfg = load_config_file(config_path)
        train_model(cfg, emitter)
        q.put(("training_progress", {"data": "Training completed successfully."}))
    except Exception as e:
        q.put(("training_progress", {"data": f"ERROR: training failed: {e}", "error": True}))
    finally:
        q.put(("__done__", None))
