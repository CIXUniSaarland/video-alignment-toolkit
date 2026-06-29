# Anomaly Detection

Compare a video against a **correct reference** and automatically flag the frames that
**deviate** — useful for spotting mistakes or missed steps in a procedure.

> You need a model trained in the **Training** tab first.

---

## Step 1 — Select Model & Dataset

1. Pick the **dataset** with your videos.
2. Set the **working directory** (default `../train-results`) and click **Load models**.
3. Choose a trained run.

![Step 1 — select model & dataset](/instructions/a-anomaly-1.png)

---

## Step 2 — Reference & Query Videos

Pick a **reference video** (a correct execution) and the **query video** to check.
Both preview in their players. Then click **Detect Anomaly**.

![Step 2 — reference and query videos](/instructions/a-anomaly-2.png)

---

## Step 3 — Anomaly Result

The plot shows the **distance** between the two videos at each aligned frame. The red
dashed line is the **threshold**; points above it (in red) are flagged as **anomalies**.
**Hover** over the plot to preview the reference and query frames at that moment — so you
can see exactly what deviated.

![Step 3 — anomaly result](/instructions/a-anomaly-3.png)
