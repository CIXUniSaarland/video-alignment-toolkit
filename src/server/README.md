# VideoAlign — API Server (Backend)

Flask + Socket.IO backend for the VideoAlign toolkit. Serves the [web app](../gui) with dataset/
video listing, training (live progress over Socket.IO), and the Analysis endpoints (align, frame
retrieval, anomaly). It wraps the [`lac`](../../lac) research core.

## Run

```bash
conda env create -f env.yml      # first time only
conda activate lac
pip install -r requirements.txt  # first time only
python server.py                 # API on http://localhost:5001
```

On startup the server `chdir`s into the `lac/` submodule, so relative paths resolve from there:
datasets at `../datasets/<name>/videos/*.mp4`, trained models at `../train-results/<run>/`.

> The Flask reloader is **off** (`use_reloader=False`) so training subprocesses aren't duplicated.
> Restart `python server.py` manually after editing server / `serverapi` / `lac` code.

## Structure

```
server.py          # Flask app, Socket.IO, all HTTP routes (port 5001)
train_runner.py    # runs training in a spawned subprocess (frees the GPU on stop)
train_toolkit.py   # config loading + GUI field coercion helpers
serverapi/
├── align.py       # align two videos -> distance matrix + DTW path
├── frame_retr.py  # retrieve matching frames across reference videos
├── anomaly_det.py # per-frame distance vs. a reference, threshold flagging
└── util.py
env.yml            # conda environment (python, ffmpeg, av, cuda toolchain)
requirements.txt   # pip dependencies
```

## Key endpoints

| Route | Purpose |
| --- | --- |
| `GET /list_datasets`, `POST /list_videos` | browse datasets in `../datasets/` |
| `POST /list_folders` | list trained models in a working dir (folders with `config.json`) |
| `POST /save_config`, `POST /train`, `GET /stop_training` | training (progress via Socket.IO `training_progress`) |
| `POST /align_videos`, `POST /frame_retrieval`, `POST /detect_anomaly` | Analysis tools |
| `POST /get_video`, `POST /get_frame` | stream a video / a single decoded frame |

## Notes

- Training runs in a `spawn` subprocess so a stop request can `terminate()` it and free GPU memory.
- Models load the **highest-epoch** `*.pth` checkpoint from a run's `models/` folder.
- Decoded-frame and duration caches keep the Analysis UI responsive.

## Requirements

Conda, Python 3.10, and (recommended) a CUDA GPU for training.
