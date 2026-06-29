# Jester data prep

The 20BN-Jester dataset ships as **per-clip folders of JPEG frames**, but the toolkit
trains on **`.mp4`** files. This folder holds the one-step converter; once the mp4s exist,
Jester trains through the normal app (it's integrated into the `lac` core).

## 1. Download

Get 20BN-Jester (V1) and extract it under `datasets/jester/` so you have:

```
datasets/jester/
├── Train.csv          # video_id, label, ...
└── Train/
    └── <video_id>/*.jpg
```

Sources: [Qualcomm](https://www.qualcomm.com/developer/software/jester-dataset) (official) ·
[Kaggle: toxicmender/20bn-jester](https://www.kaggle.com/datasets/toxicmender/20bn-jester) (mirror).

## 2. Preprocess (frames → mp4)

```bash
conda activate lac
cd jester
python preprocess_frames.py
```

This filters to one gesture and encodes each clip's JPEG frames into an mp4 under
`datasets/jester/videos/`. Defaults (edit at the bottom of `preprocess_frames.py`):

| Setting | Default |
| --- | --- |
| `label_to_filter` | `"Thumb Up"` |
| `max_videos` | `100` |
| output | `datasets/jester/videos/*.mp4` |

Use videos of the **same** gesture so the alignment model has a consistent activity to learn.

## 3. Train (in the web app)

Jester is wired into the `lac` pipeline, so train it like any other dataset:

1. Restart the backend if it was running (`python server.py`) so it picks up the config.
2. In the app: **Training** → select dataset **`jester`** → choose config **`jester/lac.json`** → **Train**.

CLI equivalent:

```bash
cd lac
python train.py --config='config/jester/lac.json'
```

> The Jester clips are low-res (176×100, ~37 frames); the loader upscales to 224×224.
> `jester/lac.json` uses `eval: false` (Jester has no labeled val split).
