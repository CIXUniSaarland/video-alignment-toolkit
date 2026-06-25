# Training a Model

Training teaches an **encoder** to understand your activity by aligning videos of the
same task. Once trained, that encoder powers all the Analysis tools (Align, Frame
Retrieval, Anomaly Detection). No labels are needed — just videos of the same activity.

---

## Step 1 — Select a Dataset

There are **two ways** to provide a dataset:

1. **Select an existing dataset** — anything already in the server's `datasets/` folder
   appears in the dropdown.
2. **Upload a new dataset** — zip your videos inside a single folder and upload it.

The video files in the chosen dataset are listed on the right. For good results, use
**at least 25 videos** of the same process; the toolkit warns you if there are fewer.

> **Jester (hand gestures)** is supported as a built-in dataset, but it downloads as folders
> of JPEG frames, not mp4s. Convert it once with the helper in the repo's `jester/` folder, then
> select the `jester` dataset here and the `jester/lac.json` configuration in Step 2.

![Step 1 — select a dataset](/instructions/train-1.png)

---

## Step 2 — Configuration

Pick a configuration (defaults to **LAC**, the best-performing method) and adjust the
training settings to your hardware:

- **Epochs** — how long to train.
- **Batch size / number of frames** — lower these if you run out of GPU memory.

Sensible defaults from the papers are pre-filled, so you can usually leave them as-is.

![Step 2 — configuration](/instructions/train-2.png)

---

## Step 3 — Summary & Training

Review the summary, then click **Train**. You'll see:

- a **progress bar** with estimated time remaining,
- a **live loss plot** updating per batch,
- the **training logs**.

You can **Stop Training** at any time. Checkpoints are saved to
`train-results/<dataset>-<date>/models/` — that folder is what you select as the
**model** in the Analysis tools.

![Step 3 — training progress](/instructions/train-3-progress.png)

When training finishes, the run is complete and ready to use in Analysis.

![Step 3 — training finished](/instructions/train-3-finish.png)
