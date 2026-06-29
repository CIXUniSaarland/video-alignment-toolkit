# VideoAlign

VideoAlign makes self-supervised **video-alignment** models usable without machine-learning
expertise. You train an encoder by aligning videos of the same activity, then use that
encoder to analyze new videos — no manual labels required.

---

## The workflow

1. **Train** an encoder on a set of videos of the same activity (Training tab).
2. **Analyze** new videos with the trained encoder (Analysis tab):
   - **Align Videos** — line up two videos frame-by-frame.
   - **Frame Retrieval** — find the frames that match specific moments of a video.
   - **Anomaly Detection** — flag frames that deviate from a correct reference.

Pick a topic from the menu on the left to see a step-by-step walkthrough.

---

## Before you start

- You need at least one **trained model** before using any Analysis tool — start with
  **Training**.
- Datasets are folders of videos of the **same activity** (e.g. pouring). For good results,
  use **25 or more** videos.

---

## File layout

**Datasets** live under `datasets/<name>/`. Every clip must be an **`.mp4`** file inside a
**`videos/`** subfolder — the toolkit only looks there, and only `.mp4` is supported:

```
datasets/
└── pouring/
    └── videos/
        ├── clip01.mp4
        └── clip02.mp4
```

**Models** live under `train-results/<run-name>/` (the Analysis **working directory**, default
`../train-results`). A folder only appears as a loadable model if it has a **`config.json`**, plus
a **`models/`** folder of checkpoints:

```
train-results/
└── pouring-24-06-2026/
    ├── config.json
    └── models/
        └── LAC-ckpt_epoch_9.pth
```

Checkpoints are **`.pth`** files named `<TYPE>-ckpt_epoch_<N>.pth`, where `<TYPE>` matches the
`type` in `config.json` (e.g. `LAC`, `SCL`, `TCC`). The toolkit loads the highest-epoch checkpoint;
`embeddings/` and `output/` folders are created automatically. To use your own model, drop a folder
with this layout into `train-results/`.
