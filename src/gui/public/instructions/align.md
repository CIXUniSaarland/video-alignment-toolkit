# Align Videos

Align two videos **frame-by-frame** using a trained encoder, and inspect the alignment as
an interactive distance matrix. Useful for comparing how two executions of the same task
line up over time.

> You need a model trained in the **Training** tab first.

---

## Step 1 — Select Model & Dataset

1. Pick the **dataset** that contains the videos you want to align.
2. Set the **working directory** where your trained models live (default `../train-results`).
3. Click **Load models** and choose a trained run.

The dataset's videos are listed on the right.

![Step 1 — select model & dataset](/instructions/a-align-1.png)

---

## Step 2 — Choose the Two Videos

Pick a **reference video** and a **query video**. Each previews in its own player
(click a video to play/pause). When both are chosen, click **Align Videos**.

![Step 2 — reference and query videos](/instructions/a-align-2.png)

---

## Step 3 — Alignment Result

The result shows a **distance matrix** between every pair of frames, with the optimal
**alignment path** drawn in orange. **Hover** (or drag) over the matrix to preview the
matched **reference** and **query** frames at that point.

![Step 3 — alignment result](/instructions/a-align-3.png)
